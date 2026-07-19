import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import type { Language, VoiceSettings } from '../types';

const LANG_MAP: Record<Language, string> = {
  fr: 'fr-FR',
  en: 'en-US',
};

interface VoiceInfo {
  identifier: string;
  name?: string;
  language?: string;
  quality?: string;
}

export class Speaker {
  private settings: VoiceSettings;
  private voiceIdentifier?: string;
  private availableVoices: VoiceInfo[] = [];

  constructor(settings: VoiceSettings) {
    this.settings = settings;
  }

  async init(): Promise<void> {
    this.availableVoices = await this.loadVoices();
    this.voiceIdentifier = this.pickVoice(this.availableVoices);
    this.logSelection();
  }

  /** Load voices, retrying on web where they arrive asynchronously. */
  private async loadVoices(): Promise<VoiceInfo[]> {
    try {
      let voices = await Speech.getAvailableVoicesAsync();
      // On web the list is often empty until the SpeechSynthesis subsystem warms up.
      if ((!voices || voices.length === 0) && Platform.OS === 'web') {
        for (let i = 0; i < 10 && (!voices || voices.length === 0); i++) {
          await new Promise((r) => setTimeout(r, 200));
          voices = await Speech.getAvailableVoicesAsync();
        }
      }
      return voices ?? [];
    } catch {
      return [];
    }
  }

  private pickVoice(voices: VoiceInfo[]): string | undefined {
    if (voices.length === 0) return undefined;
    const langPrefix = this.settings.language;
    const matching = voices.filter((v) =>
      (v.language ?? '').toLowerCase().startsWith(langPrefix)
    );
    if (matching.length === 0) return undefined;

    const isFemaleName = (n?: string) =>
      !!n &&
      /female|femme|woman|amelie|am[ée]lie|audrey|marie|c[ée]line|julie|virginie|hortense|lucie|samantha|victoria|paulina|ewa|agnieszka|zofia|maja/i.test(
        n
      );
    const isMaleName = (n?: string) =>
      !!n &&
      /male|homme|man|thomas|daniel|alex|fred|paul|nicolas|henri|adam|jacek|piotr|krzysztof|jakub/i.test(
        n
      );

    const wantedFemale = this.settings.gender === 'female';
    const matchedByGender = matching.find((v) =>
      wantedFemale ? isFemaleName(v.name) : isMaleName(v.name)
    );
    return (matchedByGender ?? matching[0]).identifier;
  }

  private logSelection(): void {
    if (typeof console === 'undefined') return;
    const langs = Array.from(
      new Set(this.availableVoices.map((v) => v.language ?? 'unknown'))
    );
    const frVoices = this.availableVoices.filter((v) =>
      (v.language ?? '').toLowerCase().startsWith('fr')
    );
    // eslint-disable-next-line no-console
    console.log(
      '[Speaker] voices total =',
      this.availableVoices.length,
      'languages =',
      langs.slice(0, 12),
      'french =',
      frVoices.map((v) => `${v.name ?? '?'} (${v.language})`),
      'picked =',
      this.voiceIdentifier ?? '(default OS voice — language tag will steer it)'
    );
    if (this.settings.language === 'fr' && frVoices.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        '[Speaker] Aucune voix française installée sur ce système. Sur Windows : Paramètres → Heure et langue → Parole → Ajouter des voix → Français (France). Sur Chrome : la voix vient du système.'
      );
    }
  }

  async update(settings: VoiceSettings): Promise<void> {
    this.settings = settings;
    this.voiceIdentifier = this.pickVoice(this.availableVoices);
    this.logSelection();
  }

  getAvailableVoices(): VoiceInfo[] {
    return this.availableVoices;
  }

  speak(text: string): void {
    if (!text) return;
    Speech.stop();
    Speech.speak(text, {
      language: LANG_MAP[this.settings.language],
      rate: this.settings.rate,
      voice: this.voiceIdentifier,
    });
  }

  stop(): void {
    Speech.stop();
  }
}
