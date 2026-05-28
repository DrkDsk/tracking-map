import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Map as MapLibreMap } from 'maplibre-gl';
import type { LngLatLike, StyleSpecification } from 'maplibre-gl';
import { RoutingService } from '../../core/services/maps/routing_service';
import { MapRenderService } from '../../core/services/maps/map-render.service';
import { ClientType } from '../../core/types/provider_type';
import { TrackingRepository } from '../../core/repositories/tracking_repository';
import { forkJoin, Subscription, map, Observable, switchMap } from 'rxjs';
import { TrackingRoute } from '../../core/models/tracking_route';
import { ColorUtils } from '../../core/utils/color_utils';
import { RealtimeTrackingService } from '../../core/services/socket/realtime-tracking.service';
import { UnitStateService } from '../../core/services/socket/unit-state.service';
import { MarkerAnimationService } from '../../core/services/socket/marker-animation.service';
import { TrackingSocketService } from '../../core/services/socket/tracking-socket.service';
import { ReverbSocketClient } from '../../core/services/socket/reverb-socket.client';
import { createNeonMapStyle } from '../../core/utils/neon_map_style';
import hybridStyle from '../../../assets/map-styles/style.json';

const neonStyle: StyleSpecification = createNeonMapStyle(
  hybridStyle as unknown as StyleSpecification,
);

@Component({
  selector: 'live-map-component',
  standalone: true,
  imports: [],
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
export class LiveMapComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
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
  private map?: MapLibreMap;
  private mapLoaded = false;
  private hasFocusedLiveUnit = false;

  @ViewChild('mapContainer', { static: true })
  private mapContainer!: ElementRef<HTMLDivElement>;

  mapStyle = input(neonStyle);

  zoom = input<[number]>([1]);

  provider = input.required<ClientType>();

  mexicoBounds = input<[LngLatLike, LngLatLike]>([
    [-130, 5],
    [-75, 40],
  ]);

  unitId = input.required<string | number>();

  trackedUnitIds = input<Array<string | number>>([]);

  enableRealtime = input(true);

  followLiveUnit = input(true);

  liveZoom = input(14);

  center: [number, number] = [-102.5528, 23.6345];

  ngOnInit(): void {
    this.unitsSubscription = this.unitStateService.positions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((positions) => {
        this.mapRenderService.renderUnits(positions);

        const trackedUnit =
          positions.find((position) => String(position.unit_id) === String(this.unitId)) ??
          positions.at(0);

        if (trackedUnit && this.followLiveUnit() && !this.hasFocusedLiveUnit) {
          this.mapRenderService.focusUnit(trackedUnit, this.liveZoom());
          this.hasFocusedLiveUnit = true;
        }
      });
  }

  ngAfterViewInit(): void {
    const map = new MapLibreMap({
      container: this.mapContainer.nativeElement,
      style: this.mapStyle(),
      zoom: this.resolveZoom(),
      center: this.center,
      maxBounds: this.mexicoBounds(),
      attributionControl: false,
    });

    this.map = map;
    map.on('load', () => this.onMapLoad(map));
  }

  onMapLoad(map: MapLibreMap) {
    this.mapLoaded = true;
    this.mapRenderService.initialize(map);
    this.reloadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.mapLoaded) {
      return;
    }

    this.syncMapInputs(changes);

    if (
      changes['provider'] ||
      changes['unitId'] ||
      changes['trackedUnitIds'] ||
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
    this.map?.remove();
    this.map = undefined;
    this.mapLoaded = false;
  }

  private reloadData(): void {
    this.hasFocusedLiveUnit = false;
    this.historySubscription?.unsubscribe();
    this.stopRealtimeTracking();
    this.unitStateService.clear();
    this.mapRenderService.clearUnits();
    this.loadTrackingRoutes();

    if (this.enableRealtime()) {
      this.startRealtimeTracking();
    }
  }

  private loadTrackingRoutes(): void {
    this.historySubscription = this.trackingRepository
      .getWayPoints(this.provider(), this.unitId())
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
    const realtimeUnits = this.resolveRealtimeUnitIds();
    const config = this.realtimeTrackingService.getConfig(this.provider(), realtimeUnits[0]);
    const positions$ = this.realtimeTrackingService.trackUnits(this.provider(), realtimeUnits);

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

  private resolveRealtimeUnitIds(): Array<string | number> {
    const candidates = this.trackedUnitIds().length > 0 ? this.trackedUnitIds() : [this.unitId()];
    const uniqueCandidates = new Map<string, string | number>();

    candidates.forEach((candidate) => {
      uniqueCandidates.set(String(candidate), candidate);
    });

    return Array.from(uniqueCandidates.values());
  }

  private syncMapInputs(changes: SimpleChanges): void {
    if (!this.map) {
      return;
    }

    if (changes['mapStyle']) {
      this.map.setStyle(this.mapStyle());
    }

    if (changes['zoom']) {
      this.map.setZoom(this.resolveZoom());
    }

    if (changes['mexicoBounds']) {
      this.map.setMaxBounds(this.mexicoBounds());
    }
  }

  private resolveZoom(): number {
    return this.zoom()[0];
  }
}
