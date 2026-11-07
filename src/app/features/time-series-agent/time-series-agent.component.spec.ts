import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TimeSeriesService } from '../../core/services/time-series.service';
import { TimeSeriesAgentComponent } from './time-series-agent.component';

describe('TimeSeriesAgentComponent', () => {
  it('loads the sample dataset by default and preserves download and upload controls', async () => {
    const sample = new File(['Date,Asset,Macro'], 'time-series-sample.csv', { type: 'text/csv' });
    const service = {
      sampleCsv: vi.fn(() => of(sample)),
      preview: vi.fn(() =>
        of({
          columns: ['Date', 'Asset', 'Macro'],
          date_columns: ['Date'],
          numeric_columns: ['Asset', 'Macro'],
          row_count: 120,
        }),
      ),
      analyze: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [TimeSeriesAgentComponent],
      providers: [{ provide: TimeSeriesService, useValue: service }],
    });

    const fixture = TestBed.createComponent(TimeSeriesAgentComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(service.sampleCsv).toHaveBeenCalledOnce();
    expect(service.preview).toHaveBeenCalledWith(sample);
    expect(element.querySelector('.file-meta')?.textContent).toContain('time-series-sample.csv');
    expect(element.querySelector('.file-meta')?.textContent).toContain('120 rows');
    expect(element.querySelector('a[download="time-series-sample.csv"]')).not.toBeNull();
    expect(element.querySelector('input[type="file"][accept=".csv,text/csv"]')).not.toBeNull();
    expect(element.querySelector('select')?.value).toBe('Date');
    expect(element.textContent).toContain('Macro');
  });
});
