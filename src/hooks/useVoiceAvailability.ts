import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface VoiceAvailability {
  ready: boolean;
  hasFrench: boolean;
  totalVoices: number;
}

/** Polls expo-speech for available voices and reports whether any French one is present. */
export function useVoiceAvailability(): VoiceAvailability {
  const [state, setState] = useState<VoiceAvailability>({
    ready: false,
    hasFrench: true, // optimistic — avoid flashing the warning banner
    totalVoices: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let voices = await Speech.getAvailableVoicesAsync().catch(() => []);
      if ((!voices || voices.length === 0) && Platform.OS === 'web') {
        for (let i = 0; i < 10 && (!voices || voices.length === 0); i++) {
          await new Promise((r) => setTimeout(r, 250));
          voices = await Speech.getAvailableVoicesAsync().catch(() => []);
        }
      }
      if (cancelled) return;
      const frenchCount = (voices ?? []).filter((v) =>
        (v.language ?? '').toLowerCase().startsWith('fr')
      ).length;
      setState({
        ready: true,
        hasFrench: frenchCount > 0,
        totalVoices: voices?.length ?? 0,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
