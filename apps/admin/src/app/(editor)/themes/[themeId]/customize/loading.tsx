import { Skeleton } from '@zodyk/shared-ui';

export default function CustomizeLoading() {
  return (
    <div className="flex h-screen flex-col bg-zinc-100">
      <div className="flex h-12 items-center gap-3 border-b border-zinc-200 bg-white px-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="flex flex-1 gap-4 p-4">
        <Skeleton className="h-full w-80" />
        <Skeleton className="h-full flex-1" />
      </div>
    </div>
  );
}
