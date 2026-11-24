import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProgressiveCascadeNotes,
  computeComboAudioProfile,
  cozyAudio,
} from './audio';

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

test('sample player reuses local clips and keeps rain independent from SFX', () => {
  const created: MockAudio[] = [];
  class MockAudio {
    paused = true;
    loop = false;
    volume = 1;
    currentTime = 0;
    constructor(readonly src: string) { created.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const previous = globalThis.Audio;
  globalThis.Audio = MockAudio as unknown as typeof Audio;
  try {
    cozyAudio.playPlace('honey_oak');
    cozyAudio.playPlace('honey_oak');
    cozyAudio.playClear(1, 1);
    cozyAudio.playCascade();
    cozyAudio.playError();
    cozyAudio.setAmbientEnabled(true);
    assert.deepEqual(created.map((clip) => clip.src.split('/').pop()),
      ['wood.ogg', 'clear.ogg', 'combo.ogg', 'error.ogg', 'rain.ogg']);
    const rain = created[4];
    assert.equal(rain.loop, true);
    assert.equal(rain.paused, false);
    cozyAudio.suspend();
    assert.equal(rain.paused, true);
    cozyAudio.resume();
    assert.equal(rain.paused, false);
    cozyAudio.playCat();
    const meow = created[5];
    assert.equal(meow.paused, false);
    cozyAudio.setMuted(true);
    assert.equal(meow.paused, true);
    assert.equal(rain.paused, false);
    assert.equal(rain.volume, 0.22);
    cozyAudio.setAmbientEnabled(false);
    assert.equal(rain.paused, true);
  } finally {
    cozyAudio.setAmbientEnabled(false);
    cozyAudio.setMuted(false);
    globalThis.Audio = previous;
  }
});
