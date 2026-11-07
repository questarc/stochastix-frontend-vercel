import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

type Params = Record<string, string | number | boolean | null | undefined>;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.apiBaseUrl;

  url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  get<T>(path: string, params?: Params, context?: HttpContext, headers?: HttpHeaders): Observable<T> {
    return this.http.get<T>(this.url(path), { params: toParams(params), context, headers });
  }

  post<T>(path: string, body: unknown, context?: HttpContext): Observable<T> {
    return this.http.post<T>(this.url(path), body, { context });
  }

  postFile<T>(path: string, file: File, context?: HttpContext, headers?: HttpHeaders): Observable<T> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<T>(this.url(path), body, { context, headers });
  }

  delete<T>(path: string, context?: HttpContext, headers?: HttpHeaders): Observable<T> {
    return this.http.delete<T>(this.url(path), { context, headers });
  }

  download(path: string, params?: Params): Observable<Blob> {
    return this.http.get(this.url(path), { params: toParams(params), responseType: 'blob' });
  }
}

function toParams(params?: Params): HttpParams | undefined {
  if (!params) return undefined;
  let p = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') p = p.set(key, String(value));
  }
  return p;
}
