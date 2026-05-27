import {
  Component,
  DestroyRef,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { LngLatLike, Map as MapLibreMap } from 'maplibre-gl';
import type { LightSpecification, SkySpecification, StyleSpecification } from 'maplibre-gl';
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
import hybridStyle from '../../../assets/map-styles/style.json';

type MapStyleLayer = StyleSpecification['layers'][number];
type RasterLayer = Extract<MapStyleLayer, { type: 'raster' }>;
type LineLayer = Extract<MapStyleLayer, { type: 'line' }>;
type SymbolLayer = Extract<MapStyleLayer, { type: 'symbol' }>;
type FillLayer = Extract<MapStyleLayer, { type: 'fill' }>;
type FillExtrusionLayer = Extract<MapStyleLayer, { type: 'fill-extrusion' }>;

const NEON_COLORS = {
  cyan: '#00ffff',
  electricBlue: '#00bfff',
  darkNavy: '#020617',
  graphite: '#111827',
  deepBlueWater: '#050b1a',
} as const;

const HYBRID_VECTOR_SOURCE = 'maptiler_planet';
const WATER_SOURCE_LAYER = 'water';
const BUILDING_SOURCE_LAYER = 'building';

const neonStyle: StyleSpecification = structuredClone(hybridStyle as unknown as StyleSpecification);

applyNeonHudTheme(neonStyle);

function applyNeonHudTheme(style: StyleSpecification): void {
  const baseName = style.name ?? 'Satellite Hybrid';

  style.name = `${baseName} Neon HUD`;
  style.metadata = {
    ...(style.metadata ?? {}),
    'tracking-map:theme': 'neon-hud',
    'tracking-map:derived-from': baseName,
  };
  style.light = createNeonLight();
  style.sky = createNeonSky();
  style.layers = style.layers.map((layer) => transformLayer(layer));

  insertLayerAfterLastRaster(style, createWaterOverlayLayer());
  insertLayerAfterLastRaster(style, createBuildingOverlayLayer());
}

function transformLayer(layer: MapStyleLayer): MapStyleLayer {
  if (isRasterLayer(layer)) {
    return applyRasterNightTone(layer);
  }

  if (isLineLayer(layer)) {
    if (isRoadLikeLayer(layer)) {
      return applyRoadHudStyle(layer);
    }

    if (isBoundaryLayer(layer)) {
      return applyBoundaryHudStyle(layer);
    }

    return applySecondaryLineHudStyle(layer);
  }

  if (isSymbolLayer(layer)) {
    return isWaterLabelLayer(layer) ? applyWaterLabelHudStyle(layer) : applyLabelHudStyle(layer);
  }

  return layer;
}

function createNeonLight(): LightSpecification {
  return {
    anchor: 'viewport',
    color: 'rgba(0, 255, 255, 0.55)',
    intensity: 0.2,
    position: [1.15, 210, 28],
  };
}

function createNeonSky(): SkySpecification {
  return {
    'sky-color': '#020617',
    'horizon-color': '#0b1120',
    'fog-color': 'rgba(0, 191, 255, 0.10)',
    'fog-ground-blend': 0.92,
    'horizon-fog-blend': 0.18,
  };
}

function applyRasterNightTone(layer: RasterLayer): RasterLayer {
  const paint = (layer.paint ??= {}) as NonNullable<RasterLayer['paint']>;

  paint['raster-opacity'] = 1;
  paint['raster-hue-rotate'] = 190;
  paint['raster-saturation'] = -0.72;
  paint['raster-contrast'] = 0.34;
  paint['raster-brightness-min'] = 0.03;
  paint['raster-brightness-max'] = 0.44;

  return layer;
}

function applyRoadHudStyle(layer: LineLayer): LineLayer {
  const paint = (layer.paint ??= {}) as NonNullable<LineLayer['paint']>;
  const tunnelLike = matchesLayer(layer, ['tunnel']);
  const pathLike = matchesLayer(layer, ['path', 'pathway', 'trail']);
  const railLike = matchesLayer(layer, ['rail', 'railway']);

  paint['line-color'] = pathLike
    ? NEON_COLORS.electricBlue
    : ([
        'match',
        ['get', 'class'],
        ['motorway', 'motorway_link', 'trunk', 'primary'],
        NEON_COLORS.cyan,
        ['secondary', 'tertiary'],
        NEON_COLORS.electricBlue,
        NEON_COLORS.cyan,
      ] as const);
  paint['line-width'] = pathLike
    ? (['interpolate', ['linear'], ['zoom'], 10, 0.35, 14, 0.8, 18, 1.8, 22, 3.4] as const)
    : railLike
      ? (['interpolate', ['linear'], ['zoom'], 8, 0.5, 12, 1.1, 16, 1.8, 20, 3.2] as const)
      : ([
          'interpolate',
          ['linear'],
          ['zoom'],
          5,
          ['match', ['get', 'class'], ['motorway', 'motorway_link', 'trunk'], 0.8, 0.3],
          8,
          ['match', ['get', 'class'], ['motorway', 'motorway_link', 'trunk', 'primary'], 1.8, 0.75],
          12,
          ['match', ['get', 'class'], ['motorway', 'motorway_link', 'trunk', 'primary'], 3.2, 1.6],
          16,
          ['match', ['get', 'class'], ['motorway', 'motorway_link', 'trunk'], 5.6, 2.4],
          20,
          ['match', ['get', 'class'], ['motorway', 'motorway_link', 'trunk'], 10, 4.4],
        ] as const);
  paint['line-opacity'] = pathLike
    ? (['interpolate', ['linear'], ['zoom'], 10, 0.25, 14, 0.5, 18, 0.72] as const)
    : tunnelLike
      ? (['interpolate', ['linear'], ['zoom'], 6, 0.22, 12, 0.48, 18, 0.72] as const)
      : railLike
        ? (['interpolate', ['linear'], ['zoom'], 8, 0.2, 12, 0.5, 18, 0.75] as const)
        : (['interpolate', ['linear'], ['zoom'], 5, 0.32, 8, 0.58, 12, 0.82, 18, 0.96] as const);
  paint['line-blur'] = pathLike
    ? (['interpolate', ['linear'], ['zoom'], 10, 0.1, 16, 0.35, 20, 0.6] as const)
    : tunnelLike
      ? (['interpolate', ['linear'], ['zoom'], 6, 0.2, 12, 0.65, 18, 1.2] as const)
      : (['interpolate', ['linear'], ['zoom'], 6, 0.25, 10, 0.8, 16, 1.4, 20, 2] as const);

  if (!paint['line-dasharray'] && (pathLike || tunnelLike)) {
    paint['line-dasharray'] = pathLike ? ([1.4, 1.1] as const) : ([0.9, 0.45] as const);
  }

  return layer;
}

function applyBoundaryHudStyle(layer: LineLayer): LineLayer {
  const paint = (layer.paint ??= {}) as NonNullable<LineLayer['paint']>;

  paint['line-color'] = matchesLayer(layer, ['disputed'])
    ? NEON_COLORS.cyan
    : NEON_COLORS.electricBlue;
  paint['line-opacity'] = ['interpolate', ['linear'], ['zoom'], 2, 0.16, 6, 0.3, 10, 0.55] as const;
  paint['line-blur'] = ['interpolate', ['linear'], ['zoom'], 2, 0.05, 8, 0.22, 14, 0.5] as const;

  return layer;
}

function applySecondaryLineHudStyle(layer: LineLayer): LineLayer {
  const paint = (layer.paint ??= {}) as NonNullable<LineLayer['paint']>;

  paint['line-color'] = NEON_COLORS.electricBlue;
  paint['line-opacity'] = ['interpolate', ['linear'], ['zoom'], 6, 0.16, 12, 0.32, 18, 0.56] as const;
  paint['line-blur'] = ['interpolate', ['linear'], ['zoom'], 6, 0.05, 12, 0.2, 18, 0.4] as const;

  return layer;
}

function applyLabelHudStyle(layer: SymbolLayer): SymbolLayer {
  const paint = (layer.paint ??= {}) as NonNullable<SymbolLayer['paint']>;

  paint['text-color'] = matchesLayer(layer, ['country', 'capital'])
    ? NEON_COLORS.cyan
    : NEON_COLORS.electricBlue;
  paint['text-halo-color'] = 'rgba(2, 6, 23, 0.96)';
  paint['text-halo-width'] = ['interpolate', ['linear'], ['zoom'], 3, 0.9, 8, 1.25, 16, 1.9] as const;
  paint['text-halo-blur'] = ['interpolate', ['linear'], ['zoom'], 3, 0.4, 10, 0.8, 16, 1.2] as const;
  paint['text-opacity'] = paint['text-opacity'] ?? 0.95;

  if ('icon-color' in paint) {
    paint['icon-color'] = NEON_COLORS.cyan;
  }

  if ('icon-halo-color' in paint) {
    paint['icon-halo-color'] = 'rgba(2, 6, 23, 0.96)';
  }

  if ('icon-halo-width' in paint) {
    paint['icon-halo-width'] = 1.1;
  }

  return layer;
}

function applyWaterLabelHudStyle(layer: SymbolLayer): SymbolLayer {
  const paint = (layer.paint ??= {}) as NonNullable<SymbolLayer['paint']>;

  paint['text-color'] = NEON_COLORS.electricBlue;
  paint['text-halo-color'] = 'rgba(2, 6, 23, 0.98)';
  paint['text-halo-width'] = ['interpolate', ['linear'], ['zoom'], 3, 1, 9, 1.4, 16, 2] as const;
  paint['text-halo-blur'] = ['interpolate', ['linear'], ['zoom'], 3, 0.5, 10, 0.95, 16, 1.3] as const;
  paint['text-opacity'] = paint['text-opacity'] ?? 0.9;

  return layer;
}

function createWaterOverlayLayer(): FillLayer {
  return {
    id: 'neon-water-overlay',
    type: 'fill',
    source: HYBRID_VECTOR_SOURCE,
    'source-layer': WATER_SOURCE_LAYER,
    layout: {
      visibility: 'visible',
    },
    paint: {
      'fill-color': NEON_COLORS.deepBlueWater,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.2, 6, 0.32, 12, 0.46, 18, 0.58] as const,
      'fill-antialias': true,
    },
  };
}

