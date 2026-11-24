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

const volumes = { wood: 0.35, clear: 0.35, combo: 0.3, error: 0.24, rain: 0.22, meow: 0.23, purr: 0.21 };
type Clip = keyof typeof volumes;

/** Local sampled effects and independent rain ambience; no runtime synthesis. */
class CozyAudioEngine {
  private clips = new Map<Clip, HTMLAudioElement>();
  private muted = false;
  private ambientEnabled = false;
  private suspended = false;

  private getClip(name: Clip) {
    let clip = this.clips.get(name);
    if (!clip) {
      clip = new Audio(`${(import.meta as ImportMeta & { env?: { BASE_URL: string } }).env?.BASE_URL ?? './'}audio/${name}.ogg`);
      clip.loop = name === 'rain';
      clip.volume = volumes[name];
      this.clips.set(name, clip);
    }
    return clip;
  }

  private play(name: Clip) {
    if ((name !== 'rain' && this.muted) || this.suspended || typeof Audio === 'undefined') return;
    const clip = this.getClip(name);
    if (name !== 'rain') clip.currentTime = 0;
    if (name !== 'rain' || clip.paused) void clip.play().catch(() => {});
  }

  private syncAmbient() {
    if (this.ambientEnabled && !this.suspended) this.play('rain');
    else this.clips.get('rain')?.pause();
  }

  setMuted(value: boolean) {
    this.muted = value;
    if (value) this.clips.forEach((clip, name) => { if (name !== 'rain') clip.pause(); });
  }

  setAmbientEnabled(value: boolean) {
    this.ambientEnabled = value;
    this.syncAmbient();
  }

  suspend() {
    this.suspended = true;
    this.clips.forEach((clip) => clip.pause());
  }

  resume() {
    this.suspended = false;
    this.syncAmbient();
  }

  playPickup(_material?: MaterialType) { this.syncAmbient(); }
  playPlace(_material: MaterialType) { this.play('wood'); }
  playClear(_lines: number, combo: number, _hasLantern = false) { this.play(combo > 1 ? 'combo' : 'clear'); }
  playCascade(_count = 1, _combo = 1, _hasLantern = false) { this.play('combo'); }
  playCat() { this.play('meow'); }
  playPurr() { this.play('purr'); }
  playError() { this.play('error'); }
  playDecorate() { this.play('wood'); }
  playRewardChime() { this.play('clear'); }
  playPackOpen() { this.play('combo'); }
  playVictory() { this.play('combo'); }
  playPetReaction() { this.play('clear'); }
  playUiTick(kind: 'rotate' | 'pocket' | 'undo' | 'gameover' = 'rotate') {
    this.play(kind === 'gameover' ? 'error' : 'wood');
  }
}

export const cozyAudio = new CozyAudioEngine();
