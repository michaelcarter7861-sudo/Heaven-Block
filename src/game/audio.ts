import type { MaterialType } from './types';

export interface ProgressiveComboAudioProfile {
  comboCount: number;
  cascadeCount: number;
  chainLevel: number;
  intensity: number;
  semitoneShift: number;
  pitchMultiplier: number;
  peakGain: number;
  overtoneGain: number;
  shimmerGain: number;
  filterCutoffHz: number;
  stepIntervalSec: number;
  noteDurationSec: number;
  noteCount: number;
  addFinalSparkleChord: boolean;
}

export interface ProgressiveCascadeNoteSpec {
  index: number;
  freqHz: number;
  overtoneHz: number;
  shimmerHz: number;
  delaySec: number;
  durationSec: number;
  peakGain: number;
  overtoneGain: number;
  shimmerGain: number;
  filterCutoffHz: number;
  wave: OscillatorType;
}

const CASCADE_BASE_NOTES = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.0, // A5
  1046.5, // C6
  1174.66, // D6
];

const CLEAR_PENTATONIC_NOTES = [
  392.0, // G4
  440.0, // A4
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.0, // A5
  1046.5, // C6
  1174.66, // D6
];

/**
 * Pure deterministic curve for progressive combo-chain & cascade audio scaling.
 * Increases pitch (up to +14 semitones), gain intensity, harmonic shimmer,
 * filter brightness, and arpeggio tempo as combo count and cascade depth climb.
 */
export function computeComboAudioProfile(
  combo = 1,
  cascadeCount = 0,
  hasLantern = false
): ProgressiveComboAudioProfile {
  const comboCount = Math.max(1, Math.floor(combo));
  const cascades = Math.max(0, Math.floor(cascadeCount));
  const chainLevel = (comboCount - 1) + cascades + (hasLantern ? 1 : 0);
  const intensity = Math.min(1, chainLevel / 8);

  const semitoneShift = Math.min(
    14,
    (comboCount - 1) * 1.5 + cascades * 1.0 + (hasLantern ? 1 : 0)
  );
  const pitchMultiplier = Math.pow(2, semitoneShift / 12);

  const peakGain = Number((0.12 + intensity * 0.12).toFixed(4));
  const overtoneGain = Number((0.035 + intensity * 0.07).toFixed(4));
  const shimmerGain =
    chainLevel >= 1 ? Number((0.02 + intensity * 0.07).toFixed(4)) : 0;

  const filterCutoffHz = Math.round(1850 + intensity * 3350);
  const stepIntervalSec = Number((0.056 - intensity * 0.022).toFixed(4));
  const noteDurationSec = Number((0.29 + intensity * 0.14).toFixed(4));
  const noteCount = Math.min(
    7,
    3 + Math.min(2, cascades) + Math.floor((comboCount - 1) / 2) + (hasLantern ? 1 : 0)
  );

  return {
    comboCount,
    cascadeCount: cascades,
    chainLevel,
    intensity,
    semitoneShift,
    pitchMultiplier,
    peakGain,
    overtoneGain,
    shimmerGain,
    filterCutoffHz,
    stepIntervalSec,
    noteDurationSec,
    noteCount,
    addFinalSparkleChord: comboCount >= 3 || cascades >= 2 || hasLantern,
  };
}

/**
 * Builds note-by-note synthesis parameters for progressive cascade combo chains.
 */
export function buildProgressiveCascadeNotes(
  cascadeCount = 1,
  combo = 1,
  hasLantern = false
): ProgressiveCascadeNoteSpec[] {
  const effectiveCascade = Math.max(1, Math.floor(cascadeCount));
  const profile = computeComboAudioProfile(combo, effectiveCascade, hasLantern);
  const specs: ProgressiveCascadeNoteSpec[] = [];

  for (let i = 0; i < profile.noteCount; i++) {
    const baseFreq =
      CASCADE_BASE_NOTES[Math.min(i, CASCADE_BASE_NOTES.length - 1)];
    const freqHz = Number((baseFreq * profile.pitchMultiplier).toFixed(2));
    const crescendo = 0.88 + (i / Math.max(1, profile.noteCount - 1)) * 0.18;

    specs.push({
      index: i,
      freqHz,
      overtoneHz: Number((freqHz * 2).toFixed(2)),
      shimmerHz: Number((freqHz * 1.5).toFixed(2)), // Warm fifth shimmer
      delaySec: Number((0.065 + i * profile.stepIntervalSec).toFixed(4)),
      durationSec: profile.noteDurationSec,
      peakGain: Number((profile.peakGain * crescendo).toFixed(4)),
      overtoneGain: Number((profile.overtoneGain * crescendo).toFixed(4)),
      shimmerGain: Number((profile.shimmerGain * crescendo).toFixed(4)),
      filterCutoffHz: profile.filterCutoffHz,
      wave: i % 2 === 0 ? 'sine' : 'triangle',
    });
  }

  return specs;
}

