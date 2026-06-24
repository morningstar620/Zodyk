import { TableSkeleton } from '@/components/skeletons';

export default function RolesLoading() {
  return <TableSkeleton rows={5} columns={5} />;
}
