import { useEffect, useRef, useState } from 'react'

const DECIMAL_INPUT_MODE = 'decimal'
const INVALID_INPUT_CLASS = 'border-red-500 ring-red-500'

interface LocalizedNumberInputProps {
  id?: string
  value: number
  min: number
  max: number
  required?: boolean
  className?: string
  onValueChange: (value: number) => void
}

export function parseLocalizedNumber(value: string): number | undefined {
  const normalized = value.trim().replace(',', '.')
  if (!normalized || !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return undefined
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function formatLocalizedNumber(value: number): string {
  return Number.isFinite(value) ? String(value).replace('.', ',') : ''
}

export default function LocalizedNumberInput({
  id,
  value,
  min,
  max,
  required = false,
  className = '',
  onValueChange,
}: LocalizedNumberInputProps) {
  const [draft, setDraft] = useState(() => formatLocalizedNumber(value))
  const isFocused = useRef(false)
  const parsedValue = parseLocalizedNumber(draft)
  const isValid = (draft !== '' || !required)
    && (draft === '' || (parsedValue !== undefined && parsedValue >= min && parsedValue <= max))

  useEffect(() => {
    if (!isFocused.current) setDraft(formatLocalizedNumber(value))
  }, [value])

  const handleChange = (nextValue: string) => {
    setDraft(nextValue)
    const parsed = parseLocalizedNumber(nextValue)
    onValueChange(parsed !== undefined ? parsed : Number.NaN)
  }

  const handleBlur = () => {
    isFocused.current = false
    const parsed = parseLocalizedNumber(draft)
    if (parsed !== undefined) {
      onValueChange(parsed)
      setDraft(formatLocalizedNumber(parsed))
    } else if (draft === '') {
      onValueChange(Number.NaN)
    }
  }

  return (
    <input
      id={id}
      type="text"
      inputMode={DECIMAL_INPUT_MODE}
      value={draft}
      required={required}
      aria-invalid={!isValid}
      onFocus={() => { isFocused.current = true }}
      onChange={event => handleChange(event.target.value)}
      onBlur={handleBlur}
      className={`${className} ${!isValid ? INVALID_INPUT_CLASS : ''}`.trim()}
    />
  )
}
