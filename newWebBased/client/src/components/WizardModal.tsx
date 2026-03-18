/**
 * WizardModal — Unified multi-step wizard template
 *
 * Wraps UnifiedModal and adds a standardised pill-style step indicator above the
 * body content.  All wizard dialogs in the application should use this component
 * so that the look and feel of the step indicator is always identical.
 *
 * Usage
 * ─────
 * ```tsx
 * <WizardModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   title={t('myFeature.wizard.title')}   // may be dynamic (change per step)
 *   steps={[
 *     { key: 'step1', label: t('...'), icon: SomeIcon },  // icon is optional
 *     { key: 'step2', label: t('...') },
 *   ]}
 *   currentStep={step}   // the key string of the currently active step
 *   size="3xl"
 *   fullHeight
 * >
 *   {step === 'step1' && <Step1Content />}
 *   {step === 'step2' && <Step2Content />}
 * </WizardModal>
 * ```
 *
 * Step indicator behaviour
 * ────────────────────────
 * - **Done**     (index < currentIndex): green pill + Check icon
 * - **Active**   (index === currentIndex): blue pill + ring + numbered circle
 *   (or the step's icon if provided)
 * - **Inactive** (index > currentIndex): grey pill + grey numbered circle
 *   (or the step's icon if provided)
 * - Connector between pills: <ArrowRight> icon (consistent across all wizards)
 */

import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import UnifiedModal, { type UnifiedModalProps } from '@/components/UnifiedModal';

// ── Public types ──────────────────────────────────────────────────────────────

export interface WizardStepDef {
  /** Unique identifier – used as the value of `currentStep`. */
  key: string;
  /** Short label shown inside the pill. */
  label: string;
  /**
   * Optional icon component (e.g. from Heroicons or Lucide).
   * When provided it is shown inside the pill instead of the step number.
   * For done steps the icon is always replaced by a Check mark.
   */
  icon?: React.ComponentType<{ className?: string }>;
}

export interface WizardModalProps extends Omit<UnifiedModalProps, 'children'> {
  /** Ordered list of wizard steps. */
  steps: WizardStepDef[];
  /** Key of the currently active step. */
  currentStep: string;
  children: React.ReactNode;
}

// ── Step indicator (internal) ─────────────────────────────────────────────────

interface StepIndicatorProps {
  steps: WizardStepDef[];
  currentStep: string;
}

function WizardStepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="mb-5 flex items-center gap-2 flex-wrap">
      {steps.map((s, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        const Icon = s.icon;

        const pillClass = [
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
          isActive ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300' : '',
          isDone ? 'bg-green-100 text-green-700' : '',
          !isActive && !isDone ? 'bg-gray-100 text-gray-400' : '',
        ]
          .filter(Boolean)
          .join(' ');

        // Colour for the numbered circle / icon background
        const circleBg = isActive ? '#2563eb' : isDone ? '#16a34a' : '#9ca3af';

        return (
          <React.Fragment key={s.key}>
            {i > 0 && <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
            <div className={pillClass}>
              {isDone ? (
                /* Done: always show a green check circle */
                <span
                  className="w-5 h-5 flex items-center justify-center rounded-full text-white flex-shrink-0"
                  style={{ backgroundColor: circleBg }}
                >
                  <Check className="w-3 h-3" />
                </span>
              ) : Icon ? (
                /* Active / inactive with icon */
                <Icon className="w-4 h-4 flex-shrink-0" />
              ) : (
                /* Active / inactive with step number */
                <span
                  className="w-5 h-5 flex items-center justify-center rounded-full text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: circleBg }}
                >
                  {i + 1}
                </span>
              )}
              {s.label}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── WizardModal ───────────────────────────────────────────────────────────────

/**
 * Unified wizard modal.  Renders a UnifiedModal with a standardised step
 * indicator at the top.  All other UnifiedModal props are forwarded as-is.
 *
 * `showFooter` defaults to `false` because wizards manage their own navigation.
 */
export function WizardModal({
  steps,
  currentStep,
  children,
  showFooter = false,
  size = '3xl',
  fullHeight = true,
  ...rest
}: WizardModalProps) {
  return (
    <UnifiedModal
      showFooter={showFooter}
      size={size}
      fullHeight={fullHeight}
      {...rest}
    >
      <WizardStepIndicator steps={steps} currentStep={currentStep} />
      {children}
    </UnifiedModal>
  );
}

export default WizardModal;
