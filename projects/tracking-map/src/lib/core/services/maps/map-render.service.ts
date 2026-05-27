import { Injectable } from '@angular/core';
import { Feature, FeatureCollection, LineString, Point } from 'geojson';
import { GeoJSONSource, Map, Popup, type CircleLayerSpecification } from 'maplibre-gl';
import { TrackingRoute } from '../../models/tracking_route';
import { TrackingPosition } from '../../models/tracking_position';

interface RouteProperties {
  id: string;
  color: string;
}

interface UnitProperties {
  unitId: string;
  provider: string;
  label: string;
  speed: number;
  angle: number;
  acc: string;
  gpsTime: string;
  uniqueId: string;
  unitDeviceId: string;
  isInterpolated: boolean;
  lat: string;
  lng: string;
}

interface RouteEndpointProperties {
  routeId: string;
  color: string;
  role: 'start' | 'end';
}

const TRACKING_RING_COLORS = {
  core: '#5DA9FF',
  ring: '#7CC0FF',
  glow: '#BFE1FF',
  glowTransparent: 'rgba(191, 225, 255, 0.22)',
} as const;

const TRACKING_RING_RADIUS = {
  glow: {
    normal: 18,
    interpolated: 20,
  },
  ring: {
    normal: 9,
    interpolated: 11,
  },
  core: {
    normal: 4.8,
    interpolated: 5.6,
  },
} as const;

const ENDPOINT_RING_RADIUS = {
  glow: 16,
  ring: 8,
  core: 4.4,
} as const;

@Injectable({
  providedIn: 'root',
})
export class MapRenderService {
  private map!: Map;

  private readonly sourceId = 'routes-source';
  private readonly layerId = 'routes-layer';

  private readonly routeStartSourceId = 'route-start-source';
  private readonly routeEndSourceId = 'route-end-source';
  private readonly routeStartGlowLayerId = 'route-start-glow-layer';
  private readonly routeStartRingLayerId = 'route-start-ring-layer';
  private readonly routeStartCoreLayerId = 'route-start-core-layer';
  private readonly routeEndGlowLayerId = 'route-end-glow-layer';
  private readonly routeEndRingLayerId = 'route-end-ring-layer';
  private readonly routeEndCoreLayerId = 'route-end-core-layer';

  private readonly unitsSourceId = 'units-source';
  private readonly unitsRingLayerId = 'units-ring-layer';
  private readonly unitsCoreLayerId = 'units-core-layer';
  private readonly unitsLabelLayerId = 'units-label-layer';

  initialize(map: Map): void {
    this.map = map;
  }

  private buildFeatureCollection(
    routes: TrackingRoute[],
  ): FeatureCollection<LineString, RouteProperties> {
    return {
      type: 'FeatureCollection',
      features: routes.map((route) => ({
        type: 'Feature',
        properties: {
          id: route.id,
          color: route.color,
        },
        geometry: {
          type: 'LineString',
          coordinates: route.coordinates,
        },
      })),
    };
  }

  private buildRouteEndpointFeatureCollection(
    routes: TrackingRoute[],
    role: 'start' | 'end',
  ): FeatureCollection<Point, RouteEndpointProperties> {
    return {
      type: 'FeatureCollection',
      features: routes
        .filter((route) => route.coordinates.length > 0)
        .map((route) => this.buildRouteEndpointFeature(route, role)),
    };
  }

  private buildRouteEndpointFeature(
    route: TrackingRoute,
    role: 'start' | 'end',
  ): Feature<Point, RouteEndpointProperties> {
    const coordinates =
      role === 'start' ? route.coordinates[0] : route.coordinates[route.coordinates.length - 1];

    return {
      type: 'Feature',
      properties: {
        routeId: route.id,
        color: route.color,
        role,
      },
      geometry: {
        type: 'Point',
        coordinates,
      },
    };
  }

  render(routes: TrackingRoute[]): void {
    const data = this.buildFeatureCollection(routes);

    if (!this.map.getSource(this.sourceId)) {
      this.map.addSource(this.sourceId, {
        type: 'geojson',
        data,
      });
    } else {
      const source = this.map.getSource(this.sourceId) as GeoJSONSource;
      source.setData(data);
    }

    if (!this.map.getLayer(this.layerId)) {
      this.map.addLayer({
        id: this.layerId,
        type: 'line',
        source: this.sourceId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['coalesce', ['get', 'width'], 4],
          'line-opacity': ['coalesce', ['get', 'opacity'], 1],
        },
      });
      this.registerRouteEvents();
    }

