import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SimulationRequest, SimulationResponse } from '../models/simulation';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SimulationService {
  private readonly api = inject(ApiService);

  run(request: SimulationRequest, context?: HttpContext): Observable<SimulationResponse> {
    return this.api.post<SimulationResponse>('/simulations', request, context);
  }
}
