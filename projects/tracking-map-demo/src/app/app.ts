import { Component, signal } from '@angular/core';
import { LiveMapComponent } from 'tracking-map';

@Component({
  selector: 'app-root',
  imports: [LiveMapComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('tracking-map-demo');
}
