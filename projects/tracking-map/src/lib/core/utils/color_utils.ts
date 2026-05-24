import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ColorUtils {
  private readonly routeColors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#F7B801',
    '#5C7AEA',
    '#9B5DE5',
    '#2EC4B6',
    '#E63946',
  ];

  public getRandomColor(index: number): string {
    return this.routeColors[index % this.routeColors.length];
  }
}