function createBuildingOverlayLayer(): FillExtrusionLayer {
  return {
    id: 'neon-building-overlay',
    type: 'fill-extrusion',
    source: HYBRID_VECTOR_SOURCE,
    'source-layer': BUILDING_SOURCE_LAYER,
    minzoom: 13,
    layout: {
      visibility: 'visible',
    },
    paint: {
      'fill-extrusion-color': [
        'interpolate',
        ['linear'],
        ['zoom'],
        13,
        NEON_COLORS.graphite,
        16,
        '#0f172a',
      ] as const,
      'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.12, 16, 0.22, 19, 0.32] as const,
      'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 0] as const,
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0] as const,
      'fill-extrusion-vertical-gradient': true,
    },
  };
}

function insertLayerAfterLastRaster(style: StyleSpecification, layer: MapStyleLayer): void {
  if (style.layers.some((existingLayer) => existingLayer.id === layer.id)) {
    return;
  }

  const lastRasterIndex = [...style.layers]
    .map((existingLayer, index) => ({ existingLayer, index }))
    .filter(({ existingLayer }) => existingLayer.type === 'raster')
    .at(-1)?.index;

  const insertIndex = lastRasterIndex === undefined ? 0 : lastRasterIndex + 1;

  style.layers.splice(insertIndex, 0, layer);
}

