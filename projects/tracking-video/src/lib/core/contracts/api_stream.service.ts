import { Observable } from 'rxjs';

export interface ApiStreamService {
  getStreamUrls(unitId: string | number): Observable<string[]>;
}
