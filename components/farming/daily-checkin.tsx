'use client';

import React from 'react';
import { useFarmingStore } from '@/lib/stores/farming-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck, Star, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DailyCheckIn = () => {
  const { lastCheckIn, checkInStreak, dailyCheckIn, xp } = useFarmingStore();
  
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const canCheckIn = !lastCheckIn || (now - lastCheckIn >= oneDay);

  const days = [1, 2, 3, 4, 5, 6, 7];

  return (
    <Card className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-none shadow-none">
      <CardContent className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <CalendarCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Daily Check-in</h3>
              <p className="text-sm text-muted-foreground">Streak: {checkInStreak} days</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-background/50 px-3 py-1 rounded-full border border-border">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-bold">{xp} XP</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const isCompleted = day <= checkInStreak;
            const isCurrent = day === checkInStreak + 1 && canCheckIn;
            
            return (
              <div 
                key={day}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                  isCompleted ? "bg-primary text-primary-foreground border-primary" : 
                  isCurrent ? "bg-background border-primary animate-pulse" : "bg-background/50 border-border"
                )}
              >
                <span className="text-[10px] uppercase font-bold">Day {day}</span>
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-bold">+{day * 10}</span>
                )}
              </div>
            );
          })}
        </div>

        <Button 
          onClick={dailyCheckIn} 
          disabled={!canCheckIn}
          className="w-full font-bold h-12"
          variant={canCheckIn ? "default" : "secondary"}
        >
          {canCheckIn ? "Claim Daily Reward" : "Come back tomorrow!"}
        </Button>
      </CardContent>
    </Card>
  );
};
