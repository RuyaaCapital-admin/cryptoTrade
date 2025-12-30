'use client';

import React, { useEffect, useState } from 'react';
import { useFarmingStore } from '@/lib/stores/farming-store';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pickaxe, Zap, TrendingUp, Clock, Coins } from 'lucide-react';

export const FarmingDashboard = () => {
  const { 
    balance, 
    isFarming, 
    farmingStartTime, 
    farmingDuration, 
    startFarming, 
    claimFarming,
    activePackages,
    buyPackage
  } = useFarmingStore();

  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isFarming && farmingStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - farmingStartTime;
        const p = Math.min((elapsed / farmingDuration) * 100, 100);
        setProgress(p);

        const remaining = Math.max(farmingDuration - elapsed, 0);
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFarming, farmingStartTime, farmingDuration]);

  const packages = [
    { id: 'p1', name: 'Silver Drill', multiplier: 1.5, cost: 100, duration: 24 },
    { id: 'p2', name: 'Gold Drill', multiplier: 2.5, cost: 500, duration: 24 },
    { id: 'p3', name: 'Diamond Drill', multiplier: 5.0, cost: 2000, duration: 24 },
  ];

  return (
    <div className="space-y-6">
      {/* Main Farming Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Pickaxe className="w-6 h-6 text-primary" />
            Next Farming
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <div className="flex items-center gap-2">
                <Coins className="w-6 h-6 text-yellow-500" />
                <span className="text-3xl font-bold">{balance.toFixed(2)}</span>
              </div>
            </div>
            {isFarming && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Time Remaining</p>
                <p className="text-xl font-mono font-bold text-primary">{timeLeft}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Farming Progress</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {!isFarming ? (
            <Button onClick={startFarming} className="w-full h-14 text-lg font-bold gap-2 shadow-lg shadow-primary/20">
              <Zap className="w-5 h-5 fill-current" />
              Start Farming (4h)
            </Button>
          ) : (
            <Button 
              onClick={claimFarming} 
              disabled={progress < 100}
              className="w-full h-14 text-lg font-bold gap-2"
              variant={progress < 100 ? "secondary" : "default"}
            >
              {progress < 100 ? "Farming in Progress..." : "Claim Rewards"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Power Packages */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Power Packages
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="relative overflow-hidden group hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="font-bold">{pkg.name}</div>
                  <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-bold">
                    {pkg.multiplier}x Boost
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" /> {pkg.duration}h Duration
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => buyPackage(pkg)}
                  disabled={balance < pkg.cost}
                >
                  Buy for {pkg.cost} Coins
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
