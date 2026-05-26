import { inject, Injectable } from '@angular/core';
import { ProviderResolver } from '../strategy/provider.resolver';
import { ClientType } from '../types/provider_type';

@Injectable({
  providedIn: 'root',
})
export class TrackingRepository {
  private resolver = inject(ProviderResolver);

  getWayPoints(provider: ClientType, unitId: string | number) {
    return this.resolver.resolve(provider).getWayPoints(unitId);
  }
}
