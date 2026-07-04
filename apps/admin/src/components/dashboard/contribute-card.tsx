import { Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';
import { BookOpen, Bug, GitPullRequest } from 'lucide-react';

const links = [
  { label: 'Good first issues', count: 24, icon: Bug },
  { label: 'Improve the docs', count: 12, icon: BookOpen },
  { label: 'Open pull requests', count: 8, icon: GitPullRequest },
] as const;

export function ContributeCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle>Contribute</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.label}>
                <a
                  href="https://github.com/zodyk/zodyk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">{link.label}</span>
                  <span className="text-xs text-muted-foreground">{link.count}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
