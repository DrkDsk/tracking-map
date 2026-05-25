import { Injectable } from '@angular/core';
import { GeoJSONSource, Map, Popup } from 'maplibre-gl';
import { TrackingRoute } from '../../models/tracking_route';
import { FeatureCollection, LineString } from 'geojson';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private map!: Map;

  private readonly sourceId = 'routes-source';
  private readonly layerId = 'routes-layer';

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

      console.log(id)

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
}
