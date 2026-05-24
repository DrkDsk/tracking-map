import { Waypoint } from './waypoint';

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
