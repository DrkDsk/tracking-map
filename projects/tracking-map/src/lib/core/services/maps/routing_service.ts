import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RoutingService {
  private readonly baseUrl = 'https://router.project-osrm.org/route/v1/driving';

  constructor(private http: HttpClient) {}

  getRoute(origin: [number, number], destination: [number, number]) {
    const coordinates = [origin.join(','), destination.join(',')].join(';');

    const url = `${this.baseUrl}/${coordinates}` + '?overview=full&geometries=geojson';

    return this.http.get<any>(url);
  }
}
