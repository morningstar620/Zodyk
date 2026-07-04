import { Badge, Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';

const services = [
  { name: 'Zodyk core', version: 'v2.4.0', status: 'Operational' },
  { name: 'MongoDB', version: 'v7.0', status: 'Operational' },
  { name: 'Redis', version: 'v7.2', status: 'Operational' },
  { name: 'Media storage', version: 'S3', status: 'Operational' },
  { name: 'Search index', version: 'v1.2', status: 'Operational' },
] as const;

export function InstanceHealthCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle>Instance health</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {services.map((service) => (
            <li key={service.name} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{service.name}</p>
                <p className="text-xs text-muted-foreground">{service.version}</p>
              </div>
              <Badge variant="success">{service.status}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
