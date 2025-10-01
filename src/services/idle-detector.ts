export class IdleDetector {
  private lastActivityTime: number = Date.now();
  private timer: number | null = null;
  private callback: (() => void) | null = null;
  private delayMs: number = 5000;
  private enabled: boolean = false;

  constructor() {
    this.resetActivity = this.resetActivity.bind(this);
  }

  start(delayMs: number, callback: () => void) {
    // Stop any existing timer first
    this.stop();

    this.delayMs = delayMs;
    this.callback = callback;
    this.enabled = true;
    this.resetActivity();
    this.attachListeners();
    this.startTimer();
  }

  stop() {
    this.enabled = false;
    this.detachListeners();
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  updateDelay(delayMs: number) {
    this.delayMs = delayMs;
    this.resetActivity();
  }

  private resetActivity() {
    this.lastActivityTime = Date.now();
  }

  private attachListeners() {
    document.addEventListener("mousemove", this.resetActivity);
    document.addEventListener("mousedown", this.resetActivity);
    document.addEventListener("keydown", this.resetActivity);
    document.addEventListener("scroll", this.resetActivity);
    document.addEventListener("touchstart", this.resetActivity);
  }

  private detachListeners() {
    document.removeEventListener("mousemove", this.resetActivity);
    document.removeEventListener("mousedown", this.resetActivity);
    document.removeEventListener("keydown", this.resetActivity);
    document.removeEventListener("scroll", this.resetActivity);
    document.removeEventListener("touchstart", this.resetActivity);
  }

  private startTimer() {
    // Check every 100ms for better responsiveness
    this.timer = window.setInterval(() => {
      if (!this.enabled || !this.callback) return;

      const idleTime = Date.now() - this.lastActivityTime;
      if (idleTime >= this.delayMs) {
        this.callback();
      }
    }, 100);
  }
}
