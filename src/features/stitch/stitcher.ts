import type { TranscribedChunk } from '../../types';
import { longestOverlap, tokenize } from '../../lib/tokens';

export const MAX_OVERLAP_TOKENS = 40;

export function stitchTranscripts(
  chunks: TranscribedChunk[],
  maxOverlapTokens: number = MAX_OVERLAP_TOKENS,
): string {
  const ordered = [...chunks].sort((a, b) => a.index - b.index);

  let accumulated: string[] = [];
  let started = false;

  for (const chunk of ordered) {
    const tokens = tokenize(chunk.text);
    if (tokens.length === 0) {
      continue;
    }

    if (!started) {
      accumulated = tokens;
      started = true;
      continue;
    }

    const overlap = longestOverlap(accumulated, tokens, maxOverlapTokens);
    for (let i = overlap; i < tokens.length; i++) {
      accumulated.push(tokens[i]);
    }
  }

  return accumulated.join(' ').trim();
}

export function stitchPartial(
  prevText: string,
  nextText: string,
  maxOverlapTokens: number = MAX_OVERLAP_TOKENS,
): string {
  return stitchTranscripts(
    [
      { index: 0, start: 0, end: 0, text: prevText },
      { index: 1, start: 0, end: 0, text: nextText },
    ],
    maxOverlapTokens,
  );
}

export function wordCount(text: string): number {
  return tokenize(text).length;
}
