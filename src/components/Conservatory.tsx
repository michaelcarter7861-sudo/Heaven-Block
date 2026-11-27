import { memo, useState } from 'react';
import { Moon, Settings, Sun, Volume2, VolumeX } from 'lucide-react';
import { cozyAudio } from '../game/audio';

export const ConservatorySill = memo(function ConservatorySill({ delighted = false, curious = false, hero = false, compact = false }: { delighted?: boolean; curious?: boolean; hero?: boolean; compact?: boolean }) {
  const [reaction, setReaction] = useState(0);
  return <div style={compact ? { height: 60, overflow: 'visible', flexShrink: 0 } : undefined} className={`conservatory-sill ${hero ? 'conservatory-hero' : ''}`}>
    <svg aria-hidden="true" className="ivy ivy-left" viewBox="0 0 70 65"><path d="M4 1Q29 13 27 35T51 63" fill="none" stroke="#627751" strokeWidth="2"/><path d="M11 7Q25 0 31 13Q18 19 11 7M25 22Q8 17 7 32Q19 36 25 22M29 35Q48 25 51 41Q42 49 29 35M38 51Q20 43 22 60Q31 65 38 51" fill="#7D9865"/></svg>
    <svg aria-hidden="true" className="ivy ivy-right" viewBox="0 0 70 65"><path d="M4 1Q29 13 27 35T51 63" fill="none" stroke="#627751" strokeWidth="2"/><path d="M11 7Q25 0 31 13Q18 19 11 7M25 22Q8 17 7 32Q19 36 25 22M29 35Q48 25 51 41Q42 49 29 35M38 51Q20 43 22 60Q31 65 38 51" fill="#7D9865"/></svg>
    <svg aria-hidden="true" className="sill-prop" viewBox="0 0 62 60"><path d="M30 41Q27 16 12 10M30 41Q34 14 50 5M30 42V8" fill="none" stroke="#577650" strokeWidth="2"/><path d="M26 27Q9 28 8 13Q24 13 26 27M32 27Q34 12 50 13Q47 30 32 27M30 20Q20 14 29 2Q39 11 30 20" fill="#7C9A6F"/><path d="M17 38H44L40 56H21Z" fill="#AD674C"/><rect x="16" y="35" width="29" height="6" rx="3" fill="#C98660"/></svg>
    <button type="button" className="sill-cat" aria-label="Pet the ginger cat" onClick={() => { cozyAudio.playCat(); setReaction(v => v + 1); }}>
      <svg viewBox="0 0 140 72" aria-hidden="true"><path className="cat-tail" d="M101 56Q135 60 128 38Q123 27 118 35Q123 52 100 47" fill="none" stroke="#B96C3E" strokeWidth="9" strokeLinecap="round"/><g className="cat-breath"><path d="M49 57Q43 31 70 28Q104 25 114 51Q118 64 94 64H46Z" fill="#CB8049"/><path d="M74 31L78 43M87 32L91 44M100 37L103 47" stroke="#A55B35" strokeWidth="4" strokeLinecap="round"/><path d="M21 31L20 9Q21 5 25 8L41 20Q48 18 55 20L69 8Q74 4 74 10L74 31Q81 48 68 57Q48 69 28 55Q15 47 21 31" fill="#EA9D59" stroke="#8D4C30" strokeWidth="1.8"/><path d="M25 15L35 23L25 27ZM69 15L60 23L69 28Z" fill="#F6B5A1"/><path d="M44 23L46 30M51 23L50 30" stroke="#AA5C35" strokeWidth="3" strokeLinecap="round"/><path d="M31 49Q40 40 48 48Q55 40 65 49Q61 59 48 59Q35 59 31 49" fill="#FFE4B9"/>{delighted || curious ? <g fill="#284137"><ellipse cx="35" cy="40" rx="3" ry="4"/><ellipse cx="60" cy="40" rx="3" ry="4"/><path d="M34 38h2m23 0h2" stroke="#FFF4D7" strokeWidth="1.5"/></g> : <path d="M30 42Q36 36 41 42M54 42Q60 36 65 42" fill="none" stroke="#513729" strokeWidth="2" strokeLinecap="round"/>}<path d="M44 47H52L48 51Z" fill="#A55958"/><path d="M48 50v3m0 0q-3 3-6 0m6 0q3 3 6 0" fill="none" stroke="#674438" strokeWidth="1.2"/><ellipse cx="62" cy="61" rx="12" ry="4" fill="#F5B375"/></g></svg>
      {reaction > 0 && <span key={reaction} className="cat-heart" aria-hidden="true" onAnimationEnd={() => setReaction(0)}>♥</span>}
    </button>
    <svg aria-hidden="true" className="sill-prop" viewBox="0 0 72 60"><ellipse cx="34" cy="54" rx="22" ry="4" fill="#7A9B89"/><path d="M42 34Q57 28 56 39Q54 48 43 47" fill="none" stroke="#82A593" strokeWidth="4"/><path d="M15 32H46L42 48Q31 57 20 48Z" fill="#9BB9A6"/><path d="M29 26Q21 20 30 14" fill="none" stroke="#F3DEC2" strokeWidth="2" strokeLinecap="round"/><ellipse cx="63" cy="53" rx="9" ry="3" fill="#936438"/><rect x="57" y="31" width="11" height="22" rx="3" fill="#C6914F"/><path className="sill-flame" d="M63 29Q55 26 63 16Q70 25 63 29" fill="#FFD796"/></svg>
  </div>;
});

export const ConservatoryRain = memo(function ConservatoryRain() {
  return <div className="conservatory-rain" aria-hidden="true">{Array.from({length: 14}, (_, i) => <i key={i} style={{ left: `${i < 7 ? 1 + i * 1.4 : 89 + (i - 7) * 1.4}%`, top: `${(i * 37) % 90}%`, animationDelay: `${-i * 0.7}s` }} />)}</div>;
});

export function SanctuaryControls({ night, muted, onTheme, onSound, onSettings }: { night: boolean; muted: boolean; onTheme: () => void; onSound: () => void; onSettings: () => void }) {
  return <div className="sanctuary-controls">
    <button type="button" aria-label="Night Candle" aria-pressed={night} onClick={onTheme}>{night ? <Sun /> : <Moon />}</button>
    <button type="button" aria-label="Game SFX" aria-pressed={!muted} onClick={onSound}>{muted ? <VolumeX /> : <Volume2 />}</button>
    <button type="button" aria-label="Settings" onClick={onSettings}><Settings /></button>
  </div>;
}

/** Visual challenge marker only: never blocks a legal placement or pointer event. */
export const NappingCat = memo(function NappingCat({ row, col }: { row: number; col: number }) {
  return <div className="cat-nap-marker" style={{ gridArea: `${row + 1} / ${col + 1} / span 2 / span 2` }} aria-label="Cat Nap: clear an adjacent line for 250 points">
    <svg viewBox="0 0 80 55" aria-hidden="true"><ellipse cx="43" cy="35" rx="31" ry="16" fill="#d8834b"/><path d="M50 43q21-13 16-17" stroke="#a65a32" strokeWidth="5" strokeLinecap="round" fill="none"/><path d="M10 36 9 15l14 8 15-8-2 23q-5 12-15 11T10 36Z" fill="#f0a669"/><path d="M15 34q3-4 7 0m4 0q3-4 7 0" stroke="#4e3029" strokeWidth="1.5" strokeLinecap="round" fill="none"/><text x="49" y="15" fill="#fff7d9" stroke="#805d3f" strokeWidth=".45" fontSize="13" fontFamily="serif">z z</text></svg>
  </div>;
});
