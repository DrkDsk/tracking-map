import { Component } from '@angular/core';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';

@Component({
  selector: 'lib-live-map-component',
  standalone: true,
  imports: [MapComponent],
  templateUrl: './live-map-component.html',
  styleUrl: './live-map-component.css',
})
export class LiveMapComponent {
  mapStyle = 'https://demotiles.maplibre.org/style.json';

  center: [number, number] = [-99.1332, 19.4326];

  zoom: [number] = [12];
}
