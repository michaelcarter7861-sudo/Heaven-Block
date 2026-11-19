import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProgressiveCascadeNotes,
  computeComboAudioProfile,
  cozyAudio,
} from './audio';

interface RecordedOscillator {
  type: OscillatorType;
  freq: number;
  startAt: number;
  stopAt: number;
}

interface RecordedGain {
  rampTargets: Array<{ value: number; at: number }>;
}

interface RecordedFilter {
  cutoffHz: number;
}

function createMockAudioHarness() {
  const oscillators: RecordedOscillator[] = [];
  const gains: RecordedGain[] = [];
  const filters: RecordedFilter[] = [];

  class MockAudioParam {
    private onValue: (val: number, at: number) => void;
    value = 0;
    constructor(onValue: (val: number, at: number) => void) {
      this.onValue = onValue;
    }
    setValueAtTime(val: number, at: number) {
      this.value = val;
      this.onValue(val, at);
    }
    linearRampToValueAtTime(val: number, at: number) {
      this.onValue(val, at);
    }
    exponentialRampToValueAtTime(val: number, at: number) {
      this.onValue(val, at);
    }
  }

  class MockAudioContext {
    currentTime = 1.0;
    state: AudioContextState = 'running';
    destination = {};
    resume = async () => {
      this.state = 'running';
    };
    suspend = async () => {
      this.state = 'suspended';
    };
    createDynamicsCompressor() {
      return {
        threshold: new MockAudioParam(() => {}),
        knee: new MockAudioParam(() => {}),
        ratio: new MockAudioParam(() => {}),
        attack: new MockAudioParam(() => {}),
        release: new MockAudioParam(() => {}),
        connect: () => {},
      };
    }
    createBiquadFilter() {
      const rec: RecordedFilter = { cutoffHz: 0 };
      filters.push(rec);
      return {
        type: 'lowpass' as BiquadFilterType,
        frequency: new MockAudioParam((val) => {
          rec.cutoffHz = val;
        }),
        connect: () => {},
      };
    }
    createGain() {
      const rec: RecordedGain = { rampTargets: [] };
      gains.push(rec);
      return {
        gain: new MockAudioParam((value, at) => {
          rec.rampTargets.push({ value, at });
        }),
        connect: () => {},
      };
    }
    createOscillator() {
      const rec: RecordedOscillator = {
        type: 'sine',
        freq: 0,
        startAt: 0,
        stopAt: 0,
      };
      oscillators.push(rec);
      return {
        get type() {
          return rec.type;
        },
        set type(next: OscillatorType) {
          rec.type = next;
        },
        frequency: new MockAudioParam((val) => {
          if (rec.freq === 0) rec.freq = val;
        }),
        connect: () => {},
        start: (at = 0) => {
          rec.startAt = at;
        },
        stop: (at = 0) => {
          rec.stopAt = at;
        },
      };
    }
  }

  return { MockAudioContext, oscillators, gains, filters };
}

test('computeComboAudioProfile scales frequency, gain, brightness, and cadence with combo and cascade depth', () => {
  const c1 = computeComboAudioProfile(1, 0, false);
  const c2 = computeComboAudioProfile(2, 0, false);
  const c4 = computeComboAudioProfile(4, 1, false);
  const c8 = computeComboAudioProfile(8, 2, true);
  const c99 = computeComboAudioProfile(99, 10, true);

  assert.equal(c1.pitchMultiplier, 1);
  assert.equal(c1.shimmerGain, 0);
  assert.equal(c1.addFinalSparkleChord, false);

  assert.equal(c2.pitchMultiplier > c1.pitchMultiplier, true);
  assert.equal(c2.peakGain > c1.peakGain, true);
  assert.equal(c2.filterCutoffHz > c1.filterCutoffHz, true);
  assert.equal(c2.stepIntervalSec < c1.stepIntervalSec, true);
  assert.equal(c2.shimmerGain > 0, true);

  assert.equal(c4.pitchMultiplier > c2.pitchMultiplier, true);
  assert.equal(c4.peakGain > c2.peakGain, true);
  assert.equal(c4.overtoneGain > c2.overtoneGain, true);
  assert.equal(c4.addFinalSparkleChord, true);

  assert.equal(c8.pitchMultiplier > c4.pitchMultiplier, true);
  assert.equal(c8.intensity, 1);

  // Guard safe audio ceiling against clipping or ultrasonic pitch spikes
  assert.equal(c99.semitoneShift <= 14, true);
  assert.equal(c99.peakGain <= 0.25, true);
});

test('buildProgressiveCascadeNotes transposes frequencies upward and adds notes across higher combos', () => {
  const lowChain = buildProgressiveCascadeNotes(1, 1, false);
  const highChain = buildProgressiveCascadeNotes(2, 5, false);

  assert.equal(lowChain.length >= 3, true);
  assert.equal(highChain.length > lowChain.length, true);
  assert.equal(highChain[0].freqHz > lowChain[0].freqHz, true);
  assert.equal(highChain[0].peakGain > lowChain[0].peakGain, true);
  assert.equal(highChain[0].shimmerGain > lowChain[0].shimmerGain, true);
  assert.equal(highChain[0].filterCutoffHz > lowChain[0].filterCutoffHz, true);

  // Tempo tightens on high chains (note 1 -> note 2 delta is smaller)
  const lowStep = lowChain[1].delaySec - lowChain[0].delaySec;
  const highStep = highChain[1].delaySec - highChain[0].delaySec;
  assert.equal(highStep < lowStep, true);
});

test('cozyAudio.playCascade schedules progressively higher oscillator frequencies and intensities', () => {
  const harness = createMockAudioHarness();
  const prevWindow = globalThis.window;

  try {
    (globalThis as unknown as { window: { AudioContext: typeof AudioContext } }).window = {
      AudioContext: harness.MockAudioContext as unknown as typeof AudioContext,
    };

    cozyAudio.setMuted(false);

    // 1. Single cascade at combo 1 (supports legacy 1-arg signature too)
    cozyAudio.playCascade(1);
    const lowMaxFreq = Math.max(...harness.oscillators.map((o) => o.freq));
    const lowPeakGain = Math.max(
      ...harness.gains.flatMap((g) => g.rampTargets.map((t) => t.value))
    );
    const lowCutoff = Math.max(...harness.filters.map((f) => f.cutoffHz));
    const lowVoiceCount = harness.oscillators.length;

    harness.oscillators.length = 0;
    harness.gains.length = 0;
    harness.filters.length = 0;

    // 2. Deeper cascade at combo 5 with Lantern Glow
    cozyAudio.playCascade(2, 5, true);
    const highMaxFreq = Math.max(...harness.oscillators.map((o) => o.freq));
    const highPeakGain = Math.max(
      ...harness.gains.flatMap((g) => g.rampTargets.map((t) => t.value))
    );
    const highCutoff = Math.max(...harness.filters.map((f) => f.cutoffHz));
    const highVoiceCount = harness.oscillators.length;

    assert.equal(highMaxFreq > lowMaxFreq, true);
    assert.equal(highPeakGain > lowPeakGain, true);
    assert.equal(highCutoff > lowCutoff, true);
    assert.equal(highVoiceCount > lowVoiceCount, true);

    // 3. Muted engine produces zero scheduled oscillators
    harness.oscillators.length = 0;
    cozyAudio.setMuted(true);
    cozyAudio.playCascade(3, 6, true);
    assert.equal(harness.oscillators.length, 0);
  } finally {
    cozyAudio.setMuted(false);
    (globalThis as unknown as { window: typeof prevWindow }).window = prevWindow;
  }
});
