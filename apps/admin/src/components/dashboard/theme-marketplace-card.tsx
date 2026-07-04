import { Badge, Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';
import Link from 'next/link';

const themes = [
  { name: 'Aurora', price: 'Free', gradient: 'from-blue-400 to-violet-500' },
  { name: 'Editorial', price: '$49', gradient: 'from-amber-400 to-orange-500' },
  { name: 'Studio', price: 'Free', gradient: 'from-emerald-400 to-teal-500' },
  { name: 'Commerce Pro', price: '$49', gradient: 'from-rose-400 to-pink-500' },
] as const;

export function ThemeMarketplaceCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle>Theme marketplace</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {themes.map((theme) => (
            <Link
              key={theme.name}
              href="/themes"
              className="group overflow-hidden rounded-lg border border-border transition-colors hover:bg-muted/30"
            >
              <div
                className={`aspect-[4/3] bg-gradient-to-br ${theme.gradient} opacity-80 transition-opacity group-hover:opacity-100`}
              />
              <div className="flex items-center justify-between p-2.5">
                <span className="text-sm font-medium text-foreground">{theme.name}</span>
                <Badge variant={theme.price === 'Free' ? 'success' : 'secondary'}>
                  {theme.price}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
