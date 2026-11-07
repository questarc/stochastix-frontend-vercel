import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SKIP_ERROR_SNACKBAR } from '../interceptors/error.interceptor';
import { TimeSeriesCsvPreview, TimeSeriesRegressionResult } from '../models/time-series';
import { ApiService } from './api.service';

export interface TimeSeriesAnalysisOptions {
  dateColumn: string;
  targetColumn: string;
  predictorColumns: string[];
  horizonPeriods: number;
  modelType: 'linear' | 'logistic';
}

@Injectable({ providedIn: 'root' })
export class TimeSeriesService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly context = new HttpContext().set(SKIP_ERROR_SNACKBAR, true);

  sampleCsv(): Observable<File> {
    return this.http.get('/time-series-sample.csv', { responseType: 'blob' }).pipe(
      map((content) => new File([content], 'time-series-sample.csv', { type: 'text/csv' })),
    );
  }

  preview(file: File): Observable<TimeSeriesCsvPreview> {
    return this.api.postFile<TimeSeriesCsvPreview>('/time-series/preview', file, this.context);
  }

  analyze(file: File, options: TimeSeriesAnalysisOptions): Observable<TimeSeriesRegressionResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('date_column', options.dateColumn);
    form.append('target_column', options.targetColumn);
    options.predictorColumns.forEach((column) => form.append('predictor_columns', column));
    form.append('horizon_periods', String(options.horizonPeriods));
    form.append('model_type', options.modelType);
    return this.api.post<TimeSeriesRegressionResult>('/time-series/analyze', form, this.context);
  }
}
