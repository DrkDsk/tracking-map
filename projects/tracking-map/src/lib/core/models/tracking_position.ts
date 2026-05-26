import { ClientType } from '../enums/provider_type';

export interface TrackingPositionPayload {
  unit_id: string | number;
  unit_device_id: string | number;
  unique_id: string | number;
  lat: number;
  lng: number;
  speed: number;
  angle: number;
  acc: boolean;
  gps_time: string;
}

export type TrackingPositionSource = 'websocket' | 'animation';

export interface TrackingPosition extends TrackingPositionPayload {
  provider: ClientType;
  received_at: number;
  rendered_at: number;
  source: TrackingPositionSource;
  is_interpolated: boolean;
}
