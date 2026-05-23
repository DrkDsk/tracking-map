import { Component, Input } from '@angular/core';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { LngLatLike, Map } from 'maplibre-gl';
import { inject } from '@angular/core';
import { RoutingService } from '../../services/maps/routing_service';
import { MapService } from '../../services/maps/map.service';

@Component({
  selector: 'live-map-component',
  standalone: true,
  imports: [MapComponent],
  templateUrl: './live-map-component.html',
  styleUrl: './live-map-component.css',
})
export class LiveMapComponent {
  private routingService = inject(RoutingService);
  private mapService = inject(MapService);

  @Input()
  mapStyle = 'https://api.maptiler.com/maps/hybrid-v4/style.json?key=NOlJEA2Zes5006iTaZav';

  @Input()
  zoom: [number] = [1];

  @Input()
  mexicoBounds: [LngLatLike, LngLatLike] = [
    [-130, 5],
    [-75, 40],
  ];

  center: [number, number] = [-102.5528, 23.6345];

  onMapLoad(map: Map) {
    this.mapService.initialize(map);
    this.mapService.setUp();
    this.loadTrackingRoutes();
  }

  loadTrackingRoutes() {
    this.routingService
      .getRoute([-93.74744249, 16.0853598], [-93.06810014, 16.74755547])
      .subscribe((route) => {
        const coordinates = route.routes[0].geometry.coordinates;
        console.log(coordinates);
        this.mapService.drawRoute(coordinates);
      });
  }
}
