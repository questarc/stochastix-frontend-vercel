import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SKIP_ERROR_SNACKBAR } from '../interceptors/error.interceptor';
import { AudioInfo } from '../models/chat';
import { ApiService } from './api.service';

/** VoiceGenAgent: turns an Advisor AI summary into a shareable audio file (generated in the back end). */
@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly api = inject(ApiService);
  private readonly context = new HttpContext().set(SKIP_ERROR_SNACKBAR, true);

  create(text: string, accountId?: string | null): Observable<AudioInfo> {
    return this.api.post<AudioInfo>('/voice', { text, account_id: accountId ?? null }, this.context);
  }

  playUrl(audio: AudioInfo): string {
    return this.api.url(audio.url);
  }

  downloadUrl(audio: AudioInfo): string {
    return `${this.api.url(audio.url)}?download=true`;
  }
}
