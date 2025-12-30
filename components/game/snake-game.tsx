'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/lib/stores/game-store';
import { useFarmingStore } from '@/lib/stores/farming-store';
import { Button } from '@/components/ui/button';
import { Trophy, Play, RotateCcw } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const GAME_SPEED = 150;

export const SnakeGame = () => {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [score, setScore] = useState(0);
  
  const updateGameScore = useGameStore((state) => state.updateScore);
  const addXP = useFarmingStore((state) => state.addXP);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const generateFood = useCallback(() => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const isOnSnake = snake.some(segment => segment.x === newFood!.x && segment.y === newFood!.y);
      if (!isOnSnake) break;
    }
    setFood(newFood);
  }, [snake]);

  const moveSnake = useCallback(() => {
    if (isGameOver || !isStarted) return;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = {
        x: (head.x + direction.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + direction.y + GRID_SIZE) % GRID_SIZE,
      };

      // Check collision with self
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        const xpEarned = Math.floor(score / 10);
        updateGameScore(score);
        addXP(xpEarned);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check if food eaten
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        generateFood();
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, isGameOver, isStarted, score, generateFood, updateGameScore, addXP]);

  useEffect(() => {
    if (isStarted && !isGameOver) {
      gameLoopRef.current = setInterval(moveSnake, GAME_SPEED);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isStarted, isGameOver, moveSnake]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': if (direction.y === 0) setDirection({ x: 0, y: -1 }); break;
        case 'ArrowDown': if (direction.y === 0) setDirection({ x: 0, y: 1 }); break;
        case 'ArrowLeft': if (direction.x === 0) setDirection({ x: -1, y: 0 }); break;
        case 'ArrowRight': if (direction.x === 0) setDirection({ x: 1, y: 0 }); break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [direction]);

  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setIsGameOver(false);
    setIsStarted(true);
    setScore(0);
    generateFood();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-xl border border-border shadow-lg">
      <div className="flex justify-between w-full items-center mb-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="font-bold text-xl">{score}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          XP Reward: {Math.floor(score / 10)}
        </div>
      </div>

      <div 
        className="relative bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-800"
        style={{ 
          width: GRID_SIZE * 15, 
          height: GRID_SIZE * 15,
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
        }}
      >
        {snake.map((segment, i) => (
          <div
            key={i}
            className="bg-primary rounded-sm"
            style={{
              gridColumnStart: segment.x + 1,
              gridRowStart: segment.y + 1,
              opacity: 1 - (i / snake.length) * 0.5
            }}
          />
        ))}
        <div
          className="bg-red-500 rounded-full animate-pulse"
          style={{
            gridColumnStart: food.x + 1,
            gridRowStart: food.y + 1,
          }}
        />

        {(!isStarted || isGameOver) && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
            {isGameOver && (
              <div className="text-white text-2xl font-bold mb-4">GAME OVER</div>
            )}
            <Button onClick={startGame} size="lg" className="gap-2">
              {isGameOver ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isGameOver ? 'Try Again' : 'Start Game'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 md:hidden">
        <div />
        <Button variant="outline" onClick={() => direction.y === 0 && setDirection({ x: 0, y: -1 })}>↑</Button>
        <div />
        <Button variant="outline" onClick={() => direction.x === 0 && setDirection({ x: -1, y: 0 })}>←</Button>
        <Button variant="outline" onClick={() => direction.y === 0 && setDirection({ x: 0, y: 1 })}>↓</Button>
        <Button variant="outline" onClick={() => direction.x === 0 && setDirection({ x: 1, y: 0 })}>→</Button>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2">
        Use arrow keys or buttons to move. Earn 1 XP for every 10 points!
      </p>
    </div>
  );
};
