import { getIconUrl } from '@/utils/iconUtils';

interface DisciplineIconProps {
  icon?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  showFallback?: boolean;
  fallbackEmoji?: string;
}

/**
 * Reusable component for displaying discipline icons
 * Used consistently across Squad Selection, Team Scoring, and other discipline displays
 */
export function DisciplineIcon({ 
  icon, 
  name, 
  size = 'md',
  showFallback = false,
  fallbackEmoji = '🏅'
}: DisciplineIconProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  if (!icon) {
    return showFallback ? (
      <div className="flex justify-center">
        <span className="text-2xl">{fallbackEmoji}</span>
      </div>
    ) : null;
  }

  return (
    <div className="flex justify-center">
      <img 
        src={getIconUrl(icon) || ''}
        alt={`${name} icon`}
        className={`${sizeClasses[size]} object-contain`}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          // Show fallback if enabled
          if (showFallback) {
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const fallback = document.createElement('span');
              fallback.className = 'text-2xl';
              fallback.textContent = fallbackEmoji;
              parent.appendChild(fallback);
            }
          }
        }}
      />
    </div>
  );
}
