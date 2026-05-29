import { OutboundOrder } from './outbound_order';
import { CurrentTracking } from './current_tracking';

export interface OutboundOrderData {
  unit_id: number;
  unit_number: string;
  current_tracking: CurrentTracking;
  outbound_orders: OutboundOrder[];
}
