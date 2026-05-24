import { inject, Injectable } from '@angular/core';
import { ApiProviderService } from '../../contracts/api-provider.service';
import { Observable } from 'rxjs';
import { ApiClient } from '../../http/api-client.service';
import { environment } from '../../../../environments/environment';
import { OutboundOrderResponse } from '../../models/outbound_order_response';

@Injectable({
  providedIn: 'root',
})
export class ApiServiDieselService implements ApiProviderService {
  private api = inject(ApiClient);

  private readonly baseUrl = environment.providers.servidiesel;

  getWayPoints(unit_id: string | number): Observable<OutboundOrderResponse> {
    return this.api.get<OutboundOrderResponse>(
      this.baseUrl,
      `/api/units/${unit_id}/outbound-orders-waypoints`,
    );
  }
}
