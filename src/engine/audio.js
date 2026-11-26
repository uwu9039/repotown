/**
 * Zero-dependency WebAudio 8-bit SFX synthesizer.
 * Lazily unlocks AudioContext on the first user interaction.
 */

class RetroAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.lastStepAt = 0;
  }

  ensureCtx() {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
  }

  playTone(freq, duration = 0.08, type = "square", volume = 0.05, delay = 0) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  step() {
    const now = performance.now();
    if (now - this.lastStepAt < 190) return;
    this.lastStepAt = now;
    this.playTone(130 + Math.random() * 25, 0.035, "triangle", 0.025);
  }

  blip() {
    this.playTone(540 + Math.random() * 80, 0.04, "square", 0.028);
  }

  door() {
    this.playTone(330, 0.08, "triangle", 0.05, 0);
    this.playTone(494, 0.12, "triangle", 0.05, 0.06);
  }

  chest() {
    this.playTone(523.25, 0.09, "square", 0.04, 0);
    this.playTone(659.25, 0.09, "square", 0.04, 0.08);
    this.playTone(783.99, 0.14, "square", 0.04, 0.16);
    this.playTone(1046.5, 0.22, "square", 0.04, 0.24);
  }

  slime() {
    this.playTone(220, 0.07, "sine", 0.05, 0);
    this.playTone(340, 0.11, "sine", 0.04, 0.05);
  }

  fortune() {
    const notes = [523.25, 587.33, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.11, idx % 2 === 0 ? "triangle" : "sine", 0.045, idx * 0.065);
    });
  }

  teleport() {
    const notes = [392, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.14, "sine", 0.042, idx * 0.042);
    });
  }

  sit() {
    this.playTone(293.66, 0.06, "triangle", 0.04, 0);
    this.playTone(392.0, 0.08, "triangle", 0.035, 0.05);
  }

  victory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      this.playTone(freq, idx === 3 ? 0.22 : 0.08, "square", 0.035, idx * 0.07);
    });
  }

  kudos() {
    this.playTone(659.25, 0.07, "triangle", 0.04, 0);
    this.playTone(880.0, 0.11, "triangle", 0.04, 0.06);
  }

  battleStart() {
    const seq = [
      [587.33, 0.06, 0],
      [440.0, 0.06, 0.06],
      [587.33, 0.06, 0.12],
      [698.46, 0.07, 0.18],
      [880.0, 0.09, 0.25],
      [1174.66, 0.18, 0.33],
    ];
    for (const [freq, dur, delay] of seq) {
      this.playTone(freq, dur, "square", 0.036, delay);
    }
  }

  windmillWhoosh() {
    const notes = [240, 340, 480, 660];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.14, idx % 2 === 0 ? "triangle" : "sine", 0.042, idx * 0.045);
    });
  }

  scrollUnfurl() {
    const notes = [392, 523.25, 659.25];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.1, "triangle", 0.03, idx * 0.038);
    });
  }
}

export const retroAudio = new RetroAudio();
