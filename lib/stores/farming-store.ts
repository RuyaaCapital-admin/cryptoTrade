import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PowerPackage {
  id: string;
  name: string;
  multiplier: number;
  cost: number;
  duration: number; // in hours
  expiresAt?: number;
}

interface FarmingState {
  balance: number;
  xp: number;
  lastCheckIn: number | null;
  checkInStreak: number;
  isFarming: boolean;
  farmingStartTime: number | null;
  farmingDuration: number; // 4 hours in ms
  baseRate: number; // coins per hour
  activePackages: PowerPackage[];
  
  // Actions
  startFarming: () => void;
  claimFarming: () => void;
  dailyCheckIn: () => void;
  buyPackage: (pkg: PowerPackage) => void;
  addXP: (amount: number) => void;
  addBalance: (amount: number) => void;
}

export const useFarmingStore = create<FarmingState>()(
  persist(
    (set, get) => ({
      balance: 0,
      xp: 0,
      lastCheckIn: null,
      checkInStreak: 0,
      isFarming: false,
      farmingStartTime: null,
      farmingDuration: 4 * 60 * 60 * 1000, // 4 hours
      baseRate: 10,
      activePackages: [],

      startFarming: () => {
        if (get().isFarming) return;
        set({ isFarming: true, farmingStartTime: Date.now() });
      },

      claimFarming: () => {
        const { isFarming, farmingStartTime, farmingDuration, baseRate, activePackages } = get();
        if (!isFarming || !farmingStartTime) return;

        const now = Date.now();
        const elapsed = now - farmingStartTime;
        
        if (elapsed >= farmingDuration) {
          const multiplier = activePackages.reduce((acc, pkg) => acc * pkg.multiplier, 1);
          const earned = (baseRate * (farmingDuration / (60 * 60 * 1000))) * multiplier;
          
          set((state) => ({
            balance: state.balance + earned,
            isFarming: false,
            farmingStartTime: null,
          }));
        }
      },

      dailyCheckIn: () => {
        const now = Date.now();
        const { lastCheckIn, checkInStreak } = get();
        const oneDay = 24 * 60 * 60 * 1000;

        if (lastCheckIn && now - lastCheckIn < oneDay) return;

        const newStreak = (lastCheckIn && now - lastCheckIn < 2 * oneDay) ? checkInStreak + 1 : 1;
        const rewardXp = 10 * newStreak;

        set((state) => ({
          lastCheckIn: now,
          checkInStreak: newStreak,
          xp: state.xp + rewardXp,
        }));
      },

      buyPackage: (pkg) => {
        const { balance } = get();
        if (balance < pkg.cost) return;

        const expiresAt = Date.now() + pkg.duration * 60 * 60 * 1000;
        set((state) => ({
          balance: state.balance - pkg.cost,
          activePackages: [...state.activePackages, { ...pkg, expiresAt }],
        }));
      },

      addXP: (amount) => set((state) => ({ xp: state.xp + amount })),
      addBalance: (amount) => set((state) => ({ balance: state.balance + amount })),
    }),
    {
      name: 'next-trade-farming',
    }
  )
);
