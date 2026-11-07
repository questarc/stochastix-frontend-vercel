import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LlmProvider } from '../models/llm';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class LlmService {
  private readonly api = inject(ApiService);

  providers(): Observable<LlmProvider[]> {
    return this.api.get<LlmProvider[]>('/llm/providers');
  }
}
