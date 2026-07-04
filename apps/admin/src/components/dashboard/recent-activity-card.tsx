import { Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';
import { FileText, Image, Settings, User } from 'lucide-react';

const activities = [
  {
    user: 'Sara K.',
    action: 'published Pricing page',
    icon: FileText,
    time: '12m ago',
  },
  {
    user: 'Alex M.',
    action: 'uploaded 4 images to Media Library',
    icon: Image,
    time: '1h ago',
  },
  {
    user: 'Jordan P.',
    action: 'updated site settings',
    icon: Settings,
    time: '3h ago',
  },
  {
    user: 'Taylor R.',
    action: 'invited a new team member',
    icon: User,
    time: 'Yesterday',
  },
] as const;

export function RecentActivityCard() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {activities.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.action} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{item.user}</span> {item.action}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
