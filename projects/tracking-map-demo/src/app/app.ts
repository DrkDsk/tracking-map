import { Component } from '@angular/core';
import { LiveMapComponent } from 'tracking-map';
import { TrackingVideoComponent } from 'tracking-video';

@Component({
  selector: 'app-root',
  imports: [LiveMapComponent, TrackingVideoComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true,
})
export class App {
  protected readonly unitId = 280;
  protected readonly trackedUnitIds = [280, 281];
}
