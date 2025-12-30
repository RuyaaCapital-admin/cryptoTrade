'use client';

import React from 'react';
import { FarmingDashboard } from '@/components/farming/farming-dashboard';
import { DailyCheckIn } from '@/components/farming/daily-checkin';
import { SnakeGame } from '@/components/game/snake-game';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pickaxe, Gamepad2, Wallet, Settings } from 'lucide-react';

export default function NextTradePage() {
  return (
    <div className="max-w-md mx-auto min-h-screen blockchain-gradient p-4 pb-24">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-primary">NEXTTRADE</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Mini App Edition</p>
        </div>
        <div className="p-2 bg-card rounded-full border border-border">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
      </header>

      <DailyCheckIn />

      <div className="mt-8">
        <Tabs defaultValue="farming" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-card/50 border border-border">
            <TabsTrigger value="farming" className="gap-2">
              <Pickaxe className="w-4 h-4" /> Farming
            </TabsTrigger>
            <TabsTrigger value="game" className="gap-2">
              <Gamepad2 className="w-4 h-4" /> Snake
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="farming" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <FarmingDashboard />
          </TabsContent>
          
          <TabsContent value="game" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold">Snake Rewards</h2>
                <p className="text-sm text-muted-foreground">Play to earn XP and boost your rank</p>
              </div>
              <SnakeGame />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation for Mobile Feel */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-t border-border p-4 flex justify-around items-center z-50">
        <button className="flex flex-col items-center gap-1 text-primary">
          <Pickaxe className="w-6 h-6" />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
          <Wallet className="w-6 h-6" />
          <span className="text-[10px] font-bold">Wallet</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-bold">Settings</span>
        </button>
      </nav>
    </div>
  );
}
