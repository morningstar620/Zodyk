import { Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';

const details = [
  { label: 'Hostname', value: 'acme.studio' },
  { label: 'Version', value: 'v2.4.0' },
  { label: 'Runtime', value: 'Docker' },
  { label: 'Uptime', value: '14d 6h' },
] as const;

export function SelfHostingCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle>Self hosting</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {details.map((item) => (
            <div key={item.label}>
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="text-sm font-medium text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
        <div className="overflow-hidden rounded-lg bg-zinc-950 p-4 dark:bg-black">
          <pre className="overflow-x-auto text-xs text-zinc-300">
            <code>{`$ docker compose pull && docker compose up -d`}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
