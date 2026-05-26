import { computed, inject, Injectable, Injector, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
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
import {
  normalizeTrackingUnitInput,
  TrackingUnitInput,
  TrackingUnitReference,
} from '../../models/tracking_unit_reference';
import { WebsocketConfig } from '../../models/websocket_config';
import { RealtimeTrackingRepository } from '../../repositories/realtime_tracking.repository';
import { TrackingSocketService } from './tracking-socket.service';

interface ActiveRealtimeSubscription {
  key: string;
  provider: ClientType;
  unit: TrackingUnitReference;
  config: WebsocketConfig;
  subscription: Subscription;
  refCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class RealtimeTrackingService {
  private readonly injector = inject(Injector);
  private readonly trackingRepository = inject(RealtimeTrackingRepository);
  private readonly trackingSocketService = inject(TrackingSocketService);

  private readonly activeSubscriptionsState = signal<Map<string, ActiveRealtimeSubscription>>(
    new Map(),
  );
  private readonly positionsSubject = new Subject<TrackingPosition>();

  readonly connectionState$ = this.trackingSocketService.connectionState$;
  readonly activeSubscriptions = computed(() =>
    Array.from(this.activeSubscriptionsState().values()),
  );
  readonly activeUnits = computed(() =>
    this.activeSubscriptions().map((subscription) => subscription.unit),
  );

  readonly activeSubscriptions$ = toObservable(this.activeSubscriptions, {
    injector: this.injector,
  });
  readonly activeUnits$ = toObservable(this.activeUnits, {
    injector: this.injector,
  });

  readonly positions$ = this.positionsSubject
    .asObservable()
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  track(provider: ClientType, unit: TrackingUnitInput): Observable<TrackingPosition> {
    return this.subscribeToUnit(provider, unit);
  }

  trackUnits(provider: ClientType, units: TrackingUnitInput[]): Observable<TrackingPosition> {
    const normalizedUnits = units.map((unit) => normalizeTrackingUnitInput(unit));

    normalizedUnits.forEach((unit) => {
      this.ensureUnitSubscription(provider, unit);
    });

    const unitKeys = new Set(normalizedUnits.map((unit) => this.buildKey(provider, unit.unitId)));

    return this.positions$.pipe(
      filter((position) => unitKeys.has(this.buildKey(provider, position.unit_id))),
    );
  }

  subscribeToUnit(provider: ClientType, unit: TrackingUnitInput): Observable<TrackingPosition> {
    const unitReference = normalizeTrackingUnitInput(unit);

    this.ensureUnitSubscription(provider, unitReference);

    return this.positions$.pipe(
      filter((position) => this.matches(provider, unitReference.unitId, position)),
    );
  }

  unsubscribeFromUnit(provider: ClientType, unit: TrackingUnitInput): void {
    const unitReference = normalizeTrackingUnitInput(unit);
    const key = this.buildKey(provider, unitReference.unitId);
    const activeSubscriptions = new Map(this.activeSubscriptionsState());
    const activeSubscription = activeSubscriptions.get(key);

    if (!activeSubscription) {
      return;
    }

    activeSubscription.refCount -= 1;

    if (activeSubscription.refCount > 0) {
      activeSubscriptions.set(key, activeSubscription);
      this.activeSubscriptionsState.set(activeSubscriptions);
      return;
    }

    activeSubscription.subscription.unsubscribe();
    activeSubscriptions.delete(key);
    this.activeSubscriptionsState.set(activeSubscriptions);
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

  private ensureUnitSubscription(provider: ClientType, unit: TrackingUnitReference): void {
    const key = this.buildKey(provider, unit.unitId);
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

  private matches(
    provider: ClientType,
    unitId: string | number,
    position: TrackingPosition,
  ): boolean {
    return position.provider === provider && String(position.unit_id) === String(unitId);
  }

  private buildKey(provider: ClientType, unitId: string | number): string {
    return `${provider}:${String(unitId)}`;
  }
}
