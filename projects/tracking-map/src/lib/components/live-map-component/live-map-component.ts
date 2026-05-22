import { Component } from '@angular/core';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';

@Component({
  selector: 'live-map-component',
  standalone: true,
  imports: [MapComponent],
  templateUrl: './live-map-component.html',
  styleUrl: './live-map-component.css',
})
export class LiveMapComponent {
  mapStyle = 'https://api.maptiler.com/maps/hybrid-v4/style.json?key=NOlJEA2Zes5006iTaZav';

  center: [number, number] = [-99.1332, 19.4326];

  zoom: [number] = [12];
}
