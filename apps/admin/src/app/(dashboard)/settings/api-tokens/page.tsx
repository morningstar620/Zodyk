'use client';

import { ALL_PERMISSIONS } from '@zodyk/core';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@zodyk/shared-ui';
import { useEffect, useState } from 'react';
import { ApiTokensPageSkeleton } from '@/components/skeletons';

interface ApiTokenRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export default function ApiTokensPage() {
  const [tokens, setTokens] = useState<ApiTokenRow[]>([]);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  function loadTokens() {
    fetch('/api/v1/api-tokens')
      .then((r) => r.json())
      .then((data) => {
        setTokens(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadTokens();
  }, []);

  function toggleScope(scope: string) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  async function createToken() {
    setError(null);
    const res = await fetch('/api/v1/api-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, scopes }),
    });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Failed to create token');
      return;
    }

    const data = await res.json();
    setNewToken(data.token);
    setName('');
    setScopes([]);
    loadTokens();
  }

  async function revokeToken(id: string) {
    await fetch(`/api/v1/api-tokens/${id}`, { method: 'DELETE' });
    loadTokens();
  }

  if (loading) return <ApiTokensPageSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">API Tokens</h1>
        <p className="text-zinc-600">Generate scoped tokens for REST API access</p>
      </div>

      {newToken && (
        <Alert variant="success">
          <p className="mb-1 font-medium">Copy your token now — it won&apos;t be shown again:</p>
          <code className="break-all text-xs">{newToken}</code>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create token</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Token name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Scopes</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={scopes.includes(perm)}
                    onChange={() => toggleScope(perm)}
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>
          <Button onClick={createToken} disabled={!name || scopes.length === 0}>
            Generate token
          </Button>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-zinc-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Scopes</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((token) => (
              <TableRow key={token.id}>
                <TableCell>{token.name}</TableCell>
                <TableCell>
                  <code className="text-xs">{token.prefix}...</code>
                </TableCell>
                <TableCell className="text-xs">{token.scopes.join(', ')}</TableCell>
                <TableCell className="text-xs">
                  {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : 'Never'}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => revokeToken(token.id)}>
                    Revoke
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
