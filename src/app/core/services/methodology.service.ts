import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MethodologySection } from '../models/llm';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class MethodologyService {
  private readonly api = inject(ApiService);

  sections(): Observable<MethodologySection[]> {
    return this.api.get<MethodologySection[]>('/methodology');
  }
}
