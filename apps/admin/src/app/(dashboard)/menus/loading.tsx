import { TableSkeleton } from '@/components/skeletons';

export default function MenusLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <TableSkeleton rows={5} columns={4} />
    </div>
  );
}
