import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_MODEL, fetchSttModels, isValidModelSlug } from '../src/features/stt/modelCatalog';
import { OpenRouterError } from '../src/features/stt/client';

function asFetch(mock: ReturnType<typeof vi.fn>): typeof fetch {
  return mock as unknown as typeof fetch;
}

describe('fetchSttModels', () => {
  it('maps and sorts models by name', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            id: 'b/whisper',
            name: 'Zeta Whisper',
            context_length: 4096,
            pricing: { prompt: '0.0001', completion: '0.0002' },
          },
          { id: 'a/whisper', name: 'Alpha Whisper' },
        ],
      }),
    });

    const models = await fetchSttModels(asFetch(fetchImpl));

    expect(models.map((m) => m.name)).toEqual(['Alpha Whisper', 'Zeta Whisper']);
    expect(models[1]).toEqual({
      id: 'b/whisper',
      name: 'Zeta Whisper',
      contextLength: 4096,
      promptPrice: '0.0001',
      completionPrice: '0.0002',
    });

    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url).toContain('/models?output_modalities=transcription');
  });

  it('throws OpenRouterError on non-ok response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ({}),
      text: async () => 'server error',
    });

    await expect(fetchSttModels(asFetch(fetchImpl))).rejects.toBeInstanceOf(OpenRouterError);
  });
});

describe('isValidModelSlug', () => {
  it('accepts valid slugs and rejects invalid ones', () => {
    expect(isValidModelSlug('openai/whisper-large-v3')).toBe(true);
    expect(isValidModelSlug('deepgram/nova-2')).toBe(true);
    expect(isValidModelSlug('')).toBe(false);
    expect(isValidModelSlug('no-slash')).toBe(false);
    expect(isValidModelSlug('/leading')).toBe(false);
  });

  it('exposes the default model', () => {
    expect(DEFAULT_MODEL).toBe('openai/whisper-large-v3');
  });
});
