import { inject, Injectable } from '@angular/core';
import { ApiStreamServiDieselService } from '../services/api-stream-servidiesel.service';
import { ClientType } from '../types/client_type';
import { ApiStreamTransmalService } from '../services/api-stream-transmal.service';
import { ApiStreamService } from '../contracts/api_stream.service';

@Injectable({ providedIn: 'root' })
export class ApiProviderResolver {
  private servidiesel = inject(ApiStreamServiDieselService);
  private transmal = inject(ApiStreamTransmalService);

  resolve(provider: ClientType): ApiStreamService {
    switch (provider) {
      case 'servidiesel':
        return this.servidiesel;
      case 'transmal':
        return this.transmal;
      default:
        return this.servidiesel;
    }
  }
}
