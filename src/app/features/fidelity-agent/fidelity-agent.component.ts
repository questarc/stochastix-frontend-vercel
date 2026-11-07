import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FidelityService } from '../../core/services/fidelity.service';
import { BrokerStatementComponent } from '../broker-statement/broker-statement.component';

@Component({
  selector: 'app-fidelity-agent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrokerStatementComponent],
  template: `<app-broker-statement brokerName="Fidelity" [api]="statementApi" />`,
})
export class FidelityAgentComponent {
  protected readonly statementApi = inject(FidelityService);
}
