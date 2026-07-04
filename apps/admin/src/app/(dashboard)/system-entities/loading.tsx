import { TableSkeleton } from '@/components/skeletons';

export default function SystemEntitiesLoading() {
  return <TableSkeleton rows={5} columns={6} />;
}
