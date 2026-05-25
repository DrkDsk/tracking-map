import { inject, Injectable } from '@angular/core';
import { WebsocketStrategyResolver } from '../strategy/websocket-strategy.resolver';
import { ClientType } from '../enums/provider_type';
import { TrackingPosition } from '../models/tracking_position';
import { WebsocketConfig } from '../models/websocket_config';

@Injectable({
  providedIn: 'root',
})
export class RealtimeTrackingRepository {
  private resolver = inject(WebsocketStrategyResolver);

  getConfig(provider: ClientType, unitId: string | number): WebsocketConfig {
    return this.resolver.resolve(provider).getConfig(unitId);
  }

  parsePosition(
    provider: ClientType,
    payload: unknown,
    unitId: string | number,
  ): TrackingPosition | null {
    return this.resolver.resolve(provider).parse(payload, unitId);
  }

  shouldHandle(provider: ClientType, position: TrackingPosition, unitId: string | number): boolean {
    return this.resolver.resolve(provider).shouldHandle(position, unitId);
  }
}
