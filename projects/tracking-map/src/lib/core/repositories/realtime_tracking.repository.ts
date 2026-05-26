import { inject, Injectable } from '@angular/core';
import { WebsocketStrategyResolver } from '../strategy/websocket-strategy.resolver';
import { ClientType } from '../types/provider_type';
import { TrackingPosition } from '../models/tracking_position';
import { TrackingUnitInput } from '../models/tracking_unit_reference';
import { WebsocketConfig } from '../models/websocket_config';

@Injectable({
  providedIn: 'root',
})
export class RealtimeTrackingRepository {
  private resolver = inject(WebsocketStrategyResolver);

  getConfig(provider: ClientType, unit: TrackingUnitInput): WebsocketConfig {
    return this.resolver.resolve(provider).getConfig(unit);
  }

  parsePosition(
    provider: ClientType,
    payload: unknown,
    unit: TrackingUnitInput,
  ): TrackingPosition | null {
    return this.resolver.resolve(provider).parse(payload, unit);
  }

  shouldHandle(provider: ClientType, position: TrackingPosition, unit: TrackingUnitInput): boolean {
    return this.resolver.resolve(provider).shouldHandle(position, unit);
  }
}
