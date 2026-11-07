import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Account,
  AccountPortfolio,
  CapitalMarketAssumptions,
  ConfigOptions,
  ModelPortfolio,
  Position,
  SourceInfo,
} from '../models/account';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SourcesService {
  private readonly api = inject(ApiService);

  listSources(): Observable<SourceInfo[]> {
    return this.api.get<SourceInfo[]>('/sources');
  }

  listAccounts(source: string): Observable<Account[]> {
    return this.api.get<Account[]>(`/sources/${enc(source)}/accounts`);
  }

  listModels(source: string): Observable<ModelPortfolio[]> {
    return this.api.get<ModelPortfolio[]>(`/sources/${enc(source)}/models`);
  }

  getPortfolio(accountId: string, modelId?: string | null): Observable<AccountPortfolio> {
    return this.api.get<AccountPortfolio>(`/accounts/${enc(accountId)}/portfolio`, { model_id: modelId });
  }

  uploadPositions(source: string, accountId: string, file: File): Observable<Position[]> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.api.post<Position[]>(uploadPath(source, accountId), form);
  }

  resetPositions(source: string, accountId: string): Observable<{ reset: boolean }> {
    return this.api.delete<{ reset: boolean }>(uploadPath(source, accountId));
  }

  getCma(): Observable<CapitalMarketAssumptions> {
    return this.api.get<CapitalMarketAssumptions>('/config/cma');
  }

  getOptions(): Observable<ConfigOptions> {
    return this.api.get<ConfigOptions>('/config/options');
  }
}

const enc = encodeURIComponent;

function uploadPath(source: string, accountId: string): string {
  return `/sources/${enc(source)}/accounts/${enc(accountId)}/positions/upload`;
}
