import { inject, Injectable } from '@angular/core';
import { ApiProviderResolver } from '../strategy/api.provider.resolver';
import { ClientType } from 'tracking-map';

@Injectable({
  providedIn: 'root',
})
export class StreamRepository {
  private resolver = inject(ApiProviderResolver);

  getStreamUrls(provider: ClientType, unitId: string | number) {
    return this.resolver.resolve(provider).getStreamUrls(unitId);
  }
}
