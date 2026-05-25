import { Component, Input } from '@angular/core';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { LngLatLike, Map } from 'maplibre-gl';
import { inject } from '@angular/core';
import { RoutingService } from '../../core/services/maps/routing_service';
import { MapRenderService } from '../../core/services/maps/map-render.service';
import { ClientType } from '../../core/enums/provider_type';
import { TrackingRepository } from '../../core/repositories/tracking_repository';
import { forkJoin, map, Observable, switchMap } from 'rxjs';
import { TrackingRoute } from '../../core/models/tracking_route';
import { ColorUtils } from '../../core/utils/color_utils';

@Component({
  selector: 'live-map-component',
  standalone: true,
  imports: [MapComponent],
  templateUrl: './live-map-component.html',
  styleUrl: './live-map-component.css',
})
export class LiveMapComponent {
  private routingService = inject(RoutingService);
  private mapRenderService = inject(MapRenderService);
  private trackingRepository = inject(TrackingRepository);
  private colorUtils = inject(ColorUtils);

  @Input()
  mapStyle = 'https://api.maptiler.com/maps/hybrid-v4/style.json?key=NOlJEA2Zes5006iTaZav';

  @Input()
  zoom: [number] = [1];

  @Input()
  provider: ClientType = ClientType.servidiesel;

  @Input()
  mexicoBounds: [LngLatLike, LngLatLike] = [
    [-130, 5],
    [-75, 40],
  ];

  @Input()
  unitId: string | number = 0;

  center: [number, number] = [-102.5528, 23.6345];

  onMapLoad(map: Map) {
    this.mapRenderService.initialize(map);
    this.loadTrackingRoutes();
  }

  loadTrackingRoutes() {
    this.trackingRepository.getWayPoints(this.provider, 142)
      .pipe(
        switchMap((trackingData) : Observable<TrackingRoute[]> => {

          const data = trackingData.data
          const outbound_orders = data.outbound_orders;

          return forkJoin(
            outbound_orders.map((route, index) => {
              const routeId = route.id_seguimiento
              const coordinates = route.waypoints.map((waypoint) => [waypoint.lng, waypoint.lat]);
              const origin = coordinates.at(0) ?? [0, 0];
              const destiny = coordinates.at(1) ?? [0, 0];

              const pointA: [number, number] = [origin[0], origin[1]];
              const pointB: [number, number] = [destiny[0], destiny[1]];

              return this.routingService.getRoute(pointA, pointB).pipe(
                map((response) => {
                  const trackingRoute: TrackingRoute = {
                    id: `${routeId}`,
                    color: this.colorUtils.getRandomColor(index),
                    coordinates: response.routes[0].geometry.coordinates,
                  };
                  return trackingRoute;
                }),
              );
            }),
          );
        })
      )
      .subscribe((response) => {
        this.mapRenderService.render(response);
    })
  }
}
