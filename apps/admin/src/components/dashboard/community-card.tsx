import { Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';
import { MessageCircle } from 'lucide-react';
import { GitHubIcon } from '@/components/icons/github';

const stats = [
  { label: 'GitHub stars', value: '18.4k' },
  { label: 'Contributors', value: '142' },
  { label: 'Discord members', value: '3.2k' },
] as const;

export function CommunityCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle>Join the community</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center"
            >
              <p className="text-lg font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a
            href="https://github.com/zodyk/zodyk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            <GitHubIcon className="h-4 w-4" />
            Star on GitHub
          </a>
          <a
            href="https://discord.gg/zodyk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            <MessageCircle className="h-4 w-4" />
            Discord
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