    this.syncRouteEndpointSource(this.routeStartSourceId, routes, 'start');
    this.syncRouteEndpointSource(this.routeEndSourceId, routes, 'end');
    this.ensureRouteEndpointLayers();
  }

  private syncRouteEndpointSource(
    sourceId: string,
    routes: TrackingRoute[],
    role: 'start' | 'end',
  ): void {
    const data = this.buildRouteEndpointFeatureCollection(routes, role);

    if (!this.map.getSource(sourceId)) {
      this.map.addSource(sourceId, {
        type: 'geojson',
        data,
      });
      return;
    }

    const source = this.map.getSource(sourceId) as GeoJSONSource;
    source.setData(data);
  }

  private ensureRouteEndpointLayers(): void {
    this.ensureCircleLayer(
      this.createEndpointGlowLayer(this.routeStartGlowLayerId, this.routeStartSourceId),
    );
    this.ensureCircleLayer(
      this.createEndpointRingLayer(this.routeStartRingLayerId, this.routeStartSourceId),
    );
    this.ensureCircleLayer(
      this.createEndpointCoreLayer(this.routeStartCoreLayerId, this.routeStartSourceId),
    );

    this.ensureCircleLayer(
      this.createEndpointGlowLayer(this.routeEndGlowLayerId, this.routeEndSourceId),
    );
    this.ensureCircleLayer(
      this.createEndpointRingLayer(this.routeEndRingLayerId, this.routeEndSourceId),
    );
    this.ensureCircleLayer(
      this.createEndpointCoreLayer(this.routeEndCoreLayerId, this.routeEndSourceId),
    );
  }

  private createEndpointGlowLayer(id: string, source: string): CircleLayerSpecification {
    return {
      id,
      type: 'circle',
      source,
      paint: {
        'circle-radius': ENDPOINT_RING_RADIUS.glow,
        'circle-color': 'rgba(191, 225, 255, 0.18)',
        'circle-blur': 0.85,
        'circle-opacity': 1,
      },
    };
  }

  private createEndpointRingLayer(id: string, source: string): CircleLayerSpecification {
    return {
      id,
      type: 'circle',
      source,
      paint: {
        'circle-radius': ENDPOINT_RING_RADIUS.ring,
        'circle-color': 'rgba(0, 0, 0, 0)',
        'circle-stroke-color': TRACKING_RING_COLORS.ring,
        'circle-stroke-width': 2,
        'circle-opacity': 0.92,
      },
    };
  }

  private createEndpointCoreLayer(id: string, source: string): CircleLayerSpecification {
    return {
      id,
      type: 'circle',
      source,
      paint: {
        'circle-radius': ENDPOINT_RING_RADIUS.core,
        'circle-color': TRACKING_RING_COLORS.core,
        'circle-stroke-color': TRACKING_RING_COLORS.glow,
        'circle-stroke-width': 1.2,
        'circle-opacity': 1,
      },
    };
  }

  private registerRouteEvents(): void {
    this.map.on('click', this.layerId, (e) => {
      const feature = e.features?.[0];

      if (!feature) return;

      const properties = feature.properties;
      const id = properties['id'];

      new Popup({
        closeButton: false,
      })
        .setLngLat(e.lngLat)
        .setHTML(
          `
        <div>
          <strong>${id}</strong>
        </div>
      `,
        )
        .addTo(this.map);
    });
  }

  renderUnits(positions: TrackingPosition[]): void {
    if (!this.map) {
      return;
    }

    const data = this.buildUnitsFeatureCollection(positions);

    if (!this.map.getSource(this.unitsSourceId)) {
      this.map.addSource(this.unitsSourceId, {
        type: 'geojson',
        data,
      });
    } else {
      const source = this.map.getSource(this.unitsSourceId) as GeoJSONSource;
      source.setData(data);
    }

    this.ensureCircleLayer(this.createUnitRingLayer());
    this.ensureCircleLayer(this.createRealTimeLayerLayer());

    if (!this.map.getLayer(this.unitsLabelLayerId)) {
      this.map.addLayer({
        id: this.unitsLabelLayerId,
        type: 'symbol',
        source: this.unitsSourceId,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 12,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#0f172a',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.25,
        },
      });

      this.registerUnitEvents();
    }
  }

  private createUnitRingLayer(): CircleLayerSpecification {
    return {
      id: this.unitsRingLayerId,
      type: 'circle',
      source: this.unitsSourceId,
      paint: {
        'circle-radius': this.buildTrackingRadiusExpression(
          TRACKING_RING_RADIUS.ring.normal,
          TRACKING_RING_RADIUS.ring.interpolated,
        ),
        'circle-color': 'rgba(0, 0, 0, 0)',
        'circle-stroke-color': TRACKING_RING_COLORS.ring,
        'circle-stroke-width': 20,
        'circle-opacity': 1,
        'circle-stroke-opacity': 0.4,
      },
    };
  }

  private createRealTimeLayerLayer(): CircleLayerSpecification {
    return {
      id: this.unitsCoreLayerId,
      type: 'circle',
      source: this.unitsSourceId,
      paint: {
        'circle-radius': this.buildTrackingRadiusExpression(11, 9),
        'circle-color': TRACKING_RING_COLORS.core,
        'circle-stroke-color': TRACKING_RING_COLORS.glow,
        'circle-stroke-width': 2,
        'circle-opacity': 1,
      },
    };
  }

  clearUnits(): void {
    if (!this.map || !this.map.getSource(this.unitsSourceId)) {
      return;
    }

    const source = this.map.getSource(this.unitsSourceId) as GeoJSONSource;
    source.setData(this.buildUnitsFeatureCollection([]));
  }

  focusUnit(position: TrackingPosition, zoom = 14): void {
    if (!this.map) {
      return;
    }

    this.map.easeTo({
      center: [position.lng, position.lat],
      zoom,
      duration: 800,
    });
  }

  private buildUnitsFeatureCollection(
    positions: TrackingPosition[],
  ): FeatureCollection<Point, UnitProperties> {
    return {
      type: 'FeatureCollection',
      features: positions.map((position) => ({
        type: 'Feature',
        properties: {
          unitId: String(position.unit_id),
          provider: position.provider,
          label: `Unit ${position.unit_id}`,
          speed: position.speed,
          angle: position.angle,
          acc: position.acc ? 'ON' : 'OFF',
          gpsTime: position.gps_time,
          uniqueId: String(position.unique_id),
          unitDeviceId: String(position.unit_device_id),
          isInterpolated: position.is_interpolated,
          lat: position.lat.toFixed(6),
          lng: position.lng.toFixed(6),
        },
        geometry: {
          type: 'Point',
          coordinates: [position.lng, position.lat],
        },
      })),
    };
  }

  private buildTrackingRadiusExpression(
    normalRadius: number,
    interpolatedRadius: number,
  ): ['case', ['boolean', ['get', 'isInterpolated'], false], number, number] {
    return [
      'case',
      ['boolean', ['get', 'isInterpolated'], false],
      interpolatedRadius,
      normalRadius,
    ];
  }

  private ensureCircleLayer(layer: CircleLayerSpecification): void {
    if (!this.map.getLayer(layer.id)) {
      this.map.addLayer(layer);
    }
  }

  private registerUnitEvents(): void {
    this.map.on('click', this.unitsCoreLayerId, (e) => {
      const feature = e.features?.[0];

      if (!feature) {
        return;
      }

      const properties = feature.properties ?? {};

      new Popup({
        closeButton: false,
      })
        .setLngLat(e.lngLat)
        .setHTML(
          `
        <div>
          <strong>${properties['label']}</strong>
          <div>Provider: ${properties['provider']}</div>
          <div>Lat: ${properties['lat']}</div>
          <div>Lng: ${properties['lng']}</div>
          <div>Speed: ${properties['speed']}</div>
          <div>Angle: ${properties['angle']}</div>
          <div>ACC: ${properties['acc']}</div>
          <div>GPS Time: ${properties['gpsTime']}</div>
        </div>
      `,
        )
        .addTo(this.map);
    });
  }
}
