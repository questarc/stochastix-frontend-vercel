import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ChatService } from './chat.service';
import { LlmService } from './llm.service';
import { MethodologyService } from './methodology.service';
import { OrdersService } from './orders.service';
import { RebalanceService } from './rebalance.service';
import { SimulationService } from './simulation.service';
import { SourcesService } from './sources.service';
import { VoiceService } from './voice.service';
import { AudioInfo } from '../models/chat';
import { EtradeService } from './etrade.service';
import { FidelityService } from './fidelity.service';
import { TimeSeriesService } from './time-series.service';

const API = environment.apiBaseUrl;
const SIM = { account_id: 'A1001', trials: 10000, seed: 42, sampling: 'prng', copula: 'gaussian', copula_df: 5 } as const;

describe('API services', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function expectCall(method: string, url: string, body?: unknown, response: object | null = {}) {
    const req = http.expectOne((r) => r.method === method && r.urlWithParams === url);
    if (body !== undefined) expect(req.request.body).toEqual(body);
    req.flush(response);
    return req;
  }

  it('SourcesService calls every source, portfolio and config endpoint', () => {
    const s = TestBed.inject(SourcesService);
    s.listSources().subscribe();
    expectCall('GET', `${API}/sources`, undefined, []);
    s.listAccounts('sales').subscribe();
    expectCall('GET', `${API}/sources/sales/accounts`, undefined, []);
    s.listModels('sales').subscribe();
    expectCall('GET', `${API}/sources/sales/models`, undefined, []);
    s.getPortfolio('A1001', 'MOD-60-40').subscribe();
    expectCall('GET', `${API}/accounts/A1001/portfolio?model_id=MOD-60-40`);
    s.getPortfolio('A1001').subscribe();
    expectCall('GET', `${API}/accounts/A1001/portfolio`);
    s.getCma().subscribe();
    expectCall('GET', `${API}/config/cma`);
    s.getOptions().subscribe();
    expectCall('GET', `${API}/config/options`);
  });

  it('SourcesService uploads and resets positions', () => {
    const s = TestBed.inject(SourcesService);
    const file = new File(['Qty'], 'positions.csv', { type: 'text/csv' });
    s.uploadPositions('positions', 'A2001', file).subscribe();
    const url = `${API}/sources/positions/accounts/A2001/positions/upload`;
    const req = expectCall('POST', url, undefined, []);
    expect(req.request.body instanceof FormData).toBe(true);
    expect((req.request.body as FormData).get('file')).toBeTruthy();
    s.resetPositions('positions', 'A2001').subscribe();
    expectCall('DELETE', url);
  });

  it('EtradeService loads, uploads and clears the in-memory statement', () => {
    const service = TestBed.inject(EtradeService);
    service.getStatement().subscribe();
    const getReq = expectCall('GET', `${API}/etrade/statement`, undefined, null);
    const sessionId = getReq.request.headers.get('X-Statement-Session');
    expect(sessionId?.length).toBe(36);

    const file = new File(['%PDF-test'], 'statement.pdf', { type: 'application/pdf' });
    service.uploadStatement(file).subscribe();
    const req = expectCall('POST', `${API}/etrade/statement/upload`, undefined, {
      filename: 'statement.pdf', page_count: 1, text: 'Statement', character_count: 9,
      imported_at: '2026-10-31T12:00:00+00:00',
      document_type: 'statement_text', transactions: [], summary: null,
    });
    expect(req.request.headers.get('X-Statement-Session')).toBe(sessionId);
    expect(req.request.body instanceof FormData).toBe(true);
    expect((req.request.body as FormData).get('file')).toBeTruthy();

    service.clearStatement().subscribe();
    const deleteReq = expectCall('DELETE', `${API}/etrade/statement`, undefined, { cleared: true });
    expect(deleteReq.request.headers.get('X-Statement-Session')).toBe(sessionId);
  });

  it('FidelityService uses its separate statement endpoints and session key', () => {
    const service = TestBed.inject(FidelityService);
    service.getStatement().subscribe();
    const getReq = expectCall('GET', `${API}/fidelity/statement`, undefined, null);
    const sessionId = getReq.request.headers.get('X-Statement-Session');
    expect(sessionId?.length).toBe(36);

    const file = new File(['%PDF-test'], 'fidelity.pdf', { type: 'application/pdf' });
    service.uploadStatement(file).subscribe();
    const uploadReq = expectCall('POST', `${API}/fidelity/statement/upload`, undefined, {
      filename: 'Fidelity statement', page_count: 1, text: '', character_count: 0,
      imported_at: '2026-10-31T12:00:00+00:00',
      document_type: 'statement_text', transactions: [], summary: null,
    });
    expect(uploadReq.request.headers.get('X-Statement-Session')).toBe(sessionId);
    expect((uploadReq.request.body as FormData).get('file')).toBeTruthy();

    service.clearStatement().subscribe();
    const deleteReq = expectCall('DELETE', `${API}/fidelity/statement`, undefined, { cleared: true });
    expect(deleteReq.request.headers.get('X-Statement-Session')).toBe(sessionId);

    service.getPositionsCsv().subscribe();
    const positionsReq = expectCall('GET', `${API}/fidelity/positions`, undefined, null);
    expect(positionsReq.request.headers.get('X-Statement-Session')).toBe(sessionId);

    const csv = new File(['Symbol,Description'], 'positions.csv', { type: 'text/csv' });
    service.uploadPositionsCsv(csv).subscribe();
    const csvReq = expectCall('POST', `${API}/fidelity/positions/upload`, undefined, []);
    expect(csvReq.request.headers.get('X-Statement-Session')).toBe(sessionId);
    expect((csvReq.request.body as FormData).get('file')).toBeTruthy();

    service.clearPositionsCsv().subscribe();
    const clearCsvReq = expectCall('DELETE', `${API}/fidelity/positions`, undefined, { cleared: true });
    expect(clearCsvReq.request.headers.get('X-Statement-Session')).toBe(sessionId);
  });

  it('TimeSeriesService previews CSV metadata and submits model settings with the file', () => {
    const service = TestBed.inject(TimeSeriesService);
    service.sampleCsv().subscribe((file) => expect(file.name).toBe('time-series-sample.csv'));
    const sampleReq = http.expectOne('/time-series-sample.csv');
    expect(sampleReq.request.method).toBe('GET');
    sampleReq.flush(new Blob(['Date,Asset,Macro'], { type: 'text/csv' }));

    const file = new File(['Date,Asset,Macro'], 'history.csv', { type: 'text/csv' });
    service.preview(file).subscribe();
    const preview = expectCall('POST', `${API}/time-series/preview`, undefined, {
      columns: ['Date', 'Asset', 'Macro'],
      date_columns: ['Date'],
      numeric_columns: ['Asset', 'Macro'],
      row_count: 100,
    });
    expect((preview.request.body as FormData).get('file')).toBeTruthy();

    service.analyze(file, {
      dateColumn: 'Date',
      targetColumn: 'Asset',
      predictorColumns: ['Macro'],
      horizonPeriods: 5,
      modelType: 'logistic',
    }).subscribe();
    const request = expectCall('POST', `${API}/time-series/analyze`, undefined, {
      model_type: 'logistic',
      target_description: 'probability of a positive 5-observation forward return',
      observations: 99,
      training_observations: 79,
      test_observations: 20,
      metrics: {},
      coefficients: [],
      test_series: [],
    });
    const body = request.request.body as FormData;
    expect(body.get('file')).toBeTruthy();
    expect(body.get('date_column')).toBe('Date');
    expect(body.get('target_column')).toBe('Asset');
    expect(body.getAll('predictor_columns')).toEqual(['Macro']);
    expect(body.get('horizon_periods')).toBe('5');
    expect(body.get('model_type')).toBe('logistic');
  });

  it('SimulationService posts the request', () => {
    TestBed.inject(SimulationService).run(SIM).subscribe();
    expectCall('POST', `${API}/simulations`, SIM);
  });

  it('RebalanceService gets settings and posts proposals', () => {
    const s = TestBed.inject(RebalanceService);
    s.settings().subscribe();
    expectCall('GET', `${API}/rebalance/settings`);
    const body = { account_id: 'A1001', drift_tolerance: 0.02, simulation: SIM };
    s.propose(body).subscribe();
    expectCall('POST', `${API}/rebalance/proposal`, body);
  });

  it('OrdersService covers generate, list, clear and export', () => {
    const s = TestBed.inject(OrdersService);
    s.generate({ account_id: 'A1001' }).subscribe();
    expectCall('POST', `${API}/orders/generate`, { account_id: 'A1001' }, []);
    s.list().subscribe();
    expectCall('GET', `${API}/orders`, undefined, []);
    s.clear().subscribe();
    expectCall('DELETE', `${API}/orders`);
    s.export('csv').subscribe();
    const req = http.expectOne(`${API}/orders/export?format=csv`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['order_id']));
  });

  it('MethodologyService and LlmService load their lists', () => {
    TestBed.inject(MethodologyService).sections().subscribe();
    expectCall('GET', `${API}/methodology`, undefined, []);
    TestBed.inject(LlmService).providers().subscribe();
    expectCall('GET', `${API}/llm/providers`, undefined, []);
  });

  it('ChatService sends messages and resets threads', () => {
    const s = TestBed.inject(ChatService);
    const body = { message: 'hi', thread_id: 't1', provider: 'ollama', model: 'qwen2.5:7b', account_id: 'A1001' };
    s.send(body).subscribe();
    expectCall('POST', `${API}/chat`, body, { text: 'ok', tool_calls: [], orders_added: 0, orders: [] });
    s.reset('t1').subscribe();
    expectCall('DELETE', `${API}/chat/t1`);
  });

  it('VoiceService creates audio and builds play/download URLs', () => {
    const s = TestBed.inject(VoiceService);
    s.create('Success is 76.8%.', 'A1001').subscribe();
    expectCall('POST', `${API}/voice`, { text: 'Success is 76.8%.', account_id: 'A1001' });
    const audio = { url: '/voice/abc' } as AudioInfo;
    expect(s.playUrl(audio)).toBe(`${API}/voice/abc`);
    expect(s.downloadUrl(audio)).toBe(`${API}/voice/abc?download=true`);
  });

});
