import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { RunSettings } from '../../core/models/simulation';

@Component({
  selector: 'app-run-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatExpansionModule, JsonPipe],
  template: `
    <mat-expansion-panel>
      <mat-expansion-panel-header>
        <mat-panel-title>Run settings (for audit and reproduction)</mat-panel-title>
      </mat-expansion-panel-header>
      <pre>{{ settings() | json }}</pre>
    </mat-expansion-panel>
  `,
  styles: `pre { margin: 0; font-size: 0.85rem; white-space: pre-wrap; }`,
})
export class RunSettingsComponent {
  readonly settings = input.required<RunSettings>();
}
