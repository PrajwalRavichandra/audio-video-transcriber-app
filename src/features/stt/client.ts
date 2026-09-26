import { arrayBufferToBase64 } from '../../lib/base64';
import { OPENROUTER_ATTRIBUTION, OPENROUTER_BASE_URL } from '../../types';

export interface TranscribeOptions {
  apiKey: string;
  model: string;
  data: ArrayBuffer;
  format?: string;
  language?: string;
  temperature?: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export interface TranscribeUsage {
  seconds?: number;
  promptTokens?: number;
  completionTokens?: number;
  cost?: number;
}

export interface TranscribeResult {
  text: string;
  usage?: TranscribeUsage;
}

export class OpenRouterError extends Error {
  status: number;
  code?: string;
  retryAfterMs?: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = status;
    this.code = code;
  }
}

interface RawUsage {
  seconds?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
  total_cost?: number;
}

interface RawTranscriptionResponse {
  text?: string;
  usage?: RawUsage;
}

const MAX_ERROR_BODY = 500;
const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_BASE_DELAY_MS = 500;
const MAX_RETRY_AFTER_MS = 30_000;

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    const ms = seconds * 1000;
    return ms >= 0 && ms <= MAX_RETRY_AFTER_MS ? ms : undefined;
  }
  const date = Date.parse(value);
  if (!Number.isNaN(date)) {
    const ms = date - Date.now();
    return ms >= 0 && ms <= MAX_RETRY_AFTER_MS ? ms : undefined;
  }
  return undefined;
}

async function readErrorBody(res: Response): Promise<{ message: string; code?: string }> {
  let text = '';
  try {
    text = await res.text();
  } catch {
    text = '';
  }

  let message: string | undefined;
  let code: string | undefined;
  try {
    const json = JSON.parse(text) as {
      error?: { message?: unknown; code?: unknown };
      message?: unknown;
      code?: unknown;
    };
    const errObj = json.error ?? json;
    if (typeof errObj.message === 'string') {
      message = errObj.message;
    }
    if (typeof errObj.code === 'string') {
      code = errObj.code;
    }
  } catch {
    message = text;
  }

  if (res.status === 401) {
    message = 'Invalid API key';
  } else if (res.status === 404) {
    message = 'Model not found or not available for transcription';
  } else if (!message) {
    message = `Request failed with status ${res.status}`;
  }

  return { message: message.slice(0, MAX_ERROR_BODY), code };
}

export async function transcribeChunk(opts: TranscribeOptions): Promise<TranscribeResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const body: Record<string, unknown> = {
    model: opts.model,
    input_audio: {
      data: arrayBufferToBase64(opts.data),
      format: opts.format ?? 'mp3',
    },
  };
  if (opts.language) {
    body.language = opts.language;
  }
  if (opts.temperature !== undefined) {
    body.temperature = opts.temperature;
  }

  const res = await fetchImpl(`${OPENROUTER_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': OPENROUTER_ATTRIBUTION.referer,
      'X-Title': OPENROUTER_ATTRIBUTION.title,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const { message, code } = await readErrorBody(res);
    const error = new OpenRouterError(message, res.status, code);
    const retryAfter = parseRetryAfter(res.headers.get('Retry-After'));
    if (retryAfter !== undefined) {
      error.retryAfterMs = retryAfter;
    }
    throw error;
  }

  const json = (await res.json()) as RawTranscriptionResponse;
  const text = typeof json.text === 'string' ? json.text : '';

  let usage: TranscribeUsage | undefined;
  if (json.usage) {
    usage = {
      seconds: json.usage.seconds,
      promptTokens: json.usage.prompt_tokens,
      completionTokens: json.usage.completion_tokens,
      cost: json.usage.cost ?? json.usage.total_cost,
    };
  }

  return { text, usage };
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err: unknown): boolean {
  if (err instanceof OpenRouterError) {
    return err.status === 429 || err.status >= 500;
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return false;
  }
  return true;
}

function retryDelay(err: unknown, attempt: number, baseDelayMs: number): number {
  if (err instanceof OpenRouterError && err.retryAfterMs !== undefined) {
    return err.retryAfterMs;
  }
  return baseDelayMs * 2 ** attempt;
}

export async function transcribeWithRetry(
  opts: TranscribeOptions,
  retryOpts: RetryOptions = {},
): Promise<TranscribeResult> {
  const maxRetries = retryOpts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = retryOpts.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const sleep = retryOpts.sleep ?? defaultSleep;
  const signal = retryOpts.signal ?? opts.signal;

  let attempt = 0;
  for (;;) {
    if (signal?.aborted) {
      throw new DOMException('Transcription aborted', 'AbortError');
    }
    try {
      return await transcribeChunk({ ...opts, signal });
    } catch (err) {
      if (signal?.aborted) {
        throw err;
      }
      if (!isRetryable(err) || attempt >= maxRetries) {
        throw err;
      }
      const delay = retryDelay(err, attempt, baseDelayMs);
      attempt += 1;
      await sleep(delay);
    }
  }
}
