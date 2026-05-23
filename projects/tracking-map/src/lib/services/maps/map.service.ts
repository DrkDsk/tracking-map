import { Injectable } from '@angular/core';
import { GeoJSONSource, LngLatLike, Map } from 'maplibre-gl';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private map!: Map;

  initialize(map: Map) {
    this.map = map;
  }

  setUp() {
    this.map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
        properties: {},
      },
    });

    this.map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      paint: {
        'line-color': '#d93341',
        'line-width': 6,
      },
    });
  }

  drawRoute(coordinates: number[][]) {
    if (this.map.getSource('route')) {
      (this.map.getSource('route') as GeoJSONSource).setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: {},
      });
      return;
    }
  }

  jumpTo(coordinates: number[]) {
    const center :  LngLatLike = {
      lng: coordinates[0],
      lat: coordinates[1],
    }
    this.map.flyTo({
      center: center,
      zoom: 15,
    });
  }
}
