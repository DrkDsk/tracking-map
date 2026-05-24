import { OutboundOrder } from './outbound_order_response';

export interface OutboundOrderData {
  unit_id: number;
  outbound_orders: OutboundOrder[];
}
