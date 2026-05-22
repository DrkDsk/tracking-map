import { Component } from '@angular/core';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { GeoJSONSource, Map } from 'maplibre-gl';
import { inject } from '@angular/core';
import { RoutingService } from '../../services/maps/routing_service';
import { RouteConfig } from '../../core/models/route_config';

@Component({
  selector: 'live-map-component',
  standalone: true,
  imports: [MapComponent],
  templateUrl: './live-map-component.html',
  styleUrl: './live-map-component.css',
})
export class LiveMapComponent {
  private routingService = inject(RoutingService);

  mapStyle = 'https://api.maptiler.com/maps/hybrid-v4/style.json?key=NOlJEA2Zes5006iTaZav';
  zoom: [number] = [6];

  private map!: Map;

  onMapLoad(map: Map) {
    this.map = map;

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

    this.routingService.getRoute([-93.74744249, 16.0853598], [-93.06810014, 16.74755547])
      .subscribe((route) => {
        const coordinates = route.routes[0].geometry.coordinates;
        this.drawRoute(coordinates);
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
}
