import { inject, Injectable } from '@angular/core';
import { ApiProviderService } from '../../contracts/api-provider.service';
import { Observable } from 'rxjs';
import { ApiClient } from '../../http/api-client.service';
import { environment } from '../../../../environments/environment';
import { OutboundOrderResponse } from '../../models/outbound_order_response';

@Injectable({
  providedIn: 'root',
})
export class ApiTransmalService implements ApiProviderService {
  private api = inject(ApiClient);

  private readonly baseUrl = environment.providers.transmal;

  getWayPoints(unit_id: string | number): Observable<OutboundOrderResponse> {
    return this.api.get<OutboundOrderResponse>(this.baseUrl, '');
  }
}
