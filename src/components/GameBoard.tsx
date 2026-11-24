import { ENABLE_FULL_META } from '../game/features';
import React, { useCallback, useEffect, useRef } from 'react';
import { LEVEL1_HOOK_TARGET_CELLS } from '../game/levels';
import {
  GRID_SIZE,
  type BoardShapeId,
  type ClearedParticleBurst,
  type Grid8x8,
  type MaterialType,
  type PieceInstance,
  type PlacementPreview,
  type TileSkinId,
} from '../game/types';
import { ArtisanTile, BlockedTile, FlowerTile, MossTile } from './ArtisanTile';

interface GameBoardProps {
  decoration?: React.ReactNode;
  boardRef: React.RefObject<HTMLDivElement | null>;
  boardShape: BoardShapeId;
  grid: Grid8x8;
  preview: PlacementPreview | null;
  previewPiece: PieceInstance | null;
  previewMaterial: MaterialType | null;
  tileSkin?: TileSkinId;
  clearingKeys: Set<string>;
  particleBursts?: ClearedParticleBurst[];
  shakeKey?: number;
  canTapToPlace: boolean;
  firstMoveHookActive?: boolean;
  onCellClick: (row: number, col: number) => void;
}

const HOOK_TARGET_SET = new Set(LEVEL1_HOOK_TARGET_CELLS.map((pt) => String(pt.r) + '_' + String(pt.c)));


type PreviewCellInfo = {
  special?: PieceInstance['specialType'];
  hasAcornGem?: boolean;
};

type BoardCellContent = Grid8x8[number][number];

interface MemoizedBoardCellProps {
  r: number;
  c: number;
  boardShape: BoardShapeId;
  cell: BoardCellContent;
  ghostSpecial?: PreviewCellInfo['special'];
  ghostHasAcorn?: boolean;
  showValidGhost: boolean;
  showInvalidGhost: boolean;
  isClearingNow: boolean;
  isLineClearHighlight: boolean;
  isHookTarget: boolean;
  canTapToPlace: boolean;
  previewMaterial: MaterialType | null;
  tileSkin: TileSkinId;
  onCellClick: (row: number, col: number) => void;
}

// Drag previews move every frame. Memoizing each cell prevents all 64 cells
// from re-rendering when only the ghost-piece coordinates have changed.
const MemoizedBoardCell = React.memo<MemoizedBoardCellProps>(({
  r, c, boardShape, cell, ghostSpecial, ghostHasAcorn, showValidGhost, showInvalidGhost,
  isClearingNow, isLineClearHighlight, isHookTarget, canTapToPlace,
  previewMaterial, tileSkin, onCellClick,
}) => {
  if (cell?.kind === 'blocked') {
    return (
      <div
        data-testid={'cell-' + r + '-' + c}
        data-cell-kind="blocked"
        aria-label={'Architectural obstacle row ' + (r + 1) + ' column ' + (c + 1)}
        className="relative w-full h-full rounded-[6px]"
      >
        <BlockedTile shape={boardShape} r={r} c={c} />
        {showInvalidGhost && (
          <div className="absolute inset-0 rounded-[6px] bg-rose-500/35 border-2 border-rose-500/80 pointer-events-none" aria-hidden="true" />
        )}
      </div>
    );
  }

  const cellDescription = cell
    ? cell.kind === 'moss'
      ? ' overgrown moss obstacle'
      : cell.kind === 'flower'
        ? ' sprouted bloom flower'
        : ' occupied by ' + cell.material
    : isHookTarget
      ? ' empty, recommended opening placement'
      : ' empty';

  return (
    <button
      type="button"
      data-testid={'cell-' + r + '-' + c}
      data-cell-kind={cell ? cell.kind : 'empty'}
      data-first-move-target={isHookTarget ? 'true' : undefined}
      aria-label={'Board row ' + (r + 1) + ' column ' + (c + 1) + cellDescription}
      onClick={() => onCellClick(r, c)}
      className={[
        'relative w-full h-full rounded-[6px] focus-visible:outline-2 focus-visible:outline-amber-500',
        canTapToPlace && !cell ? 'cursor-pointer' : 'cursor-default',
        isLineClearHighlight
          ? 'bg-amber-200/80 dark:bg-amber-500/25 outline outline-2 outline-amber-400'
          : isHookTarget
            ? 'bg-amber-100/90 border-2 border-dashed border-amber-600/90 dark:bg-amber-500/20 dark:border-amber-400 animate-pulse'
            : 'bg-[#E9DCC7] dark:bg-[#1E1712] dark:border dark:border-[#2C2119]',
      ].join(' ')}
    >
      {cell?.kind === 'moss' && <MossTile clearing={isClearingNow} />}
      {cell?.kind === 'flower' && (
        <FlowerTile clearing={isClearingNow} justSprouted={cell.justSprouted} />
      )}
      {cell?.kind === 'tile' && (
        <ArtisanTile
          lightweight={!ENABLE_FULL_META}
          material={cell.material}
          tileSkin={tileSkin}
          justPlaced={cell.justPlaced}
          clearing={isClearingNow}
          highlightClear={isLineClearHighlight}
          special={cell.special}
          hasAcornGem={cell.hasAcornGem}
        />
      )}
      {!cell && showValidGhost && previewMaterial && (
        <ArtisanTile
          lightweight={!ENABLE_FULL_META}
          material={previewMaterial}
          tileSkin={tileSkin}
          ghost
          highlightClear={isLineClearHighlight}
          special={ghostSpecial}
          hasAcornGem={ghostHasAcorn}
          className="ring-2 ring-emerald-600/75 dark:ring-amber-300/80"
        />
      )}
      {showInvalidGhost && (
        <div className="absolute inset-0 rounded-[6px] bg-rose-500/30 border-2 border-rose-500/80 pointer-events-none" aria-hidden="true" />
      )}
    </button>
  );
});
MemoizedBoardCell.displayName = 'MemoizedBoardCell';

