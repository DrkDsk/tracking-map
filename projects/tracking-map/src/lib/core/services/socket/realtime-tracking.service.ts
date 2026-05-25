import { inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  EMPTY,
  asyncScheduler,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  switchMap,
  throttleTime,
} from 'rxjs';
import { ClientType } from '../../enums/provider_type';
import { TrackingPosition } from '../../models/tracking_position';
import { WebsocketConfig } from '../../models/websocket_config';
import { RealtimeTrackingRepository } from '../../repositories/realtime_tracking.repository';
import { TrackingSocketService } from './tracking-socket.service';

interface TrackingContext {
  provider: ClientType;
  unitId: string | number;
}

@Injectable({
  providedIn: 'root',
})
export class RealtimeTrackingService {
  private trackingRepository = inject(RealtimeTrackingRepository);
  private trackingSocketService = inject(TrackingSocketService);

  private readonly trackingContextSubject = new BehaviorSubject<TrackingContext | null>(null);

  readonly connectionState$ = this.trackingSocketService.connectionState$;

  readonly positions$ = this.trackingContextSubject.pipe(
    switchMap((context) => {
      if (!context) {
        return EMPTY;
      }

      const config = this.getConfig(context.provider, context.unitId);

      return this.trackingSocketService.stream(config).pipe(
        map(({ payload }) => {
          return this.trackingRepository.parsePosition(context.provider, payload, context.unitId);
          },
        ),
        filter((position): position is TrackingPosition => position !== null),
        filter((position) =>
          this.trackingRepository.shouldHandle(context.provider, position, context.unitId),
        ),
        distinctUntilChanged(
          (previous, current) =>
            previous.coordinates.lat === current.coordinates.lat &&
            previous.coordinates.lng === current.coordinates.lng &&
            String(previous.unitId) === String(current.unitId),
        ),
        throttleTime(config.throttle.positionIntervalMs, asyncScheduler, {
          leading: true,
          trailing: true,
        }),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  connect(provider: ClientType, unitId: string | number): void {
    this.trackingContextSubject.next({
      provider,
      unitId,
    });
  }

  disconnect(): void {
    this.trackingContextSubject.next(null);
    this.trackingSocketService.disconnect();
  }

  track(provider: ClientType, unitId: string | number) {
    this.connect(provider, unitId);
    return this.positions$;
  }

  getConfig(provider: ClientType, unitId: string | number): WebsocketConfig {
    return this.trackingRepository.getConfig(provider, unitId);
  }
}
