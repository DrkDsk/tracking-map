import { inject, Injectable } from '@angular/core';
import { ApiStreamServiDieselService } from '../services/api-stream-servidiesel.service';
import { ClientType } from '../types/client_type';

@Injectable({ providedIn: 'root' })
export class ApiProviderResolver {
  private servidiesel = inject(ApiStreamServiDieselService);
  private transmal = inject(ApiStreamServiDieselService);

  resolve(provider: ClientType): ApiStreamServiDieselService {
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
