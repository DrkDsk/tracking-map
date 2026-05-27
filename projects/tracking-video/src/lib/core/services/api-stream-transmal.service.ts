import { ApiStreamService } from '../contracts/api_stream.service';
import { map, Observable } from 'rxjs';
import { StreamVideoResponse } from '../models/stream_video_response';
import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../http/api-client.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiStreamTransmalService implements ApiStreamService {
  private api = inject(ApiClient);

  private readonly baseUrl = environment.providers.transmal;

  getStreamUrls(unitId: string | number): Observable<string[]> {
    const response = this.api.get<StreamVideoResponse>(
      this.baseUrl,
      `/api/units/${unitId}}/stream-video`,
    );

    return response.pipe(map((response) => response.urls));
  }
}
