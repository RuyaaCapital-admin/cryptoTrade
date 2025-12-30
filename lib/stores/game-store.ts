import { create } from 'zustand';

interface GameState {
  highScore: number;
  lastScore: number;
  gamesPlayed: number;
  totalXpEarned: number;
  
  updateScore: (score: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  highScore: 0,
  lastScore: 0,
  gamesPlayed: 0,
  totalXpEarned: 0,

  updateScore: (score) => set((state) => {
    const xpEarned = Math.floor(score / 10);
    return {
      lastScore: score,
      highScore: Math.max(state.highScore, score),
      gamesPlayed: state.gamesPlayed + 1,
      totalXpEarned: state.totalXpEarned + xpEarned,
    };
  }),
}));
