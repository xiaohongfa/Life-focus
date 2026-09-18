/**
 * Web Audio API based tactical sound effects engine for Life Strategy Game (类钢铁雄心人生仪表盘).
 * 100% offline, zero external asset dependencies, zero network requests.
 * Features high-gain dynamics compression for loud, punchy, distortion-free HOI4 game sound effects.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private enabled: boolean = true;
  private volume: number = 0.9; // Default high volume (0.0 - 1.0)

  constructor() {
    try {
      const storedEnabled = localStorage.getItem('lifestrategy_sound_enabled');
      this.enabled = storedEnabled !== null ? storedEnabled === 'true' : true;

      const storedVol = localStorage.getItem('lifestrategy_sound_volume');
      if (storedVol !== null) {
        const parsed = parseFloat(storedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.volume = parsed;
        }
      }
    } catch {
      this.enabled = true;
      this.volume = 0.9;
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      // Build Master Gain & Compressor Chain if not connected
      if (!this.compressor && this.ctx) {
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(24, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(10, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume * 1.25, this.ctx.currentTime);

        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
      }

      return this.ctx;
    } catch {
      return null;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;
    try {
      localStorage.setItem('lifestrategy_sound_volume', String(clamped));
    } catch {}
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(clamped * 1.25, this.ctx.currentTime);
    }
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
   * Crisp, tactile military mechanical button click
   */
  public playClick() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;

      // 1. Transient click noise
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1600, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.03);

      gain.gain.setValueAtTime(0.65, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.04);

      // 2. High snap transient
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = 'sine';
      snapOsc.frequency.setValueAtTime(3600, t);
      snapOsc.frequency.exponentialRampToValueAtTime(800, t + 0.015);

      snapGain.gain.setValueAtTime(0.4, t);
      snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.018);

      snapOsc.connect(snapGain);
      snapGain.connect(this.masterGain);
      snapOsc.start(t);
      snapOsc.stop(t + 0.02);
    } catch {}
  }

  /**
   * National Focus Selection: Paper dossier sliding open with tactical snap
   */
  public playFocusSelect() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;

      // Subtle paper rustle noise
      const bufferSize = Math.floor(ctx.sampleRate * 0.08);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.Q.setValueAtTime(1.5, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + 0.08);

      // Mechanical card slide click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, t + 0.01);
      osc.frequency.exponentialRampToValueAtTime(240, t + 0.06);

      gain.gain.setValueAtTime(0.3, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + 0.01);
      osc.stop(t + 0.07);
    } catch {}
  }

  /**
   * National Focus Started / Directive Issued: Heavy bass march thump
   */
  public playFocusStart() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;

      // Low battle drum thump
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(28, t + 0.22);

      gain.gain.setValueAtTime(0.85, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.25);

      // Metallic lever click
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = 'square';
      click.frequency.setValueAtTime(900, t);
      click.frequency.exponentialRampToValueAtTime(200, t + 0.04);

      clickGain.gain.setValueAtTime(0.45, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      click.connect(clickGain);
      clickGain.connect(this.masterGain);
      click.start(t);
      click.stop(t + 0.05);
    } catch {}
  }

  /**
   * HOI4 Victory Brass Fanfare & Seal Stamp: Loud, triumphant brass chord!
   */
  public playFocusComplete() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;

      // 1. Heavy physical stamp impact
      const stampOsc = ctx.createOscillator();
      const stampGain = ctx.createGain();
      stampOsc.type = 'sine';
      stampOsc.frequency.setValueAtTime(160, t);
      stampOsc.frequency.exponentialRampToValueAtTime(30, t + 0.28);
      stampGain.gain.setValueAtTime(0.9, t);
      stampGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      stampOsc.connect(stampGain);
      stampGain.connect(this.masterGain);
      stampOsc.start(t);
      stampOsc.stop(t + 0.32);

      // 2. Brass Trumpet Chords (Triad: C4 (261.63Hz), G4 (392.00Hz), C5 (523.25Hz), E5 (659.25Hz))
      const freqs = [261.63, 392.0, 523.25, 659.25];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t + 0.04);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.01, t + 0.55);

        // Brass formant filter
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, t + 0.04);
        filter.frequency.exponentialRampToValueAtTime(3600, t + 0.12);
        filter.frequency.exponentialRampToValueAtTime(800, t + 0.55);

        const baseGain = 0.28 / (idx === 0 ? 1 : 1.2);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(baseGain, t + 0.08);
        gain.gain.setValueAtTime(baseGain * 0.9, t + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(t + 0.04);
        osc.stop(t + 0.65);
      });

      // 3. Shimmering Gold Chime on top
      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(1046.5, t + 0.1);
      chime.frequency.exponentialRampToValueAtTime(2093.0, t + 0.4);
      chimeGain.gain.setValueAtTime(0.35, t + 0.1);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      chime.connect(chimeGain);
      chimeGain.connect(this.masterGain);
      chime.start(t + 0.1);
      chime.stop(t + 0.6);
    } catch {}
  }

  /**
   * World News / Newspaper / Event popup sound: Teletype ticker & paper rustle
   */
  public playEventPopup() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;

      // 1. Rapid teletype ticker burst (3 distinct pulses)
      [0, 0.04, 0.08].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1400, t + delay);
        osc.frequency.exponentialRampToValueAtTime(500, t + delay + 0.02);

        gain.gain.setValueAtTime(0.45, t + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.025);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + delay);
        osc.stop(t + delay + 0.03);
      });

      // 2. Paper rustle noise
      const bufferSize = Math.floor(ctx.sampleRate * 0.12);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.55, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + 0.15);
    } catch {}
  }

  /**
   * Cabinet Minister / High Command Slot Lock: Heavy metallic slot clunk
   */
  public playCabinetAssign() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;

      // Heavy metal slot slam
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.12);

      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.15);

      // Lock latch ping
      const latch = ctx.createOscillator();
      const latchGain = ctx.createGain();
      latch.type = 'sine';
      latch.frequency.setValueAtTime(1800, t + 0.02);
      latch.frequency.exponentialRampToValueAtTime(600, t + 0.08);

      latchGain.gain.setValueAtTime(0.4, t + 0.02);
      latchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      latch.connect(latchGain);
      latchGain.connect(this.masterGain);
      latch.start(t + 0.02);
      latch.stop(t + 0.1);
    } catch {}
  }

  /**
   * Economy Law / Legislative Change: Heavy gavel strike
   */
  public playLawChange() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.16);

      gain.gain.setValueAtTime(0.85, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch {}
  }

  /**
   * Heavy physical stamp thump
   */
  public playStamp() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.15);

      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.18);
    } catch {}
  }

  /**
   * Trait / Medal Equip chime
   */
  public playMedalEquip() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(880, t);
      osc1.frequency.exponentialRampToValueAtTime(1760, t + 0.08);

      osc2.frequency.setValueAtTime(587.33, t);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, t + 0.08);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.22);
      osc2.stop(t + 0.22);
    } catch {}
  }

  /**
   * Action cancel / void directive stamp
   */
  public playVoid() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.14);

      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.16);
    } catch {}
  }

  /**
   * Tactical Warning / Tension Alert Horn
   */
  public playAlert() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.setValueAtTime(240, t + 0.1);

      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.26);
    } catch {}
  }
}

export const soundFx = new SoundEngine();
