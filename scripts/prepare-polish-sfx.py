"""Render original, quiet stylized cat and mallet effects as local Ogg assets.

Run with Python 3 and ffmpeg in PATH (or set FFMPEG). No runtime synthesis.
"""
import math
import os
from pathlib import Path
import subprocess
import tempfile
import wave
import struct

RATE = 24000
TAU = 2 * math.pi
OUTPUT = Path(__file__).resolve().parents[1] / 'public' / 'audio'


def render(name, duration, sound):
    with tempfile.TemporaryDirectory() as temp:
        raw = Path(temp) / 'render.wav'
        with wave.open(str(raw), 'wb') as file:
            file.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
            file.writeframes(b''.join(struct.pack('<h', round(32767 * max(-1, min(1, sound(i / RATE)))))
                                      for i in range(round(duration * RATE))))
        subprocess.run([os.environ.get('FFMPEG', 'ffmpeg'), '-loglevel', 'error', '-y', '-i', str(raw),
                        '-c:a', 'libvorbis', '-q:a', '4', str(OUTPUT / f'{name}.ogg')], check=True)


def meow(t):
    phase = TAU * (370*t + 105*t**2 - 310*t**3 + 0.28*math.sin(TAU*13*t))
    vowel = math.sin(phase) + .55*math.sin(2*phase) + .27*math.sin(3*phase) + .10*math.sin(5*phase)
    return .29 * math.sin(math.pi * t / .54)**1.6 * vowel


def purr(t):
    pulses = (.55 + .45*math.sin(TAU*26*t))**2
    texture = .45*math.sin(TAU*63*t) + .28*math.sin(TAU*83*t) + .1*math.sin(TAU*172*t)
    return .33*math.sin(math.pi*t/.68)*pulses*texture


def mallet(t):
    out = 0
    for i, note in enumerate((392, 493.88, 587.33, 783.99)):
        dt = t - i*.105
        if dt >= 0:
            out += .42*(1-math.exp(-1200*dt))*(math.sin(TAU*note*dt)*math.exp(-12*dt)
                + .2*math.sin(TAU*note*4*dt)*math.exp(-40*dt))
    return out * min(1, (.82-t)*18)


if __name__ == '__main__':
    render('meow', .54, meow)
    render('purr', .68, purr)
    render('combo', .82, mallet)