/**
 * Procedural Web Audio API ASMR Sound Engine (zero external MP3/WAV assets).
 * Synthesizes warm wooden "thock" tactile cues, ascending marimba/kalimba
 * combo chimes, and gentle sparkle chords for Cozy Room restoration.
 */
class CozyAudioEngine {
  private ctx: AudioContext | null = null;
  private outputNode: AudioNode | null = null;
  private muted = false;
  private ambientEnabled = false;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientHearthOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopAmbientLoop();
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } else if (this.ambientEnabled) {
      this.startAmbientLoop();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setAmbientEnabled(enabled: boolean) {
    this.ambientEnabled = enabled;
    if (enabled && !this.muted) {
      this.startAmbientLoop();
    } else {
      this.stopAmbientLoop();
    }
  }

  isAmbientEnabled(): boolean {
    return this.ambientEnabled;
  }

  private startAmbientLoop() {
    if (this.muted || !this.ambientEnabled || typeof window === 'undefined') {
      return;
    }
    if (this.ambientSource) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const sampleRate = ctx.sampleRate || 44100;
      const durationSec = 4;
      const frameCount = sampleRate * durationSec;
      const buffer = ctx.createBuffer(1, frameCount, sampleRate);
      const data = buffer.getChannelData(0);

      // Procedural warm pink/brown rainfall + gentle hearth crackle texture
      let lastOut = 0;
      for (let i = 0; i < frameCount; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.035 * white) / 1.035;
        const microCrackle = Math.random() < 0.00045 ? (Math.random() * 2 - 1) * 0.25 : 0;
        data[i] = lastOut * 1.6 + microCrackle;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(720, ctx.currentTime);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.032, ctx.currentTime + 0.6);

      // Subtle warm hearth undertone
      const hearthOsc = ctx.createOscillator();
      const hearthGain = ctx.createGain();
      hearthOsc.type = 'sine';
      hearthOsc.frequency.setValueAtTime(110, ctx.currentTime);
      hearthGain.gain.setValueAtTime(0.18, ctx.currentTime);
      hearthOsc.connect(hearthGain);
      hearthGain.connect(masterGain);

      source.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(this.getOutputNode(ctx));

      source.start();
      hearthOsc.start();

      this.ambientSource = source;
      this.ambientHearthOsc = hearthOsc;
      this.ambientGain = masterGain;
    } catch {
      // Ignore Web Audio autoplay restriction until next user gesture
    }
  }

  private stopAmbientLoop() {
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
        this.ambientSource.disconnect();
      } catch {
        // Ignore already-stopped source
      }
      this.ambientSource = null;
    }
    if (this.ambientHearthOsc) {
      try {
        this.ambientHearthOsc.stop();
        this.ambientHearthOsc.disconnect();
      } catch {
        // Ignore already-stopped oscillator
      }
      this.ambientHearthOsc = null;
    }
    if (this.ambientGain) {
      try {
        this.ambientGain.disconnect();
      } catch {
        // Ignore
      }
      this.ambientGain = null;
    }
  }

  /**
   * Pauses active Web Audio output cleanly when the app goes to background.
   */
  suspend() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  /**
   * Resumes Web Audio output when returning to foreground (if unmuted).
   */
  resume() {
    if (!this.muted && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.muted && this.ambientEnabled && !this.ambientSource) {
      this.startAmbientLoop();
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.outputNode = null;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getOutputNode(ctx: AudioContext): AudioNode {
    if (this.outputNode) return this.outputNode;
    if (typeof ctx.createDynamicsCompressor === 'function') {
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, ctx.currentTime);
      compressor.knee.setValueAtTime(18, ctx.currentTime);
      compressor.ratio.setValueAtTime(4, ctx.currentTime);
      compressor.attack.setValueAtTime(0.005, ctx.currentTime);
      compressor.release.setValueAtTime(0.15, ctx.currentTime);
      compressor.connect(ctx.destination);
      this.outputNode = compressor;
      return compressor;
    }
    this.outputNode = ctx.destination;
    return ctx.destination;
  }

  /**
   * Subtle warm wooden "thock" when picking up / selecting a block.
   */
  playPickup(material: MaterialType = 'honey_oak') {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(
      material === 'sea_glass' ? 1400 : 760,
      now
    );

    osc.type = material === 'sea_glass' ? 'sine' : 'triangle';
    const baseFreq =
      material === 'honey_oak'
        ? 185
        : material === 'woven_rattan'
          ? 230
          : material === 'glazed_ceramic'
            ? 340
            : 460;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.32, now + 0.045);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.085, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getOutputNode(ctx));
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Distinct tactile placement sound per artisan material.
   */
  playPlace(material: MaterialType) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const jitter = 0.95 + Math.random() * 0.1;

    filter.type = 'lowpass';

    if (material === 'honey_oak') {
      // Deep, warm wooden "thock"
      filter.frequency.setValueAtTime(640, now);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220 * jitter, now);
      osc.frequency.exponentialRampToValueAtTime(98 * jitter, now + 0.095);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.115);
    } else if (material === 'glazed_ceramic') {
      filter.frequency.setValueAtTime(1900, now);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660 * jitter, now);
      osc.frequency.exponentialRampToValueAtTime(495 * jitter, now + 0.085);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.125);
    } else if (material === 'sea_glass') {
      filter.frequency.setValueAtTime(2400, now);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880 * jitter, now);
      osc.frequency.exponentialRampToValueAtTime(810 * jitter, now + 0.14);
      gain.gain.setValueAtTime(0.095, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    } else {
      filter.frequency.setValueAtTime(920, now);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(325 * jitter, now);
      osc.frequency.exponentialRampToValueAtTime(165 * jitter, now + 0.075);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    }

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getOutputNode(ctx));
    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * Ascending musical marimba / kalimba chimes scaled progressively by combo count.
   */
  playClear(lines: number, combo: number, hasLantern = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const profile = computeComboAudioProfile(combo, 0, hasLantern);
    const output = this.getOutputNode(ctx);
    const startIdx = Math.min(profile.comboCount - 1, 4);
    const notesCount = Math.min(
      2 + lines + (profile.comboCount >= 3 ? 1 : 0) + (hasLantern ? 1 : 0),
      7
    );
    const now = ctx.currentTime;
    // Slight subtle pitch lift beyond combo 5 so ultra-high chains keep rising cleanly
    const highComboMultiplier =
      profile.comboCount > 4
        ? Math.pow(2, Math.min(7, profile.comboCount - 4) / 12)
        : 1;

    for (let i = 0; i < notesCount; i++) {
      const baseFreq =
        CLEAR_PENTATONIC_NOTES[
          Math.min(startIdx + i, CLEAR_PENTATONIC_NOTES.length - 1)
        ];
      const freq = baseFreq * highComboMultiplier;
      const t = now + i * profile.stepIntervalSec;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(profile.filterCutoffHz, t);
      filter.connect(output);

      // Fundamental marimba body
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(profile.peakGain, t + 0.011);
      gain.gain.exponentialRampToValueAtTime(0.001, t + profile.noteDurationSec);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(t);
      osc.stop(t + profile.noteDurationSec + 0.02);

      // Gentle kalimba harmonic overtone
      const over = ctx.createOscillator();
      const overGain = ctx.createGain();
      over.type = 'triangle';
      over.frequency.setValueAtTime(freq * 2, t);
      overGain.gain.setValueAtTime(0.001, t);
      overGain.gain.linearRampToValueAtTime(profile.overtoneGain, t + 0.008);
      overGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      over.connect(overGain);
      overGain.connect(filter);
      over.start(t);
      over.stop(t + 0.18);

      // Progressive crystalline fifth shimmer on active combos (2x+)
      if (profile.shimmerGain > 0 && i === notesCount - 1) {
        const shimmer = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(freq * 1.5, t + 0.015);
        shimmerGain.gain.setValueAtTime(0.001, t + 0.015);
        shimmerGain.gain.linearRampToValueAtTime(profile.shimmerGain, t + 0.03);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(filter);
        shimmer.start(t + 0.015);
        shimmer.stop(t + 0.34);
      }
    }
  }

  /**
   * Gentle sparkle arpeggio when unlocking or restyling Cozy Room furniture.
   */
  playFurnitureSparkle() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const sparkleNotes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    const now = ctx.currentTime;
    const output = this.getOutputNode(ctx);
    sparkleNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.048;
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.095, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(output);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  playDecorate() {
    this.playFurnitureSparkle();
  }

  playRewardChime() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [587.33, 783.99, 987.77, 1174.66];
    const now = ctx.currentTime;
    const output = this.getOutputNode(ctx);
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.06;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(output);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  /**
   * Progressive combo-chain & cascade arpeggio: pitch, intensity, brightness,
   * harmonic richness, and tempo scale smoothly with cascade depth and combo count.
   */
  playCascade(cascadeCount = 1, combo = 1, hasLantern = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const profile = computeComboAudioProfile(
      combo,
      Math.max(1, Math.floor(cascadeCount)),
      hasLantern
    );
    const notes = buildProgressiveCascadeNotes(cascadeCount, combo, hasLantern);
    const now = ctx.currentTime;
    const output = this.getOutputNode(ctx);

    notes.forEach((spec) => {
      const t = now + spec.delaySec;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(spec.filterCutoffHz, t);
      filter.connect(output);

      // Primary marimba chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = spec.wave;
      osc.frequency.setValueAtTime(spec.freqHz, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(spec.peakGain, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t + spec.durationSec);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(t);
      osc.stop(t + spec.durationSec + 0.02);

      // Octave harmonic richness scaling with combo intensity
      const over = ctx.createOscillator();
      const overGain = ctx.createGain();
      over.type = 'triangle';
      over.frequency.setValueAtTime(spec.overtoneHz, t);
      overGain.gain.setValueAtTime(0.001, t);
      overGain.gain.linearRampToValueAtTime(spec.overtoneGain, t + 0.01);
      overGain.gain.exponentialRampToValueAtTime(0.001, t + spec.durationSec * 0.6);
      over.connect(overGain);
      overGain.connect(filter);
      over.start(t);
      over.stop(t + spec.durationSec * 0.65);

      // Harmonic shimmer fifth on higher combos / cascade chains
      if (spec.shimmerGain > 0) {
        const shimmer = ctx.createOscillator();
        const shimmerGainNode = ctx.createGain();
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(spec.shimmerHz, t + 0.01);
        shimmerGainNode.gain.setValueAtTime(0.001, t + 0.01);
        shimmerGainNode.gain.linearRampToValueAtTime(spec.shimmerGain, t + 0.024);
        shimmerGainNode.gain.exponentialRampToValueAtTime(
          0.001,
          t + spec.durationSec * 0.78
        );
        shimmer.connect(shimmerGainNode);
        shimmerGainNode.connect(filter);
        shimmer.start(t + 0.01);
        shimmer.stop(t + spec.durationSec * 0.82);
      }
    });

    // Celebratory high-combo octave bloom on chains 3x+ or multi-cascades
    if (profile.addFinalSparkleChord && notes.length > 0) {
      const last = notes[notes.length - 1];
      const chordTime = now + last.delaySec + 0.035;
      const chordGainAmt = Number((0.055 + profile.intensity * 0.065).toFixed(4));
      [last.freqHz, last.freqHz * 1.25, last.overtoneHz].forEach((chordFreq) => {
        const chordOsc = ctx.createOscillator();
        const chordGain = ctx.createGain();
        chordOsc.type = 'sine';
        chordOsc.frequency.setValueAtTime(chordFreq, chordTime);
        chordGain.gain.setValueAtTime(0.001, chordTime);
        chordGain.gain.linearRampToValueAtTime(chordGainAmt, chordTime + 0.018);
        chordGain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.36);
        chordOsc.connect(chordGain);
        chordGain.connect(output);
        chordOsc.start(chordTime);
        chordOsc.stop(chordTime + 0.38);
      });
    }
  }

  playPackOpen() {
    this.playFurnitureSparkle();
  }

  playVictory() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.085;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  playPetReaction() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.17);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playUiTick(kind: 'rotate' | 'pocket' | 'undo' | 'gameover' = 'rotate') {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (kind === 'rotate') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(590, now + 0.06);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    } else if (kind === 'pocket') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.07);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    } else if (kind === 'undo') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.09);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.35);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }
}

export const cozyAudio = new CozyAudioEngine();
