import {
  diffLines,
  diffRecords,
  stableStringify,
  type DiffLine,
  type FieldDiff,
} from '@zodyk/core';

type RevisionDoc = {
  _id: { toString(): string };
  revision: number;
  createdAt: Date;
  createdBy?: string;
  snapshot: Record<string, unknown>;
};

export function presentRevisionList(docs: RevisionDoc[], current: Record<string, unknown>) {
  const currentKey = stableStringify(current);
  return {
    data: docs.map((doc) => ({
      id: doc._id.toString(),
      revision: doc.revision,
      createdAt: doc.createdAt,
      createdBy: doc.createdBy ?? null,
      status: typeof doc.snapshot.status === 'string' ? doc.snapshot.status : null,
      title:
        typeof doc.snapshot.title === 'string'
          ? doc.snapshot.title
          : typeof doc.snapshot.handle === 'string'
            ? doc.snapshot.handle
            : null,
      current: stableStringify(doc.snapshot) === currentKey,
    })),
  };
}

export function presentRevisionDetail(
  doc: RevisionDoc,
  current: Record<string, unknown>,
  fields: readonly string[],
  textField: string,
): {
  id: string;
  revision: number;
  createdAt: Date;
  createdBy: string | null;
  snapshot: Record<string, unknown>;
  diff: FieldDiff[];
  textDiff: DiffLine[];
  textField: string;
  current: boolean;
} {
  const beforeValue = doc.snapshot[textField];
  const afterValue = current[textField];
  const before =
    typeof beforeValue === 'string' ? beforeValue : JSON.stringify(beforeValue ?? {}, null, 2);
  const after =
    typeof afterValue === 'string' ? afterValue : JSON.stringify(afterValue ?? {}, null, 2);

  return {
    id: doc._id.toString(),
    revision: doc.revision,
    createdAt: doc.createdAt,
    createdBy: doc.createdBy ?? null,
    snapshot: doc.snapshot,
    diff: diffRecords(doc.snapshot, current, fields),
    textDiff: diffLines(before, after),
    textField,
    current: stableStringify(doc.snapshot) === stableStringify(current),
  };
}
