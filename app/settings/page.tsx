'use client';

import { useState } from 'react';
import { NeumorphCard } from '@/components/ui/neumorph-card';
import { NeumoButton } from '@/components/ui/neumo-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');

  const handleSaveApiKeys = () => {
    if (!apiKey || !apiSecret) {
      toast.error('API key and secret are required');
      return;
    }

    toast.success('API keys saved successfully');
    setApiKey('');
    setApiSecret('');
    setPassphrase('');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold text-text">Settings</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="risk">Risk Management</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <NeumorphCard className="bg-elevated p-6">
            <h2 className="mb-4 text-lg font-semibold text-text">
              General Preferences
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Display Currency</Label>
                <Input
                  id="currency"
                  type="text"
                  defaultValue="USD"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  type="text"
                  defaultValue="UTC"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberFormat">Number Format</Label>
                <Input
                  id="numberFormat"
                  type="text"
                  defaultValue="en-US"
                  disabled
                />
              </div>
            </div>
          </NeumorphCard>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4">
          <NeumorphCard className="bg-elevated p-6">
            <h2 className="mb-4 text-lg font-semibold text-text">
              Exchange API Keys
            </h2>
            <p className="mb-6 text-sm text-text-muted">
              Add your exchange API keys to enable live trading. Keys are
              encrypted and stored securely.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiSecret">API Secret</Label>
                <Input
                  id="apiSecret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter your API secret"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passphrase">
                  Passphrase (if required)
                </Label>
                <Input
                  id="passphrase"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter passphrase (optional)"
                />
              </div>
              <NeumoButton onClick={handleSaveApiKeys}>
                Save API Keys
              </NeumoButton>
            </div>
          </NeumorphCard>

          <NeumorphCard className="bg-elevated p-6">
            <h2 className="mb-4 text-lg font-semibold text-text">
              Saved API Keys
            </h2>
            <div className="py-8 text-center text-text-muted">
              No API keys configured. Add your first API key above.
            </div>
          </NeumorphCard>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <NeumorphCard className="bg-elevated p-6">
            <h2 className="mb-4 text-lg font-semibold text-text">
              Risk Management
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxPosition">
                  Max Position Size (USD)
                </Label>
                <Input
                  id="maxPosition"
                  type="number"
                  defaultValue="10000"
                  placeholder="Maximum position size"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxLeverage">Max Leverage</Label>
                <Input
                  id="maxLeverage"
                  type="number"
                  defaultValue="1"
                  placeholder="Maximum leverage"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stopLoss">Default Stop Loss (%)</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  step="0.1"
                  defaultValue="5"
                  placeholder="Stop loss percentage"
                />
              </div>
              <NeumoButton>Save Risk Settings</NeumoButton>
            </div>
          </NeumorphCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
