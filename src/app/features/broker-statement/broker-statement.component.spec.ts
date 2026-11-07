import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FidelityCsvPosition } from '../../core/models/etrade';
import { BrokerStatementApi, BrokerStatementComponent } from './broker-statement.component';

describe('BrokerStatementComponent Fidelity positions analytics', () => {
  it('calculates portfolio totals and renders allocation and gain/loss charts', async () => {
    const positions: FidelityCsvPosition[] = [
      {
        symbol: 'SPAXX',
        description: 'HELD IN MONEY MARKET',
        quantity: 200,
        last_price: 1,
        last_price_change: 0,
        current_value: 200,
        todays_gain_loss_dollar: null,
        todays_gain_loss_percent: null,
        total_gain_loss_dollar: null,
        total_gain_loss_percent: null,
        percent_of_account: 20,
        cost_basis_total: null,
        average_cost_basis: null,
        type: 'Cash',
      },
      {
        symbol: 'TEST',
        description: 'Example holding',
        quantity: 8,
        last_price: 100,
        last_price_change: -1,
        current_value: 800,
        todays_gain_loss_dollar: -10,
        todays_gain_loss_percent: -1.23,
        total_gain_loss_dollar: 200,
        total_gain_loss_percent: 33.33,
        percent_of_account: 80,
        cost_basis_total: 600,
        average_cost_basis: 75,
        type: 'Cash',
      },
    ];
    const api: BrokerStatementApi = {
      getStatement: () => of(null),
      uploadStatement: () => of(),
      clearStatement: () => of({ cleared: true }),
      getPositionsCsv: () => of(positions),
      uploadPositionsCsv: () => of(positions),
      clearPositionsCsv: () => of({ cleared: true }),
    };

    TestBed.configureTestingModule({ imports: [BrokerStatementComponent] });
    const fixture = TestBed.createComponent(BrokerStatementComponent);
    fixture.componentRef.setInput('brokerName', 'Fidelity');
    fixture.componentRef.setInput('api', api);
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.portfolio-analytics')?.textContent).toContain('$1,000.00');
    expect(element.querySelector('.portfolio-analytics')?.textContent).toContain('$600.00');
    expect(element.querySelector('.portfolio-analytics')?.textContent).toContain('$200.00');
    expect(element.querySelector('.portfolio-analytics')?.textContent).toContain('33.33%');
    expect(element.querySelectorAll('.chart-panel')).toHaveLength(2);
    expect(element.querySelector('[aria-label="Portfolio allocation by holding"]')).not.toBeNull();
    expect(element.querySelector('[aria-label="Total gain or loss by holding"]')).not.toBeNull();
  });
});
