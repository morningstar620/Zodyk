import { Badge, Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';

const updates = [
  {
    title: 'Visual workflow builder GA',
    tag: 'v2.4.1',
    tagVariant: 'default' as const,
    time: '2d ago',
  },
  {
    title: 'Theme editor multi-file support',
    tag: 'Feature',
    tagVariant: 'purple' as const,
    time: '5d ago',
  },
  {
    title: 'REST API v2 pagination',
    tag: 'API',
    tagVariant: 'secondary' as const,
    time: '1w ago',
  },
  {
    title: 'Media library bulk actions',
    tag: 'v2.3.8',
    tagVariant: 'default' as const,
    time: '2w ago',
  },
] as const;

export function WhatsNewCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle>What&apos;s new</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {updates.map((item) => (
            <li key={item.title} className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <Badge variant={item.tagVariant}>{item.tag}</Badge>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
