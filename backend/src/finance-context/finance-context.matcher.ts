/** Normaliza nome de estabelecimento/pessoa para matching estável entre importações. */
export function normalizeMatchLabel(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\(\d{3,4}\).*$/i, '')
    .replace(/•••\.\d+\.\d+-••.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ContextRuleLike {
  matchLabel: string;
  displayLabel: string;
  category: string | null;
  motive: string;
}

export function findMatchingRule(
  rules: ContextRuleLike[],
  description: string,
  merchantLabel: string,
): ContextRuleLike | null {
  const candidates = [
    normalizeMatchLabel(merchantLabel),
    normalizeMatchLabel(description),
  ].filter(Boolean);

  for (const rule of rules) {
    const key = rule.matchLabel;
    for (const c of candidates) {
      if (c === key || c.includes(key) || key.includes(c)) {
        return rule;
      }
    }
  }
  return null;
}
