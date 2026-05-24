import { Waypoints } from './waypoints';

export interface OutboundOrderResponse {
  statusCode: number;
  message: string;
  data: OutboundOrderResponseData;
}

export interface OutboundOrderResponseData {
  unit_id: number;
  outbound_orders: OutboundOrder[];
}

export interface OutboundOrder {
  id: number;
  id_seguimiento: string;
  waypoints: Waypoint[];
}

export interface Waypoint {
  lat: number;
  lng: number;
  type: string;
  sequence: number;
}
