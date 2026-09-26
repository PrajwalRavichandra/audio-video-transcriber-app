import { OPENROUTER_BASE_URL, type SttModel } from '../../types';
import { OpenRouterError } from './client';

export const DEFAULT_MODEL = 'openai/whisper-large-v3';

interface RawModel {
  id?: string;
  name?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
}

export async function fetchSttModels(
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<SttModel[]> {
  let res: Response;
  try {
    res = await fetchImpl(`${OPENROUTER_BASE_URL}/models?output_modalities=transcription`, { signal });
  } catch (err) {
    throw new OpenRouterError(
      err instanceof Error ? err.message : 'Failed to reach OpenRouter',
      0,
    );
  }

  if (!res.ok) {
    throw new OpenRouterError(`Failed to fetch transcription models (status ${res.status})`, res.status);
  }

  const json = (await res.json()) as { data?: RawModel[] };
  const models: SttModel[] = (json.data ?? []).map((model) => ({
    id: model.id ?? '',
    name: model.name ?? model.id ?? '',
    contextLength: model.context_length,
    promptPrice: model.pricing?.prompt,
    completionPrice: model.pricing?.completion,
  }));

  models.sort((a, b) => a.name.localeCompare(b.name));
  return models;
}

export function isValidModelSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9._/-]*$/i.test(slug) && slug.includes('/');
}
