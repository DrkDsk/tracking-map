export interface CurrentTracking {
  id: number;
  unit_id: number;
  unit_device_id: number;
  lat: number;
  lng: number;
  speed: number;
  angle: number;
  acc: boolean;
  position_valid: boolean;
  gps_time: string;
  obd_remaining_fuel_percent: string;
  obd_total_fuel_liters: string;
  obd_remaining_fuel_liters: string;
}
