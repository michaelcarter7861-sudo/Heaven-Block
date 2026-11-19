import React from 'react';
import { getShapeDimensions } from '../game/shapes';
import type { PieceInstance, TileSkinId } from '../game/types';
import { ArtisanTile } from './ArtisanTile';

interface PiecePreviewProps {
  piece: PieceInstance;
  cellSize: number;
  gap?: number;
  maxWidth?: number;
  maxHeight?: number;
  ghost?: boolean;
  tileSkin?: TileSkinId;
  className?: string;
}

export const PiecePreview: React.FC<PiecePreviewProps> = ({
  piece,
  cellSize,
  gap = 2,
  maxWidth,
  maxHeight,
  ghost = false,
  tileSkin = 'classic',
  className = '',
}) => {
  const { rows, cols } = getShapeDimensions(piece.cells);
  let effectiveCellSize = cellSize;
  if (maxWidth && cols > 0) {
    effectiveCellSize = Math.min(
      effectiveCellSize,
      Math.floor((maxWidth - (cols - 1) * gap) / cols)
    );
  }
  if (maxHeight && rows > 0) {
    effectiveCellSize = Math.min(
      effectiveCellSize,
      Math.floor((maxHeight - (rows - 1) * gap) / rows)
    );
  }
  effectiveCellSize = Math.max(7, effectiveCellSize);

  const width = cols * effectiveCellSize + (cols - 1) * gap;
  const height = rows * effectiveCellSize + (rows - 1) * gap;
  const compact = effectiveCellSize <= 20;

  return (
    <div
      className={`relative shrink-0 pointer-events-none ${className}`}
      style={{ width, height }}
    >
      {piece.cells.map((cell, idx) => (
        <div
          key={`${cell.r}_${cell.c}`}
          className="absolute"
          style={{
            width: effectiveCellSize,
            height: effectiveCellSize,
            top: cell.r * (effectiveCellSize + gap),
            left: cell.c * (effectiveCellSize + gap),
          }}
        >
          <ArtisanTile
            material={piece.material}
            tileSkin={tileSkin}
            ghost={ghost}
            special={idx === piece.specialCellIndex ? piece.specialType : undefined}
            hasAcornGem={Boolean(piece.acornCellIndices?.includes(idx))}
            compact={compact}
          />
        </div>
      ))}
    </div>
  );
};
