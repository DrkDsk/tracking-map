import { ApiProviderService } from '../contracts/api-provider.service';
import { ApiServiDieselService } from '../services/clients/api-servidiesel.service';
import { ApiTransmalService } from '../services/clients/api-transmal.service';
import { inject, Injectable } from '@angular/core';
import { ClientType } from '../enums/provider_type';

@Injectable({ providedIn: 'root' })
export class ProviderResolver {
  private serviDiesel = inject(ApiServiDieselService);
  private transmal = inject(ApiTransmalService);

  resolve(provider: ClientType): ApiProviderService {
    switch (provider) {
      case ClientType.servidiesel:
        return this.serviDiesel;
      case ClientType.transmal:
        return this.transmal;
      default:
        return new ApiServiDieselService();
    }
  }
}
