'use client';

import { useSession } from 'next-auth/react';
import { DashboardPageSkeleton } from '@/components/skeletons';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { InstanceHealthCard } from '@/components/dashboard/instance-health-card';
import { QuickStartCard } from '@/components/dashboard/quick-start-card';
import { RecentActivityCard } from '@/components/dashboard/recent-activity-card';

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <DashboardHeader userName={session?.user?.name} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuickStartCard />
        </div>
        <InstanceHealthCard />
      </div>

      <RecentActivityCard />
    </div>
  );
}
