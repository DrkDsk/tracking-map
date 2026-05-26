import { ClientType } from '../enums/provider_type';
import { TrackingPosition } from '../models/tracking_position';
import { TrackingUnitInput } from '../models/tracking_unit_reference';
import { WebsocketConfig } from '../models/websocket_config';

export interface WebsocketStrategy {
  readonly provider: ClientType;
  getConfig(unit: TrackingUnitInput): WebsocketConfig;
  parse(payload: unknown, unit: TrackingUnitInput): TrackingPosition | null;
  shouldHandle(position: TrackingPosition, unit: TrackingUnitInput): boolean;
}
