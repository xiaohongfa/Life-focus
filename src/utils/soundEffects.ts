/**
 * Web Audio API based tactical sound effects engine for Life Strategy Game (类钢铁雄心人生仪表盘).
 * 100% offline, zero external asset dependencies, zero network requests.
 * Features high-gain dynamics compression and multi-oscillator layering for loud, punchy, distortion-free HOI4 game sound effects.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private boosterGain: GainNode | null = null;
  private enabled: boolean = true;
  private volume: number = 0.95; // Default loud volume (0.0 - 1.0)

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
      this.volume = 0.95;
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

      // Build Master Gain -> Compressor -> Booster Chain for loud punchy audio
      if (!this.compressor && this.ctx) {
        this.masterGain = this.ctx.createGain();
        // High gain baseline (3.2x multiplier)
        this.masterGain.gain.setValueAtTime(this.volume * 3.2, this.ctx.currentTime);

        this.compressor = this.ctx.createDynamicsCompressor();
        // Higher threshold and gentler ratio so loud punchy sounds are not squashed down
        this.compressor.threshold.setValueAtTime(-5, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(3.5, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.18, this.ctx.currentTime);

        this.boosterGain = this.ctx.createGain();
        this.boosterGain.gain.setValueAtTime(1.35, this.ctx.currentTime);

        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.boosterGain);
        this.boosterGain.connect(this.ctx.destination);
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
      this.masterGain.gain.setValueAtTime(clamped * 3.2, this.ctx.currentTime);
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
   * Snappy military mechanical hover micro-click
   */
  public playHover() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2800, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.012);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.016);
    } catch {}
  }

  /**
   * Loud, crisp, tactile military mechanical button click (重装工业按键声)
   */
  public playClick() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;

      // 1. Heavy physical key travel sub-thump (沉重底膛机械键程冲击)
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(220, t);
      sub.frequency.exponentialRampToValueAtTime(45, t + 0.045);
      subGain.gain.setValueAtTime(1.1, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      sub.connect(subGain);
      subGain.connect(this.masterGain);
      sub.start(t);
      sub.stop(t + 0.055);

      // 2. Sharp mechanical snap transient (清脆微动机械触发行程)
      const snap = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snap.type = 'square';
      snap.frequency.setValueAtTime(2600, t);
      snap.frequency.exponentialRampToValueAtTime(550, t + 0.025);
      snapGain.gain.setValueAtTime(0.85, t);
      snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      snap.connect(snapGain);
      snapGain.connect(this.masterGain);
      snap.start(t);
      snap.stop(t + 0.032);

      // 3. Metallic spring release ring (金属回弹簧微鸣)
      const ring = ctx.createOscillator();
      const ringGain = ctx.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(3800, t + 0.008);
      ring.frequency.exponentialRampToValueAtTime(1400, t + 0.04);
      ringGain.gain.setValueAtTime(0.45, t + 0.008);
      ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      ring.connect(ringGain);
      ringGain.connect(this.masterGain);
      ring.start(t + 0.008);
      ring.stop(t + 0.05);
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

      // Heavy paper rustle noise
      const bufferSize = Math.floor(ctx.sampleRate * 0.1);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.Q.setValueAtTime(2.0, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.8, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + 0.1);

      // Mechanical card slide click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, t + 0.01);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.08);

      gain.gain.setValueAtTime(0.6, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.085);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + 0.01);
      osc.stop(t + 0.09);
    } catch {}
  }

  /**
   * National Focus Started: Powerful battle drum thump & metallic locking bolt (隆重军鼓与机锁闭合)
   */
  public playFocusStart() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;

      // 1. Massive battle drum sub-bass boom
      const drum = ctx.createOscillator();
      const drumGain = ctx.createGain();
      drum.type = 'sine';
      drum.frequency.setValueAtTime(140, t);
      drum.frequency.exponentialRampToValueAtTime(32, t + 0.3);
      drumGain.gain.setValueAtTime(1.2, t);
      drumGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      drum.connect(drumGain);
      drumGain.connect(this.masterGain);
      drum.start(t);
      drum.stop(t + 0.35);

      // 2. Heavy iron bolt latch snap
      const bolt = ctx.createOscillator();
      const boltGain = ctx.createGain();
      bolt.type = 'square';
      bolt.frequency.setValueAtTime(1100, t + 0.02);
      bolt.frequency.exponentialRampToValueAtTime(180, t + 0.09);
      boltGain.gain.setValueAtTime(0.75, t + 0.02);
      boltGain.gain.exponentialRampToValueAtTime(0.001, t + 0.095);
      bolt.connect(boltGain);
      boltGain.connect(this.masterGain);
      bolt.start(t + 0.02);
      bolt.stop(t + 0.1);
    } catch {}
  }

  /**
   * HOI4 Victory Brass Fanfare & Seal Stamp: Loud, triumphant brass chord! (钢铁雄心胜利凯旋铜管军号)
   */
  public playFocusComplete() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;

      // 1. Massive gong & cannon sub-thud impact
      const stampOsc = ctx.createOscillator();
      const stampGain = ctx.createGain();
      stampOsc.type = 'triangle';
      stampOsc.frequency.setValueAtTime(200, t);
      stampOsc.frequency.exponentialRampToValueAtTime(28, t + 0.38);
      stampGain.gain.setValueAtTime(1.3, t);
      stampGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      stampOsc.connect(stampGain);
      stampGain.connect(this.masterGain);
      stampOsc.start(t);
      stampOsc.stop(t + 0.42);

      // 2. Full Cinematic Brass Trumpet Chords (Triad: C4, G4, C5, E5)
      const freqs = [261.63, 392.0, 523.25, 659.25];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t + 0.03);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.01, t + 0.65);

        // Brass resonance filter
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, t + 0.03);
        filter.frequency.exponentialRampToValueAtTime(4200, t + 0.15);
        filter.frequency.exponentialRampToValueAtTime(1100, t + 0.65);

        const baseGain = 0.55 / (idx === 0 ? 1 : 1.15);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(baseGain, t + 0.08);
        gain.gain.setValueAtTime(baseGain * 0.95, t + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(t + 0.03);
        osc.stop(t + 0.75);
      });

      // 3. Shimmering Gold Chime on top
      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(1046.5, t + 0.08);
      chime.frequency.exponentialRampToValueAtTime(2093.0, t + 0.45);
      chimeGain.gain.setValueAtTime(0.55, t + 0.08);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      chime.connect(chimeGain);
      chimeGain.connect(this.masterGain);
      chime.start(t + 0.08);
      chime.stop(t + 0.65);
    } catch {}
  }

  /**
   * World News / Newspaper / Event popup sound: Loud Teletype ticker & paper rustle
   */
  public playEventPopup() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;

      // 1. Rapid teletype ticker burst (4 distinct military pulses)
      [0, 0.035, 0.07, 0.105].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1600, t + delay);
        osc.frequency.exponentialRampToValueAtTime(450, t + delay + 0.022);

        gain.gain.setValueAtTime(0.65, t + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.026);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + delay);
        osc.stop(t + delay + 0.03);
      });

      // 2. Paper rustle noise
      const bufferSize = Math.floor(ctx.sampleRate * 0.16);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.85, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + 0.2);
    } catch {}
  }

  /**
   * Cabinet Minister / High Command Slot Lock: Heavy metallic slam & locking bolt
   */
  public playCabinetAssign() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;

      // Heavy metal slam
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(75, t + 0.14);

      gain.gain.setValueAtTime(1.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.17);

      // Lock latch ping
      const latch = ctx.createOscillator();
      const latchGain = ctx.createGain();
      latch.type = 'sine';
      latch.frequency.setValueAtTime(2200, t + 0.02);
      latch.frequency.exponentialRampToValueAtTime(700, t + 0.09);

      latchGain.gain.setValueAtTime(0.6, t + 0.02);
      latchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      latch.connect(latchGain);
      latchGain.connect(this.masterGain);
      latch.start(t + 0.02);
      latch.stop(t + 0.11);
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
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);

      gain.gain.setValueAtTime(1.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.22);
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
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.16);

      gain.gain.setValueAtTime(1.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.2);
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

      osc1.frequency.setValueAtTime(980, t);
      osc1.frequency.exponentialRampToValueAtTime(1960, t + 0.09);

      osc2.frequency.setValueAtTime(659.25, t);
      osc2.frequency.exponentialRampToValueAtTime(1318.5, t + 0.09);

      gain.gain.setValueAtTime(0.75, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.27);
      osc2.stop(t + 0.27);
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
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);

      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.18);
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
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.setValueAtTime(260, t + 0.12);

      gain.gain.setValueAtTime(0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.32);
    } catch {}
  }

  /**
   * Mechanical ratchet gear shift sound (时钟齿轮与流速切换)
   */
  public playSpeedToggle() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;
    try {
      const t = ctx.currentTime;
      [0, 0.025].forEach((d) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1800, t + d);
        osc.frequency.exponentialRampToValueAtTime(600, t + d + 0.015);
        gain.gain.setValueAtTime(0.7, t + d);
        gain.gain.exponentialRampToValueAtTime(0.001, t + d + 0.018);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + d);
        osc.stop(t + d + 0.02);
      });
    } catch {}
  }
}

export const soundFx = new SoundEngine();
