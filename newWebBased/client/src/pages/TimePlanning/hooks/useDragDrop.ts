/**
 * useDragDrop Hook
 * Point 124: Separation of Concerns - Drag & Drop Logic
 * 
 * Extracted from TimePlanning.tsx (Lines 3-14)
 * Handles drag and drop for competition assignment to sessions/rounds
 */

import { useState } from 'react';

interface UseDragDropProps {
  onDrop: (compId: number, newRound: number) => void;
}

interface UseDragDropReturn {
  handleDragStart: (compId: number) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (newRound: number) => void;
}

export function useDragDrop({ onDrop }: UseDragDropProps): UseDragDropReturn {
  const [draggedComp, setDraggedComp] = useState<number | null>(null);

  const handleDragStart = (compId: number) => {
    setDraggedComp(compId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (newRound: number) => {
    if (draggedComp !== null) {
      onDrop(draggedComp, newRound);
      setDraggedComp(null);
    }
  };

  return { handleDragStart, handleDragOver, handleDrop };
}
