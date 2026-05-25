import { ClientType } from '../enums/provider_type';
import { TrackingPosition } from '../models/tracking_position';
import { WebsocketConfig } from '../models/websocket_config';

export interface WebsocketStrategy {
  readonly provider: ClientType;
  getConfig(unitId: string | number): WebsocketConfig;
  parse(payload: unknown, unitId: string | number): TrackingPosition | null;
  shouldHandle(position: TrackingPosition, unitId: string | number): boolean;
}
