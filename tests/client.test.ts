import { describe, it, expect, vi } from 'vitest';
import { transcribeChunk, transcribeWithRetry, OpenRouterError } from '../src/features/stt/client';
import { arrayBufferToBase64 } from '../src/lib/base64';

const AUDIO = new Uint8Array([0, 1, 2, 250, 255]).buffer;

function makeResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => JSON.parse(text),
    text: async () => text,
  } as unknown as Response;
}

function asFetch(mock: ReturnType<typeof vi.fn>): typeof fetch {
  return mock as unknown as typeof fetch;
}

describe('transcribeChunk', () => {
  it('posts base64 audio, headers, and maps response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      makeResponse({
        text: 'hello world',
        usage: { seconds: 1.5, prompt_tokens: 10, completion_tokens: 3, total_cost: 0.002 },
      }),
    );

    const result = await transcribeChunk({
      apiKey: 'secret-key',
      model: 'openai/whisper-large-v3',
      data: AUDIO,
      fetchImpl: asFetch(fetchImpl),
    });

    expect(result.text).toBe('hello world');
    expect(result.usage).toEqual({
      seconds: 1.5,
      promptTokens: 10,
      completionTokens: 3,
      cost: 0.002,
    });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/audio/transcriptions');
    const body = JSON.parse(init.body as string) as {
      model: string;
      input_audio: { data: string; format: string };
    };
    expect(body.model).toBe('openai/whisper-large-v3');
    expect(body.input_audio.data).toBe(arrayBufferToBase64(AUDIO));
    expect(body.input_audio.format).toBe('mp3');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer secret-key');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('throws OpenRouterError with status 401 for invalid key', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(makeResponse({ error: { message: 'nope', code: 'invalid_api_key' } }, 401));

    const error = await transcribeChunk({
      apiKey: 'bad',
      model: 'openai/whisper-large-v3',
      data: AUDIO,
      fetchImpl: asFetch(fetchImpl),
    }).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(OpenRouterError);
    expect((error as OpenRouterError).status).toBe(401);
    expect((error as OpenRouterError).message).toBe('Invalid API key');
    expect((error as OpenRouterError).code).toBe('invalid_api_key');
  });
});

describe('transcribeWithRetry', () => {
  it('retries on 429 then resolves', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(makeResponse({ error: { message: 'slow down' } }, 429))
      .mockResolvedValueOnce(makeResponse({ text: 'eventually ok' }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await transcribeWithRetry(
      { apiKey: 'k', model: 'openai/whisper-large-v3', data: AUDIO, fetchImpl: asFetch(fetchImpl) },
      { sleep, baseDelayMs: 1 },
    );

    expect(result.text).toBe('eventually ok');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('exhausts retries and throws the last error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(makeResponse({ error: { message: 'busy' } }, 503));
    const sleep = vi.fn().mockResolvedValue(undefined);

    const error = await transcribeWithRetry(
      { apiKey: 'k', model: 'openai/whisper-large-v3', data: AUDIO, fetchImpl: asFetch(fetchImpl) },
      { sleep, maxRetries: 2, baseDelayMs: 1 },
    ).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(OpenRouterError);
    expect((error as OpenRouterError).status).toBe(503);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-429 4xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(makeResponse({ error: { message: 'bad' } }, 400));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      transcribeWithRetry(
        { apiKey: 'k', model: 'openai/whisper-large-v3', data: AUDIO, fetchImpl: asFetch(fetchImpl) },
        { sleep, maxRetries: 3 },
      ),
    ).rejects.toBeInstanceOf(OpenRouterError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
