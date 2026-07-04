import { Button, Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';
import { CreditCard, Search, Webhook } from 'lucide-react';

const plugins = [
  {
    name: 'Stripe',
    description: 'Accept payments and subscriptions',
    icon: CreditCard,
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    name: 'Algolia',
    description: 'Instant search for your content',
    icon: Search,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    name: 'Zapier',
    description: 'Connect workflows and automations',
    icon: Webhook,
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
] as const;

export function FeaturedPluginsCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle>Featured plugins</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {plugins.map((plugin) => {
            const Icon = plugin.icon;
            return (
              <li key={plugin.name} className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${plugin.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{plugin.name}</p>
                  <p className="text-xs text-muted-foreground">{plugin.description}</p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0">
                  Install
                </Button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
