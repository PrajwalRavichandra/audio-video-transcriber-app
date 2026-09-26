export function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((token) => token.length > 0);
}

export function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/[^\p{L}\p{N}]+$/u, '');
}

export function longestOverlap(a: string[], b: string[], maxTokens: number): number {
  const limit = Math.min(maxTokens, a.length, b.length);
  for (let k = limit; k > 0; k--) {
    let match = true;
    for (let i = 0; i < k; i++) {
      if (normalizeToken(a[a.length - k + i]) !== normalizeToken(b[i])) {
        match = false;
        break;
      }
    }
    if (match) {
      return k;
    }
  }
  return 0;
}
