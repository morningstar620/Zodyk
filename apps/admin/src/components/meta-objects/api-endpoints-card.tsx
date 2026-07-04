import { Badge, Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';

type ApiEndpointsCardProps = {
  slug: string;
};

const endpoints = [
  { method: 'GET', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { method: 'POST', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { method: 'PUT', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { method: 'DEL', color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
] as const;

export function ApiEndpointsCard({ slug }: ApiEndpointsCardProps) {
  const paths = [
    `GET /api/${slug}`,
    `POST /api/${slug}`,
    `PUT /api/${slug}/:id`,
    `DEL /api/${slug}/:id`,
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>API endpoints</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {paths.map((path, index) => {
            const { method, color } = endpoints[index]!;
            return (
              <li
                key={path}
                className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 font-mono text-xs"
              >
                <Badge className={color}>{method}</Badge>
                <span className="text-foreground">{path.replace(`${method} `, '')}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
