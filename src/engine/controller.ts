export type ControlFlag = 'none' | 'skip-step' | 'skip-exercise' | 'cancel';

export class WaitController {
  private resolveWait?: () => void;
  private remainingMs = 0;
  private startedAt = 0;
  private paused = false;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  flag: ControlFlag = 'none';

  wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.remainingMs = ms;
      this.resolveWait = resolve;
      if (this.paused) return;
      this.schedule();
    });
  }

  private schedule(): void {
    this.startedAt = Date.now();
    this.timeoutHandle = setTimeout(() => this.finishWait(), this.remainingMs);
  }

  private finishWait(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    const r = this.resolveWait;
    this.resolveWait = undefined;
    this.remainingMs = 0;
    r?.();
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
      this.remainingMs = Math.max(0, this.remainingMs - (Date.now() - this.startedAt));
    }
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    if (this.resolveWait && this.remainingMs > 0) this.schedule();
    else if (this.resolveWait) this.finishWait();
  }

  isPaused(): boolean {
    return this.paused;
  }

  wake(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    this.finishWait();
  }

  skipStep(): void {
    this.flag = 'skip-step';
    this.wake();
  }

  skipExercise(): void {
    this.flag = 'skip-exercise';
    this.wake();
  }

  cancel(): void {
    this.flag = 'cancel';
    this.wake();
  }

  clearFlag(): void {
    this.flag = 'none';
  }

  getFlag(): ControlFlag {
    return this.flag;
  }
}
