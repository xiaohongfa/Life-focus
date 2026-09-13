/**
 * Web Audio API based synthesized sound effects engine for Life Strategy Game.
 * 100% offline, zero external asset dependencies, zero network requests.
 * Provides tactile mechanical clicks, heavy physical stamp thumps, and brass locks.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    try {
      const stored = localStorage.getItem('lifestrategy_sound_enabled');
      this.enabled = stored !== null ? stored === 'true' : true;
    } catch {
      this.enabled = true;
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem('lifestrategy_sound_enabled', String(this.enabled));
    } catch {}
    if (this.enabled) {
      this.playClick();
    }
    return this.enabled;
  }

  /**
   * Crisp mechanical switch / typewriter key click (for tab switching, toggles)
   */
  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.025);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.03);
    } catch {}
  }

  /**
   * Heavy physical stamp thump (for completing focus nodes, signing directives)
   */
  public playStamp() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;

      // 1. Low heavy thump oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);

      // 2. Paper impact noise burst
      const bufferSize = ctx.sampleRate * 0.04;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(800, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(t);
      noise.stop(t + 0.05);
    } catch {}
  }

  /**
   * Metallic lock / medal equip sound (for equipping traits or achieving milestones)
   */
  public playMedalEquip() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;

      // Bell-like metallic resonance
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(880, t);
      osc1.frequency.exponentialRampToValueAtTime(1760, t + 0.06);

      osc2.frequency.setValueAtTime(587.33, t); // D5
      osc2.frequency.exponentialRampToValueAtTime(1174.66, t + 0.06);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.18);
      osc2.stop(t + 0.18);
    } catch {}
  }

  /**
   * Action cancel / void stamp sound (for revoking directives)
   */
  public playVoid() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.13);
    } catch {}
  }
}

export const soundFx = new SoundEngine();
