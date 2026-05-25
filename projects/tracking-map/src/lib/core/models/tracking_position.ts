import { ClientType } from '../enums/provider_type';

export type TrackingPositionSource = 'websocket' | 'animation';

export interface TrackingPosition {
  unit_id: string | number;
  lat: number;
  lng: number;
  provider: ClientType;
  received_at: number;
  source: TrackingPositionSource;
  is_interpolated?: boolean;
  event_name?: string;
  raw?: unknown;
}
