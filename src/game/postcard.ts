import { getRoomCompletion, HAVEN_CHAPTER_META, PET_META } from './haven';
import { PET_ACCESSORIES } from './herbarium';
import type {
  FurnitureStyleId,
  HavenProgress,
  HerbariumProgress,
  PetAccessoryId,
} from './types';

export interface PostcardRenderParams {
  haven: HavenProgress;
  herbarium: HerbariumProgress;
  nightCandleMode: boolean;
  bestScore: number;
  cozyStars: number;
  fireflyStreak: number;
  seedCode?: string;
  playUrl?: string;
}

const STYLE_PALETTES: Record<
  FurnitureStyleId,
  {
    primary: string;
    primaryDark: string;
    secondary: string;
    trim: string;
    cushion: string;
    cushionAccent: string;
  }
> = {
  cottage_oak: {
    primary: '#B8722C',
    primaryDark: '#7C4716',
    secondary: '#F1DFC4',
    trim: '#3F6B4E',
    cushion: '#D98A4E',
    cushionAccent: '#F6E6CF',
  },
  minimalist_zen: {
    primary: '#8CA492',
    primaryDark: '#55695B',
    secondary: '#F4F1EA',
    trim: '#435347',
    cushion: '#DCE3DA',
    cushionAccent: '#6C8472',
  },
  starlight_velvet: {
    primary: '#3C467B',
    primaryDark: '#23294D',
    secondary: '#E2B659',
    trim: '#6D4C7D',
    cushion: '#4B5694',
    cushionAccent: '#F3C969',
  },
};

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  fill: string,
  stroke?: string,
  lineWidth = 2
) {
  ctx.beginPath();
  pts.forEach(([x, y], idx) => {
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawPetAccessoryCanvas(
  ctx: CanvasRenderingContext2D,
  acc: PetAccessoryId | null
) {
  if (!acc) return;

  if (acc === 'bell_collar') {
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-20, -1);
    ctx.quadraticCurveTo(-8, 5, 4, -1);
    ctx.stroke();
    ctx.fillStyle = '#FBBF24';
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-8, 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (acc === 'bow_tie') {
    drawPolygon(
      ctx,
      [
        [-16, -3],
        [-9, 1],
        [-16, 5],
      ],
      '#1E3A2F'
    );
    drawPolygon(
      ctx,
      [
        [0, -3],
        [-7, 1],
        [0, 5],
      ],
      '#1E3A2F'
    );
    ctx.fillStyle = '#34D399';
    ctx.beginPath();
    ctx.arc(-8, 1, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (acc === 'scarf') {
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-21, -2);
    ctx.quadraticCurveTo(-9, 6, 4, -1);
    ctx.stroke();
    ctx.fillStyle = '#B45309';
    ctx.fillRect(-16, 1, 7, 13);
  } else if (acc === 'glasses') {
    ctx.strokeStyle = '#CA8A04';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-16, -11, 4.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-6, -11, 4.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-11.5, -11);
    ctx.lineTo(-10.5, -11);
    ctx.stroke();
  } else if (acc === 'flower_crown') {
    ctx.strokeStyle = '#3F7D58';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-21, -22);
    ctx.quadraticCurveTo(-11, -27, -1, -22);
    ctx.stroke();
    const petals = [
      { x: -18, y: -23, c: '#F472B6' },
      { x: -11, y: -25, c: '#FBBF24' },
      { x: -4, y: -23, c: '#F472B6' },
    ];
    for (const p of petals) {
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (acc === 'wizard_hat') {
    ctx.fillStyle = '#23294D';
    ctx.strokeStyle = '#E2B659';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(-11, -22, 16, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    drawPolygon(
      ctx,
      [
        [-21, -22],
        [-10, -45],
        [-1, -22],
      ],
      '#3B4270',
      '#E2B659',
      1.6
    );
    ctx.fillStyle = '#FCD34D';
    ctx.beginPath();
    ctx.arc(-11, -31, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderHavenPostcardToCanvas(
  canvas: HTMLCanvasElement,
  params: PostcardRenderParams
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = 960;
  const H = 600;
  canvas.width = W;
  canvas.height = H;

  const { haven, herbarium, nightCandleMode, bestScore, cozyStars, fireflyStreak } =
    params;
  const chapter = haven.activeChapter;
  const roomMap = haven.rooms[chapter] ?? {};
  const completion = getRoomCompletion(haven, chapter);

  // Outer Postcard Mat Frame
  ctx.fillStyle = nightCandleMode ? '#140F0B' : '#F6EFE4';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = nightCandleMode ? '#3D2E22' : '#C9B292';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, W - 28, H - 28);

  // Stage Inset (800x500 scaled into 700x438 area on left/top)
  const stageX = 34;
  const stageY = 34;
  const stageW = 680;
  const stageH = 425;
  const scale = stageW / 800;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(stageX, stageY, stageW, stageH, 18);
  ctx.clip();
  ctx.translate(stageX, stageY);
  ctx.scale(scale, scale);

  // Backdrop
  if (chapter === 'cottage_living') {
    drawPolygon(
      ctx,
      [
        [0, 0],
        [400, 0],
        [400, 265],
        [0, 365],
      ],
      nightCandleMode ? '#251D17' : '#F3E7D4'
    );
    drawPolygon(
      ctx,
      [
        [400, 0],
        [800, 0],
        [800, 365],
        [400, 265],
      ],
      nightCandleMode ? '#1D1712' : '#E9D9C2'
    );
    drawPolygon(
      ctx,
      [
        [0, 365],
        [400, 265],
        [800, 365],
        [800, 500],
        [0, 500],
      ],
      nightCandleMode ? '#2F2116' : '#CFA271'
    );
  } else if (chapter === 'rainy_conservatory') {
    drawPolygon(
      ctx,
      [
        [0, 0],
        [400, 0],
        [400, 265],
        [0, 365],
      ],
      nightCandleMode ? '#162028' : '#D4E1DF'
    );
    drawPolygon(
      ctx,
      [
        [400, 0],
        [800, 0],
        [800, 365],
        [400, 265],
      ],
      nightCandleMode ? '#111A21' : '#C3D4D2'
    );
    drawPolygon(
      ctx,
      [
        [0, 365],
        [400, 265],
        [800, 365],
        [800, 500],
        [0, 500],
      ],
      nightCandleMode ? '#231A14' : '#A97E58'
    );
  } else {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 275);
    if (nightCandleMode) {
      skyGrad.addColorStop(0, '#0C1329');
      skyGrad.addColorStop(1, '#2F2C4C');
    } else {
      skyGrad.addColorStop(0, '#9BD2EB');
      skyGrad.addColorStop(1, '#FBE7BD');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 800, 275);
    ctx.fillStyle = nightCandleMode ? '#24221F' : '#DFD8C8';
    ctx.fillRect(0, 275, 800, 225);
    // Koi Pond
    ctx.fillStyle = nightCandleMode ? '#142936' : '#5EA4AC';
    ctx.beginPath();
    ctx.ellipse(695, 430, 115, 62, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Unlocked Furniture Pieces
  if (roomMap.window) {
    const pal = STYLE_PALETTES[roomMap.window];
    ctx.fillStyle = pal.primary;
    ctx.fillRect(320, 52, 160, 122);
    ctx.fillStyle = nightCandleMode ? '#1B2547' : '#BDE3F2';
    ctx.fillRect(332, 64, 136, 98);
    if (!nightCandleMode) {
      ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
      drawPolygon(
        ctx,
        [
          [330, 115],
          [470, 115],
          [620, 440],
          [280, 440],
        ],
        'rgba(254, 240, 138, 0.24)'
      );
    }
  }

  if (roomMap.bookshelf) {
    const pal = STYLE_PALETTES[roomMap.bookshelf];
    drawPolygon(
      ctx,
      [
        [75, 132],
        [180, 108],
        [180, 295],
        [75, 322],
      ],
      pal.primary,
      pal.primaryDark,
      3
    );
  }

  if (roomMap.hearth) {
    const pal = STYLE_PALETTES[roomMap.hearth];
    if (chapter === 'cottage_living') {
      drawPolygon(
        ctx,
        [
          [615, 85],
          [735, 122],
          [735, 340],
          [615, 295],
        ],
        pal.secondary,
        pal.primaryDark,
        3
      );
      drawPolygon(
        ctx,
        [
          [632, 226],
          [716, 252],
          [716, 326],
          [632, 296],
        ],
        '#1F1612'
      );
      drawPolygon(
        ctx,
        [
          [658, 294],
          [674, 255],
          [690, 294],
        ],
        '#F97316'
      );
    } else {
      ctx.fillStyle = pal.primaryDark;
      ctx.beginPath();
      ctx.ellipse(665, 272, 58, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4BA3B5';
      ctx.beginPath();
      ctx.ellipse(665, 266, 48, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (roomMap.lamp) {
    const pal = STYLE_PALETTES[roomMap.lamp];
    ctx.fillStyle = pal.primaryDark;
    ctx.fillRect(556, 145, 8, 128);
    drawPolygon(
      ctx,
      [
        [538, 148],
        [582, 148],
        [573, 110],
        [547, 110],
      ],
      nightCandleMode ? '#FDE68A' : pal.secondary,
      pal.trim,
      3
    );
  }

  if (roomMap.rug) {
    const pal = STYLE_PALETTES[roomMap.rug];
    drawPolygon(
      ctx,
      [
        [400, 312],
        [575, 384],
        [400, 462],
        [225, 384],
      ],
      pal.trim,
      pal.secondary,
      4
    );
  }

  if (roomMap.sofa) {
    const pal = STYLE_PALETTES[roomMap.sofa];
    drawPolygon(
      ctx,
      [
        [248, 220],
        [442, 175],
        [456, 192],
        [456, 265],
        [260, 312],
        [248, 295],
      ],
      pal.primary,
      pal.primaryDark,
      3
    );
    drawPolygon(
      ctx,
      [
        [260, 268],
        [456, 222],
        [496, 246],
        [300, 295],
      ],
      pal.cushion,
      pal.primaryDark,
      3
    );
  }

  if (roomMap.plants) {
    const pal = STYLE_PALETTES[roomMap.plants];
    ctx.fillStyle = pal.primary;
    ctx.fillRect(172, 55, 28, 24);
    ctx.fillStyle = '#3F7D58';
    ctx.beginPath();
    ctx.arc(186, 50, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pet + Equipped Accessory
  const petX = roomMap.sofa ? 404 : 332;
  const petY = roomMap.sofa ? 240 : 356;
  ctx.save();
  ctx.translate(petX, petY);
  ctx.scale(1.15, 1.15);

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const petBody =
    haven.activePet === 'ginger_cat'
      ? '#EA8C2A'
      : haven.activePet === 'lop_bunny'
        ? '#F2E8DC'
        : '#DF9348';
  const petHead =
    haven.activePet === 'ginger_cat'
      ? '#F59E0B'
      : haven.activePet === 'lop_bunny'
        ? '#F7F1E8'
        : '#E69B4F';
  ctx.fillStyle = petBody;
  ctx.beginPath();
  ctx.ellipse(0, 4, 20, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  if (haven.activePet === 'lop_bunny') {
    ctx.fillStyle = '#E3D2BF';
    ctx.beginPath();
    ctx.ellipse(-23, -4, 5, 11, 0.25, 0, Math.PI * 2);
    ctx.ellipse(-1, -4, 5, 11, -0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = petHead;
  ctx.beginPath();
  ctx.arc(-12, -10, 13, 0, Math.PI * 2);
  ctx.fill();
  if (haven.activePet !== 'lop_bunny') {
    drawPolygon(
      ctx,
      [
        [-22, -18],
        [-19, -30],
        [-11, -21],
      ],
      petHead
    );
    drawPolygon(
      ctx,
      [
        [-10, -21],
        [-3, -30],
        [0, -18],
      ],
      petHead
    );
  }
  ctx.fillStyle = '#1F1209';
  ctx.beginPath();
  ctx.arc(-16, -11, 2, 0, Math.PI * 2);
  ctx.arc(-7, -11, 2, 0, Math.PI * 2);
  ctx.fill();

  drawPetAccessoryCanvas(ctx, herbarium.equippedAccessory);
  ctx.restore();

  if (roomMap.table) {
    const pal = STYLE_PALETTES[roomMap.table];
    drawPolygon(
      ctx,
      [
        [440, 304],
        [522, 336],
        [440, 370],
        [358, 336],
      ],
      pal.primary,
      pal.primaryDark,
      3
    );
  }

  if (nightCandleMode) {
    const flies = [
      [145, 185],
      [290, 140],
      [465, 170],
      [610, 240],
    ];
    ctx.fillStyle = '#FDE047';
    for (const [fx, fy] of flies) {
      ctx.beginPath();
      ctx.arc(fx, fy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();

  // Stage border
  ctx.strokeStyle = nightCandleMode ? '#4A3728' : '#B49A75';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(stageX, stageY, stageW, stageH, 18);
  ctx.stroke();

  // Right-Hand Postcard Stamp & Stats Column
  const rx = 738;
  ctx.fillStyle = nightCandleMode ? '#221A14' : '#EFE4D2';
  ctx.strokeStyle = nightCandleMode ? '#4A3728' : '#C4A882';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(rx, 34, 188, 128, 12);
  ctx.fill();
  ctx.stroke();

  // Stamp graphic
  ctx.fillStyle = '#1E3A2F';
  ctx.fillRect(rx + 18, 52, 62, 74);
  ctx.strokeStyle = '#F6EFE4';
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(rx + 22, 56, 54, 66);
  ctx.setLineDash([]);
  ctx.fillStyle = '#FBBF24';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('HAVEN', rx + 29, 86);
  ctx.fillStyle = '#FDF8F2';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('POST', rx + 35, 102);

  // Postmark waves
  ctx.strokeStyle = nightCandleMode ? '#D97706' : '#8B7358';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(rx + 128, 88, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = nightCandleMode ? '#F5EDE1' : '#2A1F15';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('2026', rx + 114, 92);

  const labelColor = nightCandleMode ? '#B4A08A' : '#6E5A46';
  const valColor = nightCandleMode ? '#FDE68A' : '#1E3A2F';

  const statRows: [string, string][] = [
    ['BEST SCORE', bestScore.toLocaleString()],
    ['COZY STARS', `${cozyStars} ★`],
    ['ROOM RESTORED', `${completion.unlocked}/${completion.total} (${completion.pct}%)`],
    ['HERBARIUM', `${herbarium.unlockedCardIds.length}/24 Cards`],
    ['FIREFLY STREAK', `${fireflyStreak}/5 Lanterns`],
  ];

  let sy = 192;
  for (const [label, value] of statRows) {
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(label, rx, sy);
    ctx.fillStyle = valColor;
    ctx.font = 'bold 18px monospace';
    ctx.fillText(value, rx, sy + 21);
    sy += 54;
  }

  // Bottom Postcard Caption Strip
  ctx.fillStyle = nightCandleMode ? '#F5EDE1' : '#1E3A2F';
  ctx.font = 'bold 23px Georgia, serif';
  ctx.fillText(
    `Greetings from ${HAVEN_CHAPTER_META[chapter].title}`,
    36,
    500
  );

  const accDef = herbarium.equippedAccessory
    ? PET_ACCESSORIES.find((a) => a.id === herbarium.equippedAccessory)
    : null;
  ctx.fillStyle = labelColor;
  ctx.font = '14px sans-serif';
  ctx.fillText(
    `Companion: ${PET_META[haven.activePet].name}${
      accDef ? ` wearing ${accDef.name}` : ''
    } · Crafted offline in HavenBlocks`,
    36,
    528
  );

  // Canonical Play-Link Footer on exported PNG postcard
  const cleanSeed = (params.seedCode ?? 'HAVEN-2026').trim().toUpperCase();
  const displayLink =
    params.playUrl ?? `?duel=${encodeURIComponent(cleanSeed)}`;
  ctx.fillStyle = nightCandleMode ? '#221A14' : '#EFE4D2';
  ctx.strokeStyle = nightCandleMode ? '#4A3728' : '#C4A882';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(34, 542, W - 68, 32, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = nightCandleMode ? '#FDE68A' : '#1E3A2F';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(
    `Play this same board (${cleanSeed}): ${displayLink}`,
    48,
    562
  );
}
