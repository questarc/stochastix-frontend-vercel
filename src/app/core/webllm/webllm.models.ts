import { LlmProvider } from '../models/llm';

export const WEBLLM_PROVIDER_ID = 'webllm';

/** Prebuilt WebLLM models, roughly ordered by quality. Sizes are the approximate download / GPU memory. */
export const WEBLLM_MODELS: { id: string; size: string }[] = [
  { id: 'Qwen2.5-7B-Instruct-q4f16_1-MLC', size: '≈5 GB' },
  { id: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC', size: '≈5 GB' },
  { id: 'Llama-3.1-8B-Instruct-q4f16_1-MLC', size: '≈5 GB' },
  { id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC', size: '≈2.5 GB' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', size: '≈1.6 GB' },
];

/** Client-side provider shown next to the providers returned by GET /llm/providers. */
export const WEBLLM_PROVIDER: LlmProvider = {
  id: WEBLLM_PROVIDER_ID,
  label: 'WebLLM (in browser)',
  default_model: WEBLLM_MODELS[0].id,
  models: WEBLLM_MODELS.map((m) => m.id),
  api_key_env: null,
  api_key_set: false,
};

export function webGpuSupported(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}
