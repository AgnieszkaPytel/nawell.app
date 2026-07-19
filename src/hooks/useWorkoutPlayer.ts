import { useEffect, useRef, useState } from 'react';
import { WorkoutPlayer, type PlayerState } from '../engine';
import { getVoiceSettings, listCustomCountingModes } from '../storage';
import type { Exercise } from '../types';

export function useWorkoutPlayer() {
  const playerRef = useRef<WorkoutPlayer | null>(null);
  const [state, setState] = useState<PlayerState>({
    status: 'idle',
    exerciseIndex: 0,
    totalExercises: 0,
    currentExercise: null,
    currentStepIndex: 0,
    currentRepetition: 0,
    currentRepLabel: '',
    currentInstruction: '',
    elapsedInStepMs: 0,
    stepDurationMs: 0,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [settings, customModes] = await Promise.all([
        getVoiceSettings(),
        listCustomCountingModes(),
      ]);
      const player = new WorkoutPlayer(settings);
      player.setCustomModes(customModes);
      await player.init();
      if (cancelled) return;
      playerRef.current = player;
      const unsub = player.subscribe((s) => setState(s));
      setReady(true);
      return () => unsub();
    })();
    return () => {
      cancelled = true;
      playerRef.current?.stop();
    };
  }, []);

  return {
    state,
    ready,
    start: (exercises: Exercise[]) => playerRef.current?.start(exercises),
    pause: () => playerRef.current?.pause(),
    resume: () => playerRef.current?.resume(),
    skipStep: () => playerRef.current?.skipStep(),
    skipExercise: () => playerRef.current?.skipExercise(),
    stop: () => playerRef.current?.stop(),
  };
}
