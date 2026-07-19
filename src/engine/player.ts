import type {
  CustomCountingMode,
  Exercise,
  RepetitionExercise,
  Step,
  TimeExercise,
  VoiceSettings,
} from '../types';
import { WaitController } from './controller';
import { effectiveCount, generateCountLabels } from './counting';
import { Speaker } from './speaker';

export type PlayerStatus = 'idle' | 'running' | 'paused' | 'finished' | 'cancelled';

export interface PlayerState {
  status: PlayerStatus;
  exerciseIndex: number;
  totalExercises: number;
  currentExercise: Exercise | null;
  currentStepIndex: number;
  currentRepetition: number;
  /** Vocalised label for the current rep (e.g. "8" or "1"), useful for UI display. */
  currentRepLabel: string;
  currentInstruction: string;
  elapsedInStepMs: number;
  stepDurationMs: number;
}

const INITIAL: PlayerState = {
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
};

type Listener = (state: PlayerState) => void;

export class WorkoutPlayer {
  private state: PlayerState = { ...INITIAL };
  private listeners = new Set<Listener>();
  private ctrl: WaitController | null = null;
  private speaker: Speaker;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private stepStartedAt = 0;
  private stepPausedElapsed = 0;
  private customModes: ReadonlyArray<CustomCountingMode> = [];

  constructor(settings: VoiceSettings) {
    this.speaker = new Speaker(settings);
  }

  async init(): Promise<void> {
    await this.speaker.init();
  }

  async updateVoice(settings: VoiceSettings): Promise<void> {
    await this.speaker.update(settings);
  }

  setCustomModes(modes: ReadonlyArray<CustomCountingMode>): void {
    this.customModes = modes;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => {
      this.listeners.delete(fn);
    };
  }

  getState(): PlayerState {
    return this.state;
  }

