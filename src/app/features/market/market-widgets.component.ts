import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { errorDetail } from '../../core/interceptors/error.interceptor';
import { CorporateActionsFeed, EarningsFeed, NewsFeed } from '../../core/models/market';
import { MarketService } from '../../core/services/market.service';

type Kind = 'news' | 'earnings' | 'actions';

/** MarketWatch widgets for economic news, upcoming earnings, and corporate actions. */
@Component({
  selector: 'app-market-widgets',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  templateUrl: './market-widgets.component.html',
  styleUrl: './market-widgets.component.scss',
})
export class MarketWidgetsComponent {
  private readonly api = inject(MarketService);

  readonly collapsed = signal(false);
  readonly news = signal<NewsFeed | null>(null);
  readonly earnings = signal<EarningsFeed | null>(null);
  readonly actions = signal<CorporateActionsFeed | null>(null);
  readonly loading = signal<Record<Kind, boolean>>({ news: false, earnings: false, actions: false });
  readonly errors = signal<Record<Kind, string | null>>({ news: null, earnings: null, actions: null });
  readonly heldOnly = signal(false);

  protected readonly visibleActions = computed(() => {
    const items = this.actions()?.items ?? [];
    return this.heldOnly() ? items.filter((a) => a.held_by.length) : items;
  });

  constructor() {
    this.load('news');
    this.load('earnings');
    this.load('actions');
  }

  refresh(kind: Kind): void {
    this.load(kind, true);
  }

  protected held(accounts: string[]): string {
    return `Held in ${accounts.length} account${accounts.length === 1 ? '' : 's'}: ${accounts.join(', ')}`;
  }

  private load(kind: Kind, refresh = false): void {
    this.loading.update((l) => ({ ...l, [kind]: true }));
    this.errors.update((e) => ({ ...e, [kind]: null }));
    const done = () => this.loading.update((l) => ({ ...l, [kind]: false }));
    const fail = (err: unknown) => {
      this.errors.update((e) => ({ ...e, [kind]: errorDetail(err) }));
      done();
    };
    const request: Observable<NewsFeed | EarningsFeed | CorporateActionsFeed> =
      kind === 'news' ? this.api.news(refresh) : kind === 'earnings' ? this.api.earnings(14, refresh)
        : this.api.corporateActions(30, refresh);
    request.subscribe({
      next: (feed) => {
        if (kind === 'news') this.news.set(feed as NewsFeed);
        else if (kind === 'earnings') this.earnings.set(feed as EarningsFeed);
        else this.actions.set(feed as CorporateActionsFeed);
        done();
      },
      error: fail,
    });
  }
}
