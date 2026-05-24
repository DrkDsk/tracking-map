import { Observable } from 'rxjs';
import { OutboundOrderResponse } from '../models/outbound_order_response';

export interface ApiProviderService {
  getWayPoints(unit_id: string | number): Observable<OutboundOrderResponse>;
}
