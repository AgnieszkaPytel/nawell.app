import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const KEY = 'calisthenics.onboarding.v2';

export interface OnboardingState {
  ready: boolean;
  active: boolean;
  stepIndex: number;
  totalSteps: number;
  /** Start the guided tour from the beginning. */
  start: () => void;
  /** Move to the next step (or finish if last). */
  next: () => void;
  /** Move to the previous step (no-op on first). */
  back: () => void;
  /** Skip / finish the tour and remember it as completed. */
  finish: () => Promise<void>;
}

const TOTAL_STEPS = 9;

const Ctx = createContext<OnboardingState>({
  ready: false,
  active: false,
  stepIndex: 0,
  totalSteps: TOTAL_STEPS,
  start: () => undefined,
  next: () => undefined,
  back: () => undefined,
  finish: async () => undefined,
});

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(KEY);
        if (cancelled) return;
        if (!seen) {
          setActive(true);
          setStepIndex(0);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const finish = useCallback(async () => {
    await AsyncStorage.setItem(KEY, '1');
    setActive(false);
    setStepIndex(0);
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= TOTAL_STEPS - 1) {
        // Finish on last step
        AsyncStorage.setItem(KEY, '1').catch(() => undefined);
        setActive(false);
        return 0;
      }
      return i + 1;
    });
  }, []);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
    AsyncStorage.removeItem(KEY).catch(() => undefined);
  }, []);

  const value = useMemo<OnboardingState>(
    () => ({
      ready,
      active,
      stepIndex,
      totalSteps: TOTAL_STEPS,
      start,
      next,
      back,
      finish,
    }),
    [ready, active, stepIndex, start, next, back, finish]
  );

  return createElement(Ctx.Provider, { value }, children);
}

export function useOnboarding(): OnboardingState {
  return useContext(Ctx);
}
