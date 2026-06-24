import { TableSkeleton } from '@/components/skeletons';

export default function ThemesLoading() {
  return (
    <div className="flex flex-col gap-8">
      <TableSkeleton rows={3} columns={4} />
    </div>
  );
}
