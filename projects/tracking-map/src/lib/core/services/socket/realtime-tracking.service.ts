import { inject, Injectable, signal } from '@angular/core';
import {
  Observable,
  Subject,
  Subscription,
  asyncScheduler,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  throttleTime,
} from 'rxjs';
import { ClientType } from '../../enums/provider_type';
import { TrackingPosition, TrackingPositionPayload } from '../../models/tracking_position';
import { TrackingUnitInput } from '../../models/tracking_unit_reference';
import { WebsocketConfig } from '../../models/websocket_config';
import { RealtimeTrackingRepository } from '../../repositories/realtime_tracking.repository';
import { TrackingSocketService } from './tracking-socket.service';

interface ActiveRealtimeSubscription {
  key: string;
  provider: ClientType;
  unit: TrackingUnitInput;
  config: WebsocketConfig;
  subscription: Subscription;
  refCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class RealtimeTrackingService {
  private readonly trackingRepository = inject(RealtimeTrackingRepository);
  private readonly trackingSocketService = inject(TrackingSocketService);

  private readonly activeSubscriptionsState = signal<Map<string, ActiveRealtimeSubscription>>(
    new Map(),
  );
  private readonly positionsSubject = new Subject<TrackingPosition>();

  readonly positions$ = this.positionsSubject
    .asObservable()
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  trackUnits(provider: ClientType, units: TrackingUnitInput[]): Observable<TrackingPosition> {
    units.forEach((unit) => {
      this.subscription(provider, unit);
    });

    const unitKeys = new Set(units.map((unit) => this.buildKey(provider, unit)));

    return this.positions$.pipe(
      filter((position) => unitKeys.has(this.buildKey(provider, position.unit_id))),
    );
  }

  disconnect(): void {
    const activeSubscriptions = this.activeSubscriptionsState();

    activeSubscriptions.forEach((activeSubscription) => {
      activeSubscription.subscription.unsubscribe();
    });

    this.activeSubscriptionsState.set(new Map());
    this.trackingSocketService.disconnect();
  }

  getConfig(provider: ClientType, unit: TrackingUnitInput): WebsocketConfig {
    return this.trackingRepository.getConfig(provider, unit);
  }

  private subscription(provider: ClientType, unit: TrackingUnitInput): void {
    const key = this.buildKey(provider, unit);
    const activeSubscriptions = new Map(this.activeSubscriptionsState());
    const existingSubscription = activeSubscriptions.get(key);

    if (existingSubscription) {
      existingSubscription.refCount += 1;
      activeSubscriptions.set(key, existingSubscription);
      this.activeSubscriptionsState.set(activeSubscriptions);
      return;
    }

    const config = this.getConfig(provider, unit);
    const subscription = this.trackingSocketService
      .stream<TrackingPositionPayload>(config)
      .pipe(
        map(({ payload }) => this.trackingRepository.parsePosition(provider, payload, unit)),
        filter((position): position is TrackingPosition => position !== null),
        filter((position) => this.trackingRepository.shouldHandle(provider, position, unit)),
        distinctUntilChanged((previous, current) => this.arePositionsEquivalent(previous, current)),
        throttleTime(config.throttle.positionIntervalMs, asyncScheduler, {
          leading: true,
          trailing: true,
        }),
      )
      .subscribe((position) => {
        this.positionsSubject.next(position);
      });

    activeSubscriptions.set(key, {
      key,
      provider,
      unit,
      config,
      subscription,
      refCount: 1,
    });

    this.activeSubscriptionsState.set(activeSubscriptions);
  }

  private arePositionsEquivalent(previous: TrackingPosition, current: TrackingPosition): boolean {
    return (
      previous.unit_id === current.unit_id &&
      previous.lat === current.lat &&
      previous.lng === current.lng &&
      previous.gps_time === current.gps_time &&
      previous.speed === current.speed &&
      previous.angle === current.angle &&
      previous.acc === current.acc
    );
  }

  private buildKey(provider: ClientType, unitId: string | number): string {
    return `${provider}:${String(unitId)}`;
  }
}
