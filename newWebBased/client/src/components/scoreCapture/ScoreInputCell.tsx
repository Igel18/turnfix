import { useState, useRef, KeyboardEvent } from 'react';
import { normalizeScoreInput, getScorePlaceholder } from '@/utils/scoreFormatter';
import { ScoreValidation } from '@/types/ScoreCapture.types';

interface ScoreInputCellProps {
  value: string;
  participantId: number;
  fieldKey: string;
  placeholder?: string;
  validation?: ScoreValidation;
  isJuryField?: boolean;
  onSave: (value: string) => Promise<void>;
  onNavigate?: (direction: 'left' | 'right') => void;
  inputMask?: string;
  decimalPlaces?: number;
}

export function ScoreInputCell({
  value,
  participantId: _participantId,
  fieldKey: _fieldKey,
  placeholder,
  validation,
  isJuryField = false,
  onSave,
  onNavigate,
  inputMask: _inputMask,
  decimalPlaces = 2
}: ScoreInputCellProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBlur = async () => {
    if (localValue !== value) {
      setIsSaving(true);
      try {
        await onSave(localValue);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    // Point 93: Keyboard Navigation
    if (e.key === 'Enter') {
      e.preventDefault();
      // Save and exit field
      if (localValue !== value) {
        setIsSaving(true);
        try {
          await onSave(localValue);
        } finally {
          setIsSaving(false);
        }
      }
      // Blur the input to exit
      inputRef.current?.blur();
    } else if (e.key === 'ArrowRight' && onNavigate) {
      // Check if cursor is at the end of the input
      const input = e.currentTarget;
      if (input.selectionStart === input.value.length) {
        e.preventDefault();
        onNavigate('right');
      }
    } else if (e.key === 'ArrowLeft' && onNavigate) {
      // Check if cursor is at the start of the input
      const input = e.currentTarget;
      if (input.selectionStart === 0) {
        e.preventDefault();
        onNavigate('left');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeScoreInput(e.target.value, decimalPlaces);
    setLocalValue(normalized);
  };

  const getBorderColor = () => {
    if (validation && !validation.isValid) {
      return 'border-red-300 bg-red-50';
    }
    if (isJuryField) {
      return 'border-purple-300 bg-purple-50';
    }
    return 'border-gray-300';
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || getScorePlaceholder(decimalPlaces)}
        disabled={isSaving}
        className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${getBorderColor()} ${
          isSaving ? 'opacity-50 cursor-wait' : ''
        }`}
        title={validation?.message}
      />
      {validation && !validation.isValid && (
        <div className="absolute -bottom-5 left-0 right-0 text-xs text-red-600 bg-red-100 border border-red-200 rounded px-1 z-10 whitespace-nowrap">
          ⚠️
        </div>
      )}
    </div>
  );
}
