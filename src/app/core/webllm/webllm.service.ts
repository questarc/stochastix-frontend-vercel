import { Injectable, signal } from '@angular/core';
import type { ChatOptions, MLCEngineInterface } from '@mlc-ai/web-llm';
import { webGpuSupported } from './webllm.models';

export type WebLlmStatus = 'idle' | 'loading' | 'ready' | 'error';

const CHAT_OPTIONS: ChatOptions = { context_window_size: 8192 };

/** Loads and keeps one WebLLM engine in a Web Worker, so the page stays responsive. */
@Injectable({ providedIn: 'root' })
export class WebLlmService {
  readonly status = signal<WebLlmStatus>('idle');
  readonly progress = signal(0);
  readonly progressText = signal('');
  readonly loadedModel = signal<string | null>(null);

  private engine: MLCEngineInterface | null = null;
  private loading: Promise<MLCEngineInterface> | null = null;

  /** Returns an engine with ``model`` loaded, downloading it on first use (cached by the browser). */
  async ensure(model: string): Promise<MLCEngineInterface> {
    if (!webGpuSupported()) {
      throw new Error('This browser does not support WebGPU. Use a recent Chrome or Edge, or choose another provider.');
    }
    if (this.engine && this.loadedModel() === model) return this.engine;
    if (this.loading) await this.loading.catch(() => undefined);
    if (this.engine && this.loadedModel() === model) return this.engine;
    this.loading = this.load(model);
    try {
      return await this.loading;
    } finally {
      this.loading = null;
    }
  }

  private async load(model: string): Promise<MLCEngineInterface> {
    this.status.set('loading');
    this.progress.set(0);
    this.progressText.set(`Loading ${model}…`);
    const onProgress = (report: { progress: number; text: string }) => {
      this.progress.set(report.progress);
      this.progressText.set(report.text);
    };
    try {
      if (this.engine) {
        this.engine.setInitProgressCallback(onProgress);
        await this.engine.reload(model, CHAT_OPTIONS);
      } else {
        const webllm = await import('@mlc-ai/web-llm');
        const worker = new Worker(new URL('./webllm.worker', import.meta.url), { type: 'module' });
        this.engine = await webllm.CreateWebWorkerMLCEngine(worker, model, { initProgressCallback: onProgress }, CHAT_OPTIONS);
      }
      this.loadedModel.set(model);
      this.status.set('ready');
      return this.engine;
    } catch (error) {
      this.loadedModel.set(null);
      this.status.set('error');
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not load ${model} in the browser: ${reason}`);
    }
  }
}
