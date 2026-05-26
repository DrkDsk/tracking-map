import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ApiClient {
  private readonly http = inject(HttpClient);

  get<T>(
    baseUrl: string,
    endpoint : string,
    options?: {
      params?: HttpParams;
      headers?: HttpHeaders;
    },
  ) {
    return this.http.get<T>(`${baseUrl}${endpoint}`, options);
  }

  post<T>(url: string, body: unknown) {
    return this.http.post<T>(url, body);
  }

  put<T>(url: string, body: unknown) {
    return this.http.put<T>(url, body);
  }

  delete<T>(url: string) {
    return this.http.delete<T>(url);
  }
}
