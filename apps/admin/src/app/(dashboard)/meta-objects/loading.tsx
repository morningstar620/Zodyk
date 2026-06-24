import { TableSkeleton } from '@/components/skeletons';

export default function MetaObjectsLoading() {
  return <TableSkeleton rows={5} columns={5} />;
}