const PARTICLE_VECTORS = [
  { px: '-22px', py: '-24px' },
];

export const GameBoard: React.FC<GameBoardProps> = ({
  decoration,
  boardRef,
  boardShape,
  grid,
  preview,
  previewPiece,
  previewMaterial,
  tileSkin = 'classic',
  clearingKeys,
  particleBursts = [],
  shakeKey = 0,
  canTapToPlace,
  firstMoveHookActive = false,
  onCellClick,
}) => {
  // Keep the callback identity stable so board cells do not all re-render when
  // App state changes after a placement.
  const onCellClickRef = useRef(onCellClick);
  useEffect(() => {
    onCellClickRef.current = onCellClick;
  }, [onCellClick]);
  const stableOnCellClick = useCallback((row: number, col: number) => {
    onCellClickRef.current(row, col);
  }, []);

  const previewCellInfo = new Map<
    string,
    { special?: PieceInstance['specialType']; hasAcornGem?: boolean }
  >();
  if (preview && previewPiece) {
    preview.targetCells.forEach((cell, idx) => {
      if (
        cell.r >= 0 &&
        cell.r < GRID_SIZE &&
        cell.c >= 0 &&
        cell.c < GRID_SIZE
      ) {
        previewCellInfo.set(`${cell.r}_${cell.c}`, {
          special:
            idx === previewPiece.specialCellIndex
              ? previewPiece.specialType
              : undefined,
          hasAcornGem: Boolean(previewPiece.acornCellIndices?.includes(idx)),
        });
      }
    });
  }

  const clearedRowSet = new Set(preview?.valid ? preview.clearedRows : []);
  const clearedColSet = new Set(preview?.valid ? preview.clearedCols : []);

  return (
    <div className="relative flex items-center justify-center w-full">
      <div
        className={`w-full max-w-[clamp(160px,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-365px),430px)] max-h-[clamp(160px,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-365px),430px)] aspect-square p-1.5 sm:p-3.5 rounded-2xl border transition-colors duration-200
          bg-[#DEC9A8] border-[#C4A882] shadow-[0_10px_28px_-8px_rgba(45,28,12,0.28),inset_0_2px_2px_rgba(255,250,240,0.65)]
          dark:bg-[#19130E] dark:border-[#3A2B1F] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(245,190,110,0.12)] ${
            shakeKey > 0 ? (shakeKey % 2 ? 'animate-board-shake' : 'animate-board-shake-alt') : ''
          }`}
      >
        <div
          ref={boardRef}
          data-testid="game-board"
          data-board-shape={boardShape}
          className="relative touch-none select-none grid grid-cols-8 grid-rows-8 gap-1 sm:gap-1.5 w-full h-full p-1.5 rounded-xl
            bg-[#C9B18D] dark:bg-[#0D0A08]
            shadow-[inset_0_2px_6px_rgba(62,40,18,0.25)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)]"
          style={{ contain: "layout paint style" }}
        >

          {grid.map((rowArr, r) =>
            rowArr.map((cell, c) => {
              const key = String(r) + '_' + String(c);
              const ghostInfo = previewCellInfo.get(key);
              const isPreviewTarget = Boolean(ghostInfo);
              const isLineClearHighlight =
                cell?.kind !== 'blocked' &&
                (clearedRowSet.has(r) || clearedColSet.has(c));

              return (
                <MemoizedBoardCell
                  key={key}
                  r={r}
                  c={c}
                  boardShape={boardShape}
                  cell={cell}
                  ghostSpecial={ghostInfo?.special}
                  ghostHasAcorn={ghostInfo?.hasAcornGem}
                  showValidGhost={Boolean(isPreviewTarget && preview?.valid && previewMaterial)}
                  showInvalidGhost={Boolean(isPreviewTarget && preview && !preview.valid)}
                  isClearingNow={clearingKeys.has(key)}
                  isLineClearHighlight={isLineClearHighlight}
                  isHookTarget={Boolean(!cell && firstMoveHookActive && HOOK_TARGET_SET.has(key))}
                  canTapToPlace={canTapToPlace}
                  previewMaterial={isPreviewTarget ? previewMaterial : null}
                  tileSkin={tileSkin}
                  onCellClick={stableOnCellClick}
                />
              );
            })
          )}

          {decoration}

          {/* Material-Matched Particle Bursts */}
          {particleBursts.length > 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden z-20"
            >
              {particleBursts.slice(0, 8).map((burst) => (
                <div
                  key={burst.id}
                  style={{
                    left: `${((burst.c + 0.5) / GRID_SIZE) * 100}%`,
                    top: `${((burst.r + 0.5) / GRID_SIZE) * 100}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                >
                  {PARTICLE_VECTORS.map((vec, idx) => (
                    <span
                      key={idx}
                      className="absolute w-2.5 h-2.5 rounded-[3px] animate-particle-burst"
                      style={
                        {
                          backgroundColor:
                            idx % 2 === 0 ? burst.colorHex : burst.accentHex,
                          '--px': vec.px,
                          '--py': vec.py,
                        } as React.CSSProperties
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
