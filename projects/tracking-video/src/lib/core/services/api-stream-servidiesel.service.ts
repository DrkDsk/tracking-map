import { inject, Injectable } from '@angular/core';
import { ApiStreamService } from '../contracts/api_stream.service';
import { map, Observable, of } from 'rxjs';
import { StreamVideoResponse } from '../models/stream_video_response';
import { ApiClient } from '../http/api-client.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiStreamServiDieselService implements ApiStreamService {
  private api = inject(ApiClient);

  private readonly baseUrl = environment.providers.servidiesel;

  getStreamUrls(unitId: string | number): Observable<string[]> {
    const response = this.api.get<StreamVideoResponse>(
      this.baseUrl,
      `/api/units/${unitId}/test/stream`,
    );

    return response.pipe(map((response) => response.urls));
  }
}
