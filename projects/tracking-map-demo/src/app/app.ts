import { Component, signal } from '@angular/core';
import { ClientType, LiveMapComponent } from 'tracking-map';

@Component({
  selector: 'app-root',
  imports: [LiveMapComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('tracking-map-demo');
  protected readonly clientTypes = ClientType;
  protected readonly unitId = 1;
}
