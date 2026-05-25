import {
  Component,
  DestroyRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { LngLatLike, Map } from 'maplibre-gl';
import { RoutingService } from '../../core/services/maps/routing_service';
import { MapRenderService } from '../../core/services/maps/map-render.service';
import { ClientType } from '../../core/enums/provider_type';
import { TrackingRepository } from '../../core/repositories/tracking_repository';
import { forkJoin, Subscription, map, Observable, switchMap } from 'rxjs';
import { TrackingRoute } from '../../core/models/tracking_route';
import { ColorUtils } from '../../core/utils/color_utils';
import { RealtimeTrackingService } from '../../core/services/socket/realtime-tracking.service';
import { UnitStateService } from '../../core/services/socket/unit-state.service';
import { MarkerAnimationService } from '../../core/services/socket/marker-animation.service';
import { TrackingSocketService } from '../../core/services/socket/tracking-socket.service';
import { ReverbSocketClient } from '../../core/services/socket/reverb-socket.client';

@Component({
  selector: 'live-map-component',
  standalone: true,
  imports: [MapComponent],
  templateUrl: './live-map-component.html',
  styleUrl: './live-map-component.css',
  providers: [
    MapRenderService,
    RealtimeTrackingService,
    UnitStateService,
    TrackingSocketService,
    ReverbSocketClient,
  ],
})
export class LiveMapComponent implements OnChanges, OnDestroy {
  private routingService = inject(RoutingService);
  private mapRenderService = inject(MapRenderService);
  private trackingRepository = inject(TrackingRepository);
  private colorUtils = inject(ColorUtils);
  private realtimeTrackingService = inject(RealtimeTrackingService);
  private unitStateService = inject(UnitStateService);
  private markerAnimationService = inject(MarkerAnimationService);
  private destroyRef = inject(DestroyRef);

  private historySubscription?: Subscription;
  private realtimeSubscription?: Subscription;
  private unitsSubscription?: Subscription;
  private mapLoaded = false;
  private hasFocusedLiveUnit = false;

  @Input()
  mapStyle = 'https://api.maptiler.com/maps/hybrid-v4/style.json?key=NOlJEA2Zes5006iTaZav';

  @Input()
  zoom: [number] = [1];

  @Input()
  provider: ClientType = ClientType.servidiesel;

  @Input()
  mexicoBounds: [LngLatLike, LngLatLike] = [
    [-130, 5],
    [-75, 40],
  ];

  @Input()
  unitId: number = 0;

  @Input()
  enableRealtime = true;

  @Input()
  followLiveUnit = true;

  @Input()
  liveZoom = 14;

  center: [number, number] = [-102.5528, 23.6345];

  constructor() {
    this.unitsSubscription = this.unitStateService.positions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((positions) => {
        this.mapRenderService.renderUnits(positions);

        const trackedUnit = positions.find(
          (position) => String(position.unit_id) === String(this.unitId),
        );

        if (trackedUnit && this.followLiveUnit && !this.hasFocusedLiveUnit) {
          this.mapRenderService.focusUnit(trackedUnit, this.liveZoom);
          this.hasFocusedLiveUnit = true;
        }
      });
  }

  onMapLoad(map: Map) {
    this.mapLoaded = true;
    this.mapRenderService.initialize(map);
    this.reloadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.mapLoaded) {
      return;
    }

    if (
      changes['provider'] ||
      changes['unitId'] ||
      changes['enableRealtime'] ||
      changes['followLiveUnit']
    ) {
      this.reloadData();
    }
  }

  ngOnDestroy(): void {
    this.stopRealtimeTracking();
    this.historySubscription?.unsubscribe();
    this.unitsSubscription?.unsubscribe();
    this.unitStateService.clear();
  }

  private reloadData(): void {
    this.hasFocusedLiveUnit = false;
    this.historySubscription?.unsubscribe();
    this.stopRealtimeTracking();
    this.unitStateService.clear();
    this.mapRenderService.clearUnits();
    this.loadTrackingRoutes();

    if (this.enableRealtime) {
      this.startRealtimeTracking();
    }
  }

  private loadTrackingRoutes(): void {
    this.historySubscription = this.trackingRepository
      .getWayPoints(this.provider, this.unitId)
      .pipe(
        switchMap((trackingData): Observable<TrackingRoute[]> => {
          const data = trackingData.data;
          const outbound_orders = data.outbound_orders;

          return forkJoin(
            outbound_orders.map((route, index) => {
              const routeId = route.id_seguimiento;
              const coordinates = route.waypoints.map(
                (waypoint) => [waypoint.lng, waypoint.lat] as [number, number],
              );
              const origin = coordinates.at(0) ?? [0, 0];
              const destiny = coordinates.at(1) ?? [0, 0];

              const pointA: [number, number] = [origin[0], origin[1]];
              const pointB: [number, number] = [destiny[0], destiny[1]];

              return this.routingService.getRoute(pointA, pointB).pipe(
                map((response) => {
                  const trackingRoute: TrackingRoute = {
                    id: `${routeId}`,
                    color: this.colorUtils.getRandomColor(index),
                    coordinates: response.routes[0].geometry.coordinates,
                  };
                  return trackingRoute;
                }),
              );
            }),
          );
        }),
      )
      .subscribe((response) => {
        this.mapRenderService.render(response);
      });
  }

  private startRealtimeTracking(): void {
    const config = this.realtimeTrackingService.getConfig(this.provider, this.unitId);
    const positions$ = this.realtimeTrackingService.track(this.provider, this.unitId);

    this.realtimeSubscription = this.markerAnimationService
      .animate(positions$, config.throttle.animationDurationMs, config.throttle.animationFrameMs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((position) => {
        this.unitStateService.upsert(position);
      });
  }

  private stopRealtimeTracking(): void {
    this.realtimeSubscription?.unsubscribe();
    this.realtimeSubscription = undefined;
    this.realtimeTrackingService.disconnect();
  }
}
