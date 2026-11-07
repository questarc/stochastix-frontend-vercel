import { Order } from './order';

export interface ChatRequest {
  message: string;
  thread_id: string;
  provider: string;
  model: string | null;
  account_id?: string | null;
  model_id?: string | null;
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  result: string;
}

export interface AudioInfo {
  audio_id: string;
  account_id?: string | null;
  client_name?: string | null;
  script: string;
  voice: string;
  duration_seconds: number;
  created_at: string;
  file_name: string;
  url: string;
}

export interface ChatResponse {
  text: string;
  tool_calls: ToolCall[];
  orders_added: number;
  orders: Order[];
  audio?: AudioInfo[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  toolCalls?: ToolCall[];
  ordersAdded?: number;
  error?: boolean;
  accountId?: string | null;
  audio?: AudioInfo | null;
}

export type ChatWindowSize = 'normal' | 'max' | 'min';
