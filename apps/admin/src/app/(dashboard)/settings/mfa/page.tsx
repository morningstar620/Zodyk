'use client';

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@zodyk/shared-ui';
import Image from 'next/image';
import { useState } from 'react';

export default function MfaSettingsPage() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function startSetup() {
    setError(null);
    const res = await fetch('/api/auth/mfa/setup');
    if (!res.ok) {
      setError('Failed to start MFA setup');
      return;
    }
    const data = await res.json();
    setQrCode(data.qrCode);
    setSecret(data.secret);
  }

  async function enableMfa() {
    if (!secret) return;
    setError(null);
    const res = await fetch('/api/auth/mfa/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'enable', secret, code }),
    });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Failed to enable MFA');
      return;
    }

    const data = await res.json();
    setBackupCodes(data.backupCodes);
    setSuccess('MFA enabled successfully');
    setQrCode(null);
    setSecret(null);
  }

  async function disableMfa() {
    setError(null);
    const res = await fetch('/api/auth/mfa/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disable' }),
    });

    if (!res.ok) {
      setError('Failed to disable MFA');
      return;
    }
    setSuccess('MFA disabled');
    setBackupCodes(null);
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Two-factor authentication</h1>
      <Card>
        <CardHeader>
          <CardTitle>MFA settings</CardTitle>
          <CardDescription>
            Add an extra layer of security with TOTP authenticator apps
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          {backupCodes && (
            <Alert variant="default">
              <p className="mb-2 font-medium">Save your backup codes:</p>
              <div className="grid grid-cols-2 gap-1 font-mono text-xs">
                {backupCodes.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
            </Alert>
          )}

          {!qrCode && !backupCodes && (
            <Button onClick={startSetup}>Set up MFA</Button>
          )}

          {qrCode && secret && (
            <div className="flex flex-col gap-4">
              <Image src={qrCode} alt="MFA QR Code" width={200} height={200} className="mx-auto" />
              <p className="text-center text-xs text-zinc-500">
                Or enter manually: <code>{secret}</code>
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  placeholder="000000"
                />
              </div>
              <Button onClick={enableMfa} disabled={code.length !== 6}>
                Enable MFA
              </Button>
            </div>
          )}

          <Button variant="outline" onClick={disableMfa}>
            Disable MFA
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
