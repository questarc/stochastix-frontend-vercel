import { ChangeDetectionStrategy, Component, OnInit, computed, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { errorDetail } from '../../core/interceptors/error.interceptor';
import { EtradeStatement, FidelityCsvPosition } from '../../core/models/etrade';
import { PlotlyChartComponent } from '../../shared/plotly-chart.component';

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_CSV_BYTES = 20 * 1024 * 1024;

interface FidelityPositionAnalytics {
  totalValue: number;
  totalCostBasis: number | null;
  todaysGainLoss: number | null;
  todaysGainLossPercent: number | null;
  totalGainLoss: number | null;
  totalGainLossPercent: number | null;
  allocationChart: unknown[];
  gainLossChart: unknown[];
}

export interface BrokerStatementApi {
  getStatement(): Observable<EtradeStatement | null>;
  uploadStatement(file: File): Observable<EtradeStatement>;
  clearStatement(): Observable<{ cleared: boolean }>;
  getPositionsCsv?(): Observable<FidelityCsvPosition[] | null>;
  uploadPositionsCsv?(file: File): Observable<FidelityCsvPosition[]>;
  clearPositionsCsv?(): Observable<{ cleared: boolean }>;
}

@Component({
  selector: 'app-broker-statement',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatButtonModule, MatIconModule, PlotlyChartComponent],
  template: `
    <header class="page-heading">
      <p class="eyebrow">BROKERAGE STATEMENTS</p>
      <h1>{{ brokerName() }} Agent</h1>
      <p class="description">
        View-only statement analytics. No brokerage transactions or account changes are submitted.
      </p>
    </header>

    <section class="reader" aria-labelledby="reader-heading">
      <aside class="privacy-note" aria-label="Privacy and data handling">
        <strong>Privacy:</strong> The original PDF and unredacted text are processed temporarily in memory and are not
        written to disk or a database. Personal names, SSNs, passwords, addresses, and account numbers are excluded.
        Requested security names, symbols, and transaction descriptions are included in recognized Fidelity Activity
        rows; only those parsed fields and numeric metrics are retained in backend memory for this browser session.
        Clear the statement when finished.
        Automatic protection cannot
        guarantee that every sensitive value in an uploaded document is identified. Use only in a trusted environment.
      </aside>
      <div class="reader-heading">
        <div>
          <h2 id="reader-heading">{{ brokerName() }} statement reader</h2>
          <p>
            Text-based PDFs only. Scanned/image-only and password-protected PDFs are not supported.
          </p>
        </div>
        <div class="actions">
          <input #pdfInput type="file" accept="application/pdf,.pdf" hidden
                 [attr.aria-label]="'Choose a ' + brokerName() + ' statement PDF'" (change)="onFile($event)" />
          <input #csvInput type="file" accept=".csv,text/csv" hidden
                 aria-label="Choose a Fidelity positions CSV" (change)="onPositionsCsvFile($event)" />
          <button mat-flat-button type="button" [disabled]="loading()" (click)="pdfInput.click()">
            <mat-icon>upload_file</mat-icon>
            {{ loading() ? 'Reading PDF…' : 'Load statement PDF' }}
          </button>
          @if (api().uploadPositionsCsv) {
            <button mat-stroked-button type="button" [disabled]="positionsLoading()" (click)="csvInput.click()">
              <mat-icon>table_view</mat-icon>
              {{ positionsLoading() ? 'Reading CSV…' : 'Load positions CSV' }}
            </button>
          }
          @if (statement()) {
            <button mat-stroked-button type="button" [disabled]="loading()" (click)="clearStatement()">
              Clear statement
            </button>
          }
        </div>
      </div>

      <p class="hint">
        PDF only · Maximum 20 MB · Password-protected and scanned PDFs are not supported
        @if (api().uploadPositionsCsv) { · Fidelity positions CSV also supported · Maximum 20 MB }
      </p>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      @if (statement(); as current) {
        <div class="document-meta" aria-live="polite">
          <strong>{{ current.filename }}</strong>
          <span>{{ current.page_count }} pages</span>
          <span>{{ current.character_count.toLocaleString() }} characters in redacted preview</span>
          <span>Loaded {{ current.imported_at | date:'medium' }}</span>
        </div>
        @if (current.document_type === 'transfer_activity' && current.summary; as summary) {
          <section class="analytics" aria-labelledby="analytics-heading">
            <h3 id="analytics-heading">Transfer activity summary</h3>
            <p class="notice">
              This PDF contains transfer activity, not a holdings statement. These cash movement totals do not
              represent portfolio value or investment performance.
            </p>
            <div class="metrics">
              <article class="metric"><span>Transfers listed</span><strong>{{ summary.transaction_count }}</strong></article>
              <article class="metric"><span>Total listed</span><strong>{{ currency(summary.total_amount) }}</strong></article>
              <article class="metric"><span>Completed</span><strong>{{ currency(summary.completed_amount) }}</strong></article>
              <article class="metric"><span>Scheduled</span><strong>{{ currency(summary.scheduled_amount) }}</strong></article>
            </div>
            @if (current.transactions.length) {
              <div class="table-wrap">
                <table>
                  <caption>Transfers identified in the PDF</caption>
                  <thead><tr><th>Date</th><th>Activity</th><th>Status</th><th class="amount">Amount</th></tr></thead>
                  <tbody>
                    @for (transaction of current.transactions; track $index) {
                      <tr>
                        <td>{{ transaction.date | date:'mediumDate' }}</td>
                        <td>{{ transaction.type }}</td>
                        <td>{{ transaction.status }}</td>
                        <td class="amount">{{ currency(transaction.amount) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        } @else if (current.document_type === 'portfolio_summary' && current.portfolio_summary; as summary) {
          <section class="analytics" aria-labelledby="analytics-heading">
            <h3 id="analytics-heading">Portfolio summary</h3>
            @if (summary.statement_period) {
              <p class="notice">Statement period: {{ summary.statement_period }}</p>
            }
            <p class="notice">
              These are amounts explicitly labeled in the statement. A reported change is not a time-weighted or
              money-weighted investment return; deposits, withdrawals, and other activity may affect it.
            </p>
            <div class="metrics">
              @if (summary.beginning_value !== null) {
                <article class="metric"><span>Beginning value</span><strong>{{ currency(summary.beginning_value) }}</strong></article>
              }
              @if (summary.ending_value !== null) {
                <article class="metric"><span>Portfolio value</span><strong>{{ currency(summary.ending_value) }}</strong></article>
              }
              @if (summary.reported_change !== null) {
                <article class="metric"><span>Portfolio change from last period</span><strong>{{ currency(summary.reported_change) }}</strong></article>
              }
              @if (summary.total_including_other_holdings != null) {
                <article class="metric"><span>Total including other holdings</span><strong>{{ currency(summary.total_including_other_holdings) }}</strong></article>
              }
              @if (summary.income_this_period != null) {
                <article class="metric"><span>Income this period</span><strong>{{ currency(summary.income_this_period) }}</strong></article>
              }
              @if (summary.income_year_to_date != null) {
                <article class="metric"><span>Income year-to-date</span><strong>{{ currency(summary.income_year_to_date) }}</strong></article>
              }
              @if (summary.top_holdings_value != null) {
                <article class="metric"><span>Top holdings total value</span><strong>{{ currency(summary.top_holdings_value) }}</strong></article>
              }
              @if (summary.top_holdings_percent != null) {
                <article class="metric"><span>Top holdings percent of portfolio</span><strong>{{ summary.top_holdings_percent }}%</strong></article>
              }
            </div>
          </section>
          @for (account of current.account_summaries ?? []; track $index) {
            <section class="analytics" [attr.aria-labelledby]="'account-summary-heading-' + $index">
              <h3 [id]="'account-summary-heading-' + $index">Account summary {{ $index + 1 }}</h3>
              <p class="notice">
                Account names and numbers are excluded. Values below are explicitly labeled in the statement;
                reported changes are not investment returns.
              </p>
              <div class="metrics">
                @if (account.account_value != null) {
                  <article class="metric"><span>Account value</span><strong>{{ currency(account.account_value) }}</strong></article>
                }
                @if (account.change_in_account_value != null) {
                  <article class="metric"><span>Change in account value</span><strong>{{ currency(account.change_in_account_value) }}</strong></article>
                }
                @if (account.beginning_value != null) {
                  <article class="metric"><span>Beginning account value</span><strong>{{ currency(account.beginning_value) }}</strong></article>
                }
                @if (account.additions != null) {
                  <article class="metric"><span>Additions</span><strong>{{ currency(account.additions) }}</strong></article>
                }
                @if (account.subtractions != null) {
                  <article class="metric"><span>Subtractions</span><strong>{{ currency(account.subtractions) }}</strong></article>
                }
                @if (account.transaction_costs != null) {
                  <article class="metric"><span>Transaction costs, fees and charges</span><strong>{{ currency(account.transaction_costs) }}</strong></article>
                }
                @if (account.investment_change != null) {
                  <article class="metric"><span>Change in investment value</span><strong>{{ currency(account.investment_change) }}</strong></article>
                }
                @if (account.ending_value != null) {
                  <article class="metric"><span>Ending account value</span><strong>{{ currency(account.ending_value) }}</strong></article>
                }
                @if (account.accrued_interest != null) {
                  <article class="metric"><span>Accrued interest</span><strong>{{ currency(account.accrued_interest) }}</strong></article>
                }
                @if (account.top_holdings_value != null) {
                  <article class="metric"><span>Top holdings total value</span><strong>{{ currency(account.top_holdings_value) }}</strong></article>
                }
                @if (account.top_holdings_percent != null) {
                  <article class="metric"><span>Top holdings percent of account</span><strong>{{ account.top_holdings_percent }}%</strong></article>
                }
                @if (account.income_this_period != null) {
                  <article class="metric"><span>Income this period</span><strong>{{ currency(account.income_this_period) }}</strong></article>
                }
                @if (account.income_year_to_date != null) {
                  <article class="metric"><span>Income year-to-date</span><strong>{{ currency(account.income_year_to_date) }}</strong></article>
                }
              </div>
            </section>
          }
          @if (current.holdings?.length) {
            <section class="analytics" aria-labelledby="holdings-heading">
              <h3 id="holdings-heading">Holdings</h3>
              <p class="notice">
                Holdings are shown as anonymous rows; names and ticker symbols are not displayed or retained.
                Figures follow the statement’s reported columns.
              </p>
              <div class="table-wrap">
                <table>
                  <caption>Anonymous holding values</caption>
                  <thead>
                    <tr>
                      <th>Holding</th>
                      <th class="amount">Beginning market value</th>
                      <th class="amount">Quantity</th>
                      <th class="amount">Price per unit</th>
                      <th class="amount">Ending market value</th>
                      <th class="amount">Total cost basis</th>
                      <th class="amount">Unrealized gain/loss</th>
                      <th class="amount">EAI ($)</th>
                      <th class="amount">EY (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (holding of current.holdings; track $index) {
                      <tr>
                        <td>{{ $index + 1 }}</td>
                        <td class="amount">{{ holding.beginning_market_value == null ? '—' : currency(holding.beginning_market_value) }}</td>
                        <td class="amount">{{ holding.quantity == null ? '—' : number(holding.quantity, 3) }}</td>
                        <td class="amount">{{ holding.price_per_unit == null ? '—' : currency(holding.price_per_unit, 4) }}</td>
                        <td class="amount">{{ holding.ending_market_value == null ? '—' : currency(holding.ending_market_value) }}</td>
                        <td class="amount">{{ holding.cost_basis == null ? '—' : currency(holding.cost_basis) }}</td>
                        <td class="amount">{{ holding.unrealized_gain_loss == null ? '—' : currency(holding.unrealized_gain_loss) }}</td>
                        <td class="amount">{{ holding.estimated_annual_income == null ? '—' : currency(holding.estimated_annual_income) }}</td>
                        <td class="amount">{{ holding.estimated_yield_percent == null ? '—' : number(holding.estimated_yield_percent, 3) + '%' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }
          @if (current.activity_transactions?.length) {
            <section class="analytics" aria-labelledby="activity-heading">
              <h3 id="activity-heading">Activity — transaction history</h3>
              <p class="notice">
                Settlement date, security, and transaction details come from the statement. Personal and account
                identifiers are excluded.
              </p>
              <div class="table-wrap">
                <table>
                  <caption>Fidelity activity transactions</caption>
                  <thead>
                    <tr>
                      <th>Settlement date</th>
                      <th>Security name</th>
                      <th>Symbol/CUSIP</th>
                      <th>Description</th>
                      <th class="amount">Quantity</th>
                      <th class="amount">Price</th>
                      <th class="amount">Total cost basis</th>
                      <th class="amount">Transaction cost</th>
                      <th class="amount">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (transaction of current.activity_transactions; track $index) {
                      <tr>
                        <td>{{ transaction.settlement_date | date:'mediumDate' }}</td>
                        <td>{{ transaction.security_name ?? '—' }}</td>
                        <td>{{ transaction.symbol_cusip ?? '—' }}</td>
                        <td>{{ transaction.description ?? '—' }}</td>
                        <td class="amount">{{ transaction.quantity == null ? '—' : number(transaction.quantity, 4) }}</td>
                        <td class="amount">{{ transaction.price == null ? '—' : currency(transaction.price, 4) }}</td>
                        <td class="amount">{{ transaction.total_cost_basis == null ? '—' : currency(transaction.total_cost_basis) }}</td>
                        <td class="amount">{{ transaction.transaction_cost == null ? '—' : currency(transaction.transaction_cost) }}</td>
                        <td class="amount">{{ transaction.amount == null ? '—' : currency(transaction.amount) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }
          <p class="disclaimer">
            Allocation and investment-return analytics are not calculated. Check all figures against the original
            statement.
          </p>
        } @else {
          @if (current.document_type === 'statement_structure') {
            <p class="disclaimer">
              This format isn’t recognized yet. The preview below contains statement section/column labels only;
              names, account details, and financial values have been replaced. Copy and share this sanitized preview
              so the parser can be tailored to the format. No holdings analytics are calculated yet.
            </p>
          } @else {
            <p class="disclaimer">
              Text was extracted, but this document type does not yet have structured holdings or transaction analytics.
              Check the original statement before relying on any figures.
            </p>
          }
        }
        @if (current.text) {
          <details class="raw-text">
            <summary>
              {{ current.document_type === 'statement_structure' ? 'Show sanitized statement layout to share' : 'Show redacted preview (source and destination account details excluded)' }}
            </summary>
            <label class="sr-only" for="statement-text">Sanitized statement preview</label>
            <textarea id="statement-text" class="statement-text" readonly spellcheck="false"
                      [value]="current.text" aria-label="Sanitized statement preview"></textarea>
          </details>
        }
      } @else {
        <div class="empty-state">
          <mat-icon aria-hidden="true">picture_as_pdf</mat-icon>
          <p>No statement loaded. Choose a PDF to extract its searchable text.</p>
        </div>
      }
      @if (positionsCsv(); as positions) {
        <section class="analytics" aria-labelledby="fidelity-csv-positions-heading">
          <div class="reader-heading">
            <div>
              <h3 id="fidelity-csv-positions-heading">Fidelity positions CSV ({{ positions.length }})</h3>
              <p class="notice">
                Account numbers and account names are excluded. Rows without a symbol, including pending activity,
                are omitted.
              </p>
            </div>
            @if (api().clearPositionsCsv) {
              <button mat-stroked-button type="button" [disabled]="positionsLoading()" (click)="clearPositionsCsv()">
                Clear positions CSV
              </button>
            }
          </div>
          @if (positionAnalytics(); as analytics) {
            <section class="portfolio-analytics" aria-labelledby="positions-analytics-heading">
              <h4 id="positions-analytics-heading">Portfolio analytics</h4>
              <p class="notice">
                Totals are calculated from available CSV values; missing fields are excluded. Return percentages are
                aggregate gain/loss divided by the corresponding available cost basis or estimated starting value.
                These are not time-weighted investment returns.
              </p>
              <div class="metrics">
                <article class="metric">
                  <span>Total market value</span>
                  <strong>{{ currency(analytics.totalValue) }}</strong>
                </article>
                <article class="metric">
                  <span>Positions</span>
                  <strong>{{ positions.length }}</strong>
                </article>
                @if (analytics.totalCostBasis !== null) {
                  <article class="metric">
                    <span>Available cost basis</span>
                    <strong>{{ currency(analytics.totalCostBasis) }}</strong>
                  </article>
                }
                @if (analytics.todaysGainLoss !== null) {
                  <article class="metric" [class.negative]="analytics.todaysGainLoss < 0">
                    <span>Today's gain/loss</span>
                    <strong>{{ currency(analytics.todaysGainLoss) }}</strong>
                    @if (analytics.todaysGainLossPercent !== null) {
                      <small>{{ number(analytics.todaysGainLossPercent, 2) }}% estimated</small>
                    }
                  </article>
                }
                @if (analytics.totalGainLoss !== null) {
                  <article class="metric" [class.negative]="analytics.totalGainLoss < 0">
                    <span>Total gain/loss</span>
                    <strong>{{ currency(analytics.totalGainLoss) }}</strong>
                    @if (analytics.totalGainLossPercent !== null) {
                      <small>{{ number(analytics.totalGainLossPercent, 2) }}% on available basis</small>
                    }
                  </article>
                }
              </div>
              <div class="chart-grid">
                <article class="chart-panel">
                  <h5>Portfolio allocation</h5>
                  <p class="notice">Current market value by holding; smaller holdings are grouped as Other.</p>
                  <app-plotly-chart
                    [data]="analytics.allocationChart"
                    [layout]="allocationLayout"
                    [height]="320"
                    ariaLabel="Portfolio allocation by holding"
                  />
                </article>
                @if (analytics.gainLossChart.length) {
                  <article class="chart-panel">
                    <h5>Total gain/loss by holding</h5>
                    <p class="notice">Largest absolute reported gain/loss values.</p>
                    <app-plotly-chart
                      [data]="analytics.gainLossChart"
                      [layout]="gainLossLayout"
                      [height]="320"
                      ariaLabel="Total gain or loss by holding"
                    />
                  </article>
                }
              </div>
            </section>
          }
          <div class="table-wrap">
            <table>
              <caption>Fidelity positions imported from CSV</caption>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Description</th>
                  <th class="amount">Quantity</th>
                  <th class="amount">Last price</th>
                  <th class="amount">Last price change</th>
                  <th class="amount">Current value</th>
                  <th class="amount">Today gain/loss ($)</th>
                  <th class="amount">Today gain/loss (%)</th>
                  <th class="amount">Total gain/loss ($)</th>
                  <th class="amount">Total gain/loss (%)</th>
                  <th class="amount">Percent of account</th>
                  <th class="amount">Cost basis total</th>
                  <th class="amount">Average cost basis</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                @for (position of positions; track $index) {
                  <tr>
                    <td>{{ position.symbol }}</td>
                    <td>{{ position.description }}</td>
                    <td class="amount">{{ position.quantity == null ? '—' : number(position.quantity, 4) }}</td>
                    <td class="amount">{{ position.last_price == null ? '—' : currency(position.last_price, 4) }}</td>
                    <td class="amount">{{ position.last_price_change == null ? '—' : currency(position.last_price_change, 4) }}</td>
                    <td class="amount">{{ position.current_value == null ? '—' : currency(position.current_value) }}</td>
                    <td class="amount">{{ position.todays_gain_loss_dollar == null ? '—' : currency(position.todays_gain_loss_dollar) }}</td>
                    <td class="amount">{{ position.todays_gain_loss_percent == null ? '—' : number(position.todays_gain_loss_percent, 2) + '%' }}</td>
                    <td class="amount">{{ position.total_gain_loss_dollar == null ? '—' : currency(position.total_gain_loss_dollar) }}</td>
                    <td class="amount">{{ position.total_gain_loss_percent == null ? '—' : number(position.total_gain_loss_percent, 2) + '%' }}</td>
                    <td class="amount">{{ position.percent_of_account == null ? '—' : number(position.percent_of_account, 2) + '%' }}</td>
                    <td class="amount">{{ position.cost_basis_total == null ? '—' : currency(position.cost_basis_total) }}</td>
                    <td class="amount">{{ position.average_cost_basis == null ? '—' : currency(position.average_cost_basis, 4) }}</td>
                    <td>{{ position.type ?? '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .page-heading { margin: 0 0 1.5rem; }
    .eyebrow { margin: 0 0 0.25rem; color: var(--app-accent); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; }
    h1 { margin: 0; font-size: clamp(1.8rem, 3vw, 2.5rem); line-height: 1.2; }
    .description { margin: 0.5rem 0 0; color: var(--app-muted); }
    .reader { padding: 1.25rem; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-panel-solid); }
    .reader-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    h2 { margin: 0; font-size: 1.25rem; }
    .reader-heading p, .hint, .disclaimer { color: var(--app-muted); font-size: 0.88rem; }
    .reader-heading p { margin: 0.35rem 0 0; }
    .privacy-note { margin-bottom: 1.25rem; padding: 1rem; border: 1px solid var(--app-border); border-left: 3px solid var(--app-accent); border-radius: 8px; background: var(--app-panel); color: var(--app-muted); font-size: 0.88rem; line-height: 1.55; }
    .privacy-note strong { color: var(--app-text); }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .actions mat-icon { margin-right: 0.25rem; }
    .hint { margin: 0.8rem 0 1rem; }
    .error { padding: 0.75rem; color: #fecaca; border: 1px solid #7f1d1d; border-radius: 6px; background: #450a0a; }
    .document-meta { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; margin-bottom: 0.75rem; color: var(--app-muted); font-size: 0.85rem; }
    .document-meta strong { color: var(--app-text); }
    .analytics { margin: 1.5rem 0; }
    .analytics h3 { margin: 0 0 0.4rem; }
    .portfolio-analytics { margin: 1rem 0 1.5rem; padding: 1rem; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-panel); }
    .portfolio-analytics h4 { margin: 0; font-size: 1.05rem; }
    .chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr)); gap: 1rem; }
    .chart-panel { min-width: 0; padding: 0.75rem; border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-panel-solid); }
    .chart-panel h5 { margin: 0; font-size: 0.95rem; }
    .notice { color: var(--app-muted); font-size: 0.9rem; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin: 1rem 0; }
    .metric { display: flex; flex-direction: column; gap: 0.4rem; padding: 1rem; border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-panel); }
    .metric span { color: var(--app-muted); font-size: 0.82rem; }
    .metric strong { font-size: 1.25rem; }
    .metric small { color: var(--app-muted); }
    .metric.negative strong { color: #fca5a5; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    caption { padding: 0.5rem 0; text-align: left; font-weight: 600; }
    th, td { padding: 0.65rem; border-bottom: 1px solid var(--app-border); text-align: left; }
    th { color: var(--app-muted); font-size: 0.82rem; }
    .amount { text-align: right; white-space: nowrap; }
    .raw-text { margin-top: 1.5rem; }
    .raw-text summary { color: var(--app-muted); cursor: pointer; }
    .statement-text { box-sizing: border-box; width: 100%; min-height: 60vh; padding: 1rem; resize: vertical; color: var(--app-text); border: 1px solid var(--app-border); border-radius: 8px; background: #08111f; font: 0.85rem/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; white-space: pre; }
    .disclaimer { margin: 0.75rem 0 0; }
    .empty-state { display: grid; justify-items: center; padding: 3rem 1rem; color: var(--app-muted); text-align: center; }
    .empty-state mat-icon { width: 2rem; height: 2rem; font-size: 2rem; color: var(--app-accent); }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    @media (max-width: 700px) { .reader-heading { flex-direction: column; } .reader { padding: 1rem; } }
  `,
})
export class BrokerStatementComponent implements OnInit {
  readonly brokerName = input.required<string>();
  readonly api = input.required<BrokerStatementApi>();
  protected readonly statement = signal<EtradeStatement | null>(null);
  protected readonly loading = signal(false);
  protected readonly positionsLoading = signal(false);
  protected readonly positionsCsv = signal<FidelityCsvPosition[] | null>(null);
  protected readonly error = signal('');
  protected readonly allocationLayout = {
    margin: { l: 10, r: 10, t: 10, b: 35 },
    legend: { orientation: 'h', y: -0.15 },
  };
  protected readonly gainLossLayout = {
    margin: { l: 100, r: 20, t: 10, b: 40 },
    xaxis: { title: { text: 'Gain/loss ($)' }, zeroline: true },
    yaxis: { automargin: true },
  };
  protected readonly positionAnalytics = computed<FidelityPositionAnalytics | null>(() => {
    const positions = this.positionsCsv();
    if (!positions?.length) return null;

    const sumAvailable = (selector: (position: FidelityCsvPosition) => number | null): number | null => {
      const values = positions
        .map(selector)
        .filter((value): value is number => value !== null && Number.isFinite(value));
      return values.length ? values.reduce((total, value) => total + value, 0) : null;
    };

    const totalValue = sumAvailable((position) => position.current_value) ?? 0;
    const totalCostBasis = sumAvailable((position) => position.cost_basis_total);
    const todaysGainLoss = sumAvailable((position) => position.todays_gain_loss_dollar);
    const totalGainLoss = sumAvailable((position) => position.total_gain_loss_dollar);
    const dailyValues = positions.filter(
      (
        position,
      ): position is FidelityCsvPosition & { current_value: number; todays_gain_loss_dollar: number } =>
        position.current_value !== null &&
        Number.isFinite(position.current_value) &&
        position.todays_gain_loss_dollar !== null &&
        Number.isFinite(position.todays_gain_loss_dollar),
    );
    const dailyGainLossForReturn = dailyValues.reduce(
      (total, position) => total + position.todays_gain_loss_dollar,
      0,
    );
    const estimatedStartingValue = dailyValues.reduce(
      (total, position) => total + position.current_value - position.todays_gain_loss_dollar,
      0,
    );
    const totalReturnPositions = positions.filter(
      (
        position,
      ): position is FidelityCsvPosition & { total_gain_loss_dollar: number; cost_basis_total: number } =>
        position.total_gain_loss_dollar !== null &&
        Number.isFinite(position.total_gain_loss_dollar) &&
        position.cost_basis_total !== null &&
        Number.isFinite(position.cost_basis_total),
    );
    const gainLossForReturn = totalReturnPositions.reduce(
      (total, position) => total + position.total_gain_loss_dollar,
      0,
    );
    const costBasisForReturn = totalReturnPositions.reduce(
      (total, position) => total + position.cost_basis_total,
      0,
    );
    const todaysGainLossPercent =
      dailyValues.length && estimatedStartingValue > 0
        ? (dailyGainLossForReturn / estimatedStartingValue) * 100
        : null;
    const totalGainLossPercent =
      totalReturnPositions.length && costBasisForReturn > 0
        ? (gainLossForReturn / costBasisForReturn) * 100
        : null;

    const valuedPositions = positions
      .filter(
        (position): position is FidelityCsvPosition & { current_value: number } =>
          position.current_value !== null &&
          Number.isFinite(position.current_value) &&
          position.current_value > 0,
      )
      .sort((left, right) => right.current_value - left.current_value);
    const topHoldings = valuedPositions.slice(0, 8);
    const allocationLabels = topHoldings.map((position) => position.symbol);
    const allocationValues = topHoldings.map((position) => position.current_value);
    const otherValue = valuedPositions.slice(8).reduce((total, position) => total + position.current_value, 0);
    if (otherValue > 0) {
      allocationLabels.push('Other');
      allocationValues.push(otherValue);
    }

    const gainLossPositions = positions
      .filter(
        (position): position is FidelityCsvPosition & { total_gain_loss_dollar: number } =>
          position.total_gain_loss_dollar !== null && Number.isFinite(position.total_gain_loss_dollar),
      )
      .sort((left, right) => Math.abs(right.total_gain_loss_dollar) - Math.abs(left.total_gain_loss_dollar))
      .slice(0, 10);

    return {
      totalValue,
      totalCostBasis,
      todaysGainLoss,
      todaysGainLossPercent,
      totalGainLoss,
      totalGainLossPercent,
      allocationChart: allocationValues.length
        ? [
            {
              type: 'pie',
              hole: 0.58,
              labels: allocationLabels,
              values: allocationValues,
              textinfo: 'label+percent',
              hovertemplate: '%{label}<br>$%{value:,.2f}<extra></extra>',
              marker: {
                colors: ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#2dd4bf', '#f97316', '#64748b'],
              },
            },
          ]
        : [],
      gainLossChart: gainLossPositions.length
        ? [
            {
              type: 'bar',
              orientation: 'h',
              y: gainLossPositions.map((position) => position.symbol).reverse(),
              x: gainLossPositions.map((position) => position.total_gain_loss_dollar).reverse(),
              marker: {
                color: gainLossPositions
                  .map((position) => (position.total_gain_loss_dollar >= 0 ? '#34d399' : '#f87171'))
                  .reverse(),
              },
              hovertemplate: '%{y}<br>$%{x:,.2f}<extra></extra>',
            },
          ]
        : [],
    };
  });

