import { Component } from '@angular/core';
import { ClientType, LiveMapComponent } from 'tracking-map';

@Component({
  selector: 'app-root',
  imports: [LiveMapComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly clientTypes = ClientType;
  protected readonly unitId = 142;
}
