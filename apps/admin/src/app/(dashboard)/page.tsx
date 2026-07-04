'use client';

import { useSession } from 'next-auth/react';
import { DashboardPageSkeleton } from '@/components/skeletons';
import { CommunityCard } from '@/components/dashboard/community-card';
import { ContributeCard } from '@/components/dashboard/contribute-card';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { FeaturedPluginsCard } from '@/components/dashboard/featured-plugins-card';
import { InstanceHealthCard } from '@/components/dashboard/instance-health-card';
import { QuickStartCard } from '@/components/dashboard/quick-start-card';
import { RecentActivityCard } from '@/components/dashboard/recent-activity-card';
import { SelfHostingCard } from '@/components/dashboard/self-hosting-card';
import { ThemeMarketplaceCard } from '@/components/dashboard/theme-marketplace-card';
import { UpdateBanner } from '@/components/dashboard/update-banner';
import { WhatsNewCard } from '@/components/dashboard/whats-new-card';

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <DashboardHeader userName={session?.user?.name} />
      <UpdateBanner />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuickStartCard />
        </div>
        <InstanceHealthCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WhatsNewCard />
        <CommunityCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FeaturedPluginsCard />
        <ThemeMarketplaceCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SelfHostingCard />
        </div>
        <ContributeCard />
      </div>

      <RecentActivityCard />
    </div>
  );
}
