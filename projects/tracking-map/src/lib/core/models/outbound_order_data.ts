import { OutboundOrder } from './outbound_order';

export interface OutboundOrderData {
  unit_id: number;
  outbound_orders: OutboundOrder[];
}
