import { Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';
import { FileText, Upload, UserPlus, Zap } from 'lucide-react';
import Link from 'next/link';

const quickActions = [
  {
    href: '/pages/new',
    label: 'New page',
    icon: FileText,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    href: '/media',
    label: 'Upload media',
    icon: Upload,
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    href: '/settings/integrations',
    label: 'New automation',
    icon: Zap,
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    href: '/users/new',
    label: 'Invite user',
    icon: UserPlus,
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
] as const;

export function QuickStartCard() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Quick start</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center transition-colors hover:bg-muted/50"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
