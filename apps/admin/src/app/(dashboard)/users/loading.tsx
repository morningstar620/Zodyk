import { TableSkeleton } from '@/components/skeletons';

export default function UsersLoading() {
  return <TableSkeleton rows={6} columns={6} />;
}
