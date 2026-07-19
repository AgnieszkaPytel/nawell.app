import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VoiceSettings } from '../types';

const KEY = 'calisthenics.voice.v1';

const DEFAULT: VoiceSettings = {
  language: 'fr',
  gender: 'female',
  rate: 1,
};

export async function getVoiceSettings(): Promise<VoiceSettings> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULT;
  try {
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

export async function setVoiceSettings(settings: VoiceSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}
