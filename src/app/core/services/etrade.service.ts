import { HttpContext, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SKIP_ERROR_SNACKBAR } from '../interceptors/error.interceptor';
import { EtradeStatement } from '../models/etrade';
import { ApiService } from './api.service';

const SESSION_STORAGE_KEY = 'stochastix-etrade-statement-session';

@Injectable({ providedIn: 'root' })
export class EtradeService {
  private readonly api = inject(ApiService);
  private readonly context = new HttpContext().set(SKIP_ERROR_SNACKBAR, true);
  private readonly headers = new HttpHeaders({
    'X-Statement-Session': this.getOrCreateSessionId(),
  });

  getStatement(): Observable<EtradeStatement | null> {
    return this.api.get<EtradeStatement | null>('/etrade/statement', undefined, this.context, this.headers);
  }

  uploadStatement(file: File): Observable<EtradeStatement> {
    return this.api.postFile<EtradeStatement>('/etrade/statement/upload', file, this.context, this.headers);
  }

  clearStatement(): Observable<{ cleared: boolean }> {
    return this.api.delete<{ cleared: boolean }>('/etrade/statement', this.context, this.headers);
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
  }
}
