import { OutboundOrderData } from './outbound_order_data';

export interface OutboundOrderResponse {
  statusCode: number;
  message: string;
  data: OutboundOrderData;
}