function isRasterLayer(layer: MapStyleLayer): layer is RasterLayer {
  return layer.type === 'raster';
}

function isLineLayer(layer: MapStyleLayer): layer is LineLayer {
  return layer.type === 'line';
}

function isSymbolLayer(layer: MapStyleLayer): layer is SymbolLayer {
  return layer.type === 'symbol';
}

function isRoadLikeLayer(layer: LineLayer): boolean {
  return matchesLayer(layer, ['road', 'motorway', 'highway', 'street', 'path', 'pathway', 'tunnel']);
}

function isBoundaryLayer(layer: LineLayer): boolean {
  return matchesLayer(layer, ['border', 'boundary', 'country', 'disputed', 'admin']);
}

function isWaterLabelLayer(layer: SymbolLayer): boolean {
  return matchesLayer(layer, ['water', 'ocean', 'bay', 'sea', 'lake', 'strait']);
}

function matchesLayer(layer: MapStyleLayer, keywords: string[]): boolean {
  const sourceLayer = 'source-layer' in layer ? layer['source-layer'] : '';
  const haystack = [layer.id, sourceLayer, 'source' in layer ? layer.source : '']
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return keywords.some((keyword) => haystack.includes(keyword));
}

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
export class LiveMapComponent implements OnInit, OnChanges, OnDestroy {
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

  onMapLoad(map: MapLibreMap) {
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
}