  ngOnInit(): void {
    this.api().getStatement().subscribe({
      next: (statement) => this.statement.set(statement),
      error: (err: unknown) => this.error.set(errorDetail(err)),
    });
    const getPositions = this.api().getPositionsCsv;
    if (getPositions) {
      getPositions.call(this.api()).subscribe({
        next: (positions) => this.positionsCsv.set(positions),
        error: (err: unknown) => this.error.set(errorDetail(err)),
      });
    }
  }

  protected currency(value: number, maximumFractionDigits = 2): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits,
    }).format(value);
  }

  protected number(value: number, maximumFractionDigits: number): string {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      this.error.set('Choose a PDF statement file.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      this.error.set('The PDF exceeds the 20 MB upload limit.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.api().uploadStatement(file).subscribe({
      next: (statement) => {
        this.statement.set(statement);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorDetail(err));
        this.loading.set(false);
      },
    });
  }

  protected onPositionsCsvFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const api = this.api();
    const upload = api.uploadPositionsCsv;
    if (!file || !upload) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.error.set('Choose a Fidelity positions CSV file.');
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      this.error.set('The CSV exceeds the 20 MB upload limit.');
      return;
    }

    this.positionsLoading.set(true);
    this.error.set('');
    upload.call(api, file).subscribe({
      next: (positions) => {
        this.positionsCsv.set(positions);
        this.positionsLoading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorDetail(err));
        this.positionsLoading.set(false);
      },
    });
  }

  protected clearPositionsCsv(): void {
    const api = this.api();
    const clear = api.clearPositionsCsv;
    if (!clear) return;
    this.positionsLoading.set(true);
    clear.call(api).subscribe({
      next: () => {
        this.positionsCsv.set(null);
        this.positionsLoading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorDetail(err));
        this.positionsLoading.set(false);
      },
    });
  }

  protected clearStatement(): void {
    this.loading.set(true);
    this.error.set('');
    this.api().clearStatement().subscribe({
      next: () => {
        this.statement.set(null);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorDetail(err));
        this.loading.set(false);
      },
    });
  }
}
