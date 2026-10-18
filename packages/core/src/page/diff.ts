export type DiffLine = {
  type: 'context' | 'added' | 'removed';
  text: string;
};

export type FieldDiff = {
  field: string;
  before: unknown;
  after: unknown;
};

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

export function diffRecords(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: readonly string[],
): FieldDiff[] {
  const changes: FieldDiff[] = [];
  for (const field of fields) {
    const left = before[field] ?? null;
    const right = after[field] ?? null;
    if (stableStringify(left) !== stableStringify(right)) {
      changes.push({ field, before: left, after: right });
    }
  }
  return changes;
}

const MAX_DIFF_LINES = 300;
const CONTEXT_LINES = 2;

/** Line diff used by the revision panel. Large texts are summarized. */
export function diffLines(before: string, after: string): DiffLine[] {
  if (before === after) return [];
  const a = before.split('\n');
  const b = after.split('\n');
  if (a.length > MAX_DIFF_LINES || b.length > MAX_DIFF_LINES) {
    return [
      { type: 'removed', text: `Previous text (${a.length} lines)` },
      { type: 'added', text: `Current text (${b.length} lines)` },
    ];
  }

  const lcs = longestCommonSubsequence(a, b);
  const raw: DiffLine[] = [];
  let i = 0;
  let j = 0;
  for (const line of lcs) {
    while (i < a.length && a[i] !== line) {
      raw.push({ type: 'removed', text: a[i] ?? '' });
      i += 1;
    }
    while (j < b.length && b[j] !== line) {
      raw.push({ type: 'added', text: b[j] ?? '' });
      j += 1;
    }
    raw.push({ type: 'context', text: line });
    i += 1;
    j += 1;
  }
  while (i < a.length) {
    raw.push({ type: 'removed', text: a[i] ?? '' });
    i += 1;
  }
  while (j < b.length) {
    raw.push({ type: 'added', text: b[j] ?? '' });
    j += 1;
  }

  return collapseContext(raw);
}

function longestCommonSubsequence(a: string[], b: string[]): string[] {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const lengths: number[][] = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      const row = lengths[i + 1] ?? [];
      const next = lengths[i] ?? [];
      if (a[i] === b[j]) {
        next[j] = (row[j + 1] ?? 0) + 1;
      } else {
        next[j] = Math.max(next[j + 1] ?? 0, row[j] ?? 0);
      }
    }
  }

  const result: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push(a[i] ?? '');
      i += 1;
      j += 1;
    } else if ((lengths[i]?.[j + 1] ?? 0) >= (lengths[i + 1]?.[j] ?? 0)) {
      j += 1;
    } else {
      i += 1;
    }
  }
  return result;
}

function collapseContext(lines: DiffLine[]): DiffLine[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]?.type === 'context') continue;
    for (
      let cursor = Math.max(0, index - CONTEXT_LINES);
      cursor <= Math.min(lines.length - 1, index + CONTEXT_LINES);
      cursor += 1
    ) {
      keep[cursor] = true;
    }
  }

  const collapsed: DiffLine[] = [];
  let skipping = false;
  for (let index = 0; index < lines.length; index += 1) {
    if (!keep[index]) {
      skipping = true;
      continue;
    }
    if (skipping) {
      collapsed.push({ type: 'context', text: '…' });
      skipping = false;
    }
    const line = lines[index];
    if (line) collapsed.push(line);
  }
  return collapsed;
}
