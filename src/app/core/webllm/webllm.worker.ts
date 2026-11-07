/// <reference lib="webworker" />
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

const handler = new WebWorkerMLCEngineHandler();

addEventListener('message', (msg: MessageEvent) => handler.onmessage(msg));
