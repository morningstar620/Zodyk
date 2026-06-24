import { TableSkeleton } from '@/components/skeletons';

export default function PagesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}
