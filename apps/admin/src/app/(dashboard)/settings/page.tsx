import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@zodyk/shared-ui';

const settingsLinks = [
  { href: '/settings/profile', title: 'Profile', description: 'View your account information' },
  { href: '/settings/mfa', title: 'Two-factor auth', description: 'Manage MFA settings' },
  { href: '/settings/api-tokens', title: 'API tokens', description: 'Manage API access tokens' },
  {
    href: '/settings/integrations',
    title: 'Integrations',
    description: 'Configure Cloudflare R2 media storage',
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="text-zinc-600">Manage your account and security preferences</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {settingsLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle>{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
