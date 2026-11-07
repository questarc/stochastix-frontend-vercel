import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { ChatRequest, ChatResponse } from '../models/chat';
import { SKIP_ERROR_SNACKBAR } from '../interceptors/error.interceptor';
import { ApiService } from './api.service';

export const CHAT_TIMEOUT_MS = 180_000;

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly api = inject(ApiService);
  private readonly context = new HttpContext().set(SKIP_ERROR_SNACKBAR, true);

  send(request: ChatRequest): Observable<ChatResponse> {
    return this.api.post<ChatResponse>('/chat', request, this.context).pipe(timeout(CHAT_TIMEOUT_MS));
  }

  reset(threadId: string): Observable<{ reset: boolean }> {
    return this.api.delete<{ reset: boolean }>(`/chat/${encodeURIComponent(threadId)}`, this.context);
  }
}
