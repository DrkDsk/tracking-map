import { Injectable } from '@angular/core';
import { GeoJSONSource, Map, Popup } from 'maplibre-gl';
import { TrackingRoute } from '../../models/tracking_route';
import { FeatureCollection, LineString, Point } from 'geojson';
import { TrackingPosition } from '../../models/tracking_position';
import { ClientType } from '../../enums/provider_type';

@Injectable({
  providedIn: 'root',
})
export class MapRenderService {
  private map!: Map;

  private readonly sourceId = 'routes-source';
  private readonly layerId = 'routes-layer';
  private readonly unitsSourceId = 'units-source';
  private readonly unitsLayerId = 'units-layer';
  private readonly unitsLabelLayerId = 'units-label-layer';

  initialize(map: Map) {
    this.map = map;
  }

  private buildFeatureCollection(routes: TrackingRoute[]): FeatureCollection<LineString> {
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

  render(routes: TrackingRoute[]) {
    const data = this.buildFeatureCollection(routes);

    // SOURCE
    if (!this.map.getSource(this.sourceId)) {
      this.map.addSource(this.sourceId, {
        type: 'geojson',
        data: data,
      });
    } else {
      const source = this.map.getSource(this.sourceId) as GeoJSONSource;
      source.setData(data);
    }

    // LAYER
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

  renderUnits(positions: TrackingPosition[]) {
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

    if (!this.map.getLayer(this.unitsLayerId)) {
      this.map.addLayer({
        id: this.unitsLayerId,
        type: 'circle',
        source: this.unitsSourceId,
        paint: {
          'circle-radius': ['case', ['boolean', ['get', 'isInterpolated'], false], 11, 9],
          'circle-color': '#0f766e',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.95,
        },
      });
    }

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

  private buildUnitsFeatureCollection(positions: TrackingPosition[]): FeatureCollection<Point> {
    return {
      type: 'FeatureCollection',
      features: positions.map((position) => ({
        type: 'Feature',
        properties: {
          unitId: String(position.unit_id),
          label: `Unit ${position.unit_id}`,
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

  private registerUnitEvents(): void {
    this.map.on('click', this.unitsLayerId, (e) => {
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
        </div>
      `,
        )
        .addTo(this.map);
    });
  }
}