  private setState(patch: Partial<PlayerState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn(this.state));
  }

  async start(exercises: Exercise[]): Promise<void> {
    if (this.state.status === 'running' || this.state.status === 'paused') {
      this.stop();
    }
    if (exercises.length === 0) return;
    this.ctrl = new WaitController();
    this.setState({
      ...INITIAL,
      status: 'running',
      totalExercises: exercises.length,
    });

    for (let i = 0; i < exercises.length; i++) {
      if (!this.ctrl || this.ctrl.getFlag() === 'cancel') break;
      const ex = exercises[i];
      this.setState({
        exerciseIndex: i,
        currentExercise: ex,
        currentStepIndex: 0,
        currentRepetition: 0,
        currentRepLabel: '',
        currentInstruction: ex.name,
      });
      this.speaker.speak(ex.name);
      await this.ctrl.wait(1500);
      if (this.ctrl.getFlag() === 'cancel') break;
      if (this.ctrl.getFlag() === 'skip-exercise') {
        this.ctrl.clearFlag();
        continue;
      }

      if (ex.type === 'time') {
        await this.runTimeExercise(ex);
      } else {
        await this.runRepExercise(ex);
      }

      if (this.ctrl.getFlag() === 'skip-exercise') this.ctrl.clearFlag();
      if (this.ctrl.getFlag() === 'cancel') break;
    }

    const wasCancelled = this.ctrl?.getFlag() === 'cancel';
    this.speaker.stop();
    this.stopTick();
    this.setState({
      status: wasCancelled ? 'cancelled' : 'finished',
      currentInstruction: wasCancelled ? '' : 'Terminé',
    });
    this.ctrl = null;
  }

  private async runTimeExercise(ex: TimeExercise): Promise<void> {
    if (!this.ctrl) return;
    const mode = ex.countingMode ?? 'linear';

    // Silent mode: duration is the real number of seconds, no voice counting.
    if (mode === 'silent') {
      const totalDurationMs = ex.duration * 1000;
      this.setState({
        currentInstruction: ex.name,
        stepDurationMs: totalDurationMs,
        elapsedInStepMs: 0,
      });
      this.startTick(totalDurationMs);
      await this.ctrl.wait(totalDurationMs);
      this.stopTick();
      return;
    }

    const totalCount = effectiveCount(mode, ex.duration, this.customModes);
    const interval = mode === 'pyramid8' ? 1000 : Math.max(250, Math.round(1000 / ex.pace));
    const labels = generateCountLabels(mode, totalCount, this.customModes);

    this.setState({
      currentInstruction: ex.name,
      stepDurationMs: totalCount * interval,
      elapsedInStepMs: 0,
    });
    this.startTick(totalCount * interval);

    for (let i = 0; i < totalCount; i++) {
      this.speaker.speak(labels[i]);
      await this.ctrl.wait(interval);
      if (!this.ctrl) return;
      if (this.ctrl.getFlag() === 'cancel') return;
      if (this.ctrl.getFlag() === 'skip-exercise') return;
      if (this.ctrl.getFlag() === 'skip-step') {
        this.ctrl.clearFlag();
        return;
      }
    }
    this.stopTick();
  }

  private async runRepExercise(ex: RepetitionExercise): Promise<void> {
    if (!this.ctrl) return;
    const repMode = ex.repCountingMode ?? 'linear';
    const totalReps = effectiveCount(repMode, ex.repetitions, this.customModes);
    const repLabels = generateCountLabels(repMode, totalReps, this.customModes);

    for (let r = 0; r < totalReps; r++) {
      if (!this.ctrl || this.ctrl.getFlag() === 'cancel') return;
      if (this.ctrl.getFlag() === 'skip-exercise') return;
      const repLabel = repLabels[r];
      this.setState({ currentRepetition: r + 1, currentRepLabel: repLabel });
      this.speaker.speak(repLabel);
      await this.ctrl.wait(700);
      if (!this.ctrl || this.ctrl.getFlag() === 'cancel') return;
      if (this.ctrl.getFlag() === 'skip-exercise') return;

      for (let s = 0; s < ex.steps.length; s++) {
        if (!this.ctrl || this.ctrl.getFlag() === 'cancel') return;
        if (this.ctrl.getFlag() === 'skip-exercise') return;
        const step = ex.steps[s];
        this.setState({
          currentStepIndex: s,
          currentInstruction: step.instruction,
          stepDurationMs: step.duration * 1000,
          elapsedInStepMs: 0,
        });
        await this.runStep(step);
        if (!this.ctrl || this.ctrl.getFlag() === 'cancel') return;
        if (this.ctrl.getFlag() === 'skip-exercise') return;
        if (this.ctrl.getFlag() === 'skip-step') this.ctrl.clearFlag();
      }
    }
    this.stopTick();
  }

  private async runStep(step: Step): Promise<void> {
    if (!this.ctrl) return;
    const totalDurationMs = step.duration * 1000;
    this.startTick(totalDurationMs);
    this.speaker.speak(step.instruction);

    if (step.internalCount && step.internalCount !== 'none' && step.duration >= 1) {
      // Brief pause to let the instruction be heard before counting starts.
      const lead = Math.min(700, totalDurationMs * 0.15);
      await this.ctrl.wait(lead);
      if (this.handleFlagInStep()) return;

      const remainingMs = Math.max(0, totalDurationMs - lead);
      const totalCount = effectiveCount(
        step.internalCount,
        step.duration,
        this.customModes
      );
      const labels = generateCountLabels(
        step.internalCount,
        totalCount,
        this.customModes
      );
      const interval = remainingMs / totalCount;

      for (let i = 0; i < totalCount; i++) {
        this.speaker.speak(labels[i]);
        await this.ctrl.wait(interval);
        if (this.handleFlagInStep()) return;
      }
    } else {
      await this.ctrl.wait(totalDurationMs);
      this.handleFlagInStep();
    }
    this.stopTick();
  }

  private handleFlagInStep(): boolean {
    if (!this.ctrl) return true;
    const flag = this.ctrl.getFlag();
    if (flag === 'cancel') return true;
    if (flag === 'skip-exercise') return true;
    if (flag === 'skip-step') {
      this.ctrl.clearFlag();
      return true;
    }
    return false;
  }

  private startTick(durationMs: number): void {
    this.stopTick();
    this.stepStartedAt = Date.now();
    this.stepPausedElapsed = 0;
    this.setState({ elapsedInStepMs: 0, stepDurationMs: durationMs });
    this.tickInterval = setInterval(() => {
      if (this.state.status !== 'running') return;
      const elapsed = this.stepPausedElapsed + (Date.now() - this.stepStartedAt);
      this.setState({ elapsedInStepMs: Math.min(elapsed, this.state.stepDurationMs) });
    }, 100);
  }

  private stopTick(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  pause(): void {
    if (this.state.status !== 'running' || !this.ctrl) return;
    this.ctrl.pause();
    this.speaker.stop();
    this.stepPausedElapsed += Date.now() - this.stepStartedAt;
    this.setState({ status: 'paused' });
  }

  resume(): void {
    if (this.state.status !== 'paused' || !this.ctrl) return;
    this.stepStartedAt = Date.now();
    this.ctrl.resume();
    this.setState({ status: 'running' });
  }

  skipStep(): void {
    this.ctrl?.skipStep();
    this.speaker.stop();
  }

  skipExercise(): void {
    this.ctrl?.skipExercise();
    this.speaker.stop();
  }

  stop(): void {
    this.ctrl?.cancel();
    this.speaker.stop();
    this.stopTick();
  }
}
