/**
 * LiveUpdateIndicator Component
 * 
 * A reusable UI indicator showing when a page/component has active live updates via Socket.IO.
 * Displays a green pulsing dot with optional label.
 * 
 * Usage:
 * ```tsx
 * import LiveUpdateIndicator from '@/components/LiveUpdateIndicator'
 * 
 * // Simple usage - just the indicator
 * <LiveUpdateIndicator />
 * 
 * // With custom label
 * <LiveUpdateIndicator label="Live Scores" />
 * 
 * // Larger size
 * <LiveUpdateIndicator size="lg" />
 * 
 * // Disabled state (gray, no pulse)
 * <LiveUpdateIndicator isActive={false} />
 * ```
 * 
 * Props:
 * - isActive: boolean (default: true) - Whether live updates are active
 * - label: string (optional) - Text label to display next to indicator
 * - size: 'sm' | 'md' | 'lg' (default: 'md') - Size of the indicator dot
 * - className: string (optional) - Additional CSS classes
 * - showLabel: boolean (default: true) - Whether to show "Live" label
 */

import { useTranslation } from 'react-i18next'

interface LiveUpdateIndicatorProps {
  isActive?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showLabel?: boolean
}

const LiveUpdateIndicator = ({ 
  isActive = true, 
  label, 
  size = 'md',
  className = '',
  showLabel = true
}: LiveUpdateIndicatorProps) => {
  const { t } = useTranslation()

  // Size mappings for the dot
  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  }

  // Size mappings for text
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const dotColor = isActive ? 'bg-green-400' : 'bg-gray-400'
  const pulseClass = isActive ? 'animate-pulse' : ''
  const textColor = isActive ? 'text-green-600' : 'text-gray-500'

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Pulsing Dot */}
      <div className={`${dotSizes[size]} ${dotColor} rounded-full ${pulseClass}`}></div>
      
      {/* Label */}
      {(showLabel || label) && (
        <span className={`${textSizes[size]} font-medium ${textColor}`}>
          {label || t('common.live')}
        </span>
      )}
    </div>
  )
}

export default LiveUpdateIndicator
