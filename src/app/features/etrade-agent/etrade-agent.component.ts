import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EtradeService } from '../../core/services/etrade.service';
import { BrokerStatementComponent } from '../broker-statement/broker-statement.component';

@Component({
  selector: 'app-etrade-agent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrokerStatementComponent],
  template: `<app-broker-statement brokerName="E*TRADE" [api]="statementApi" />`,
})
export class EtradeAgentComponent {
  protected readonly statementApi = inject(EtradeService);
}
