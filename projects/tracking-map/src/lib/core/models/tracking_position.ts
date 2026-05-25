export interface TrackingPosition {
  unit_id: string | number;
  unit_device_id: string | number;
  unique_id: string | number;
  lat: number;
  lng: number;
  speed: number;
  angle: number;
  acc: boolean;
  gps_time : string;
}
