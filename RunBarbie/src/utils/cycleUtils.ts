import type { CycleSettings } from './storage';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'unknown';

export function getCyclePhase(settings: CycleSettings | null): { phase: CyclePhase; dayInCycle: number; tip: string } {
  if (!settings?.lastPeriodStart) {
    return { phase: 'unknown', dayInCycle: 0, tip: '' };
  }

  const start = new Date(settings.lastPeriodStart);
  const now = new Date();
  const cycleLen = settings.cycleLengthDays || 28;
  const periodLen = settings.periodLengthDays ?? 5;

  const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const dayInCycle = (daysSinceStart % cycleLen) + 1;
  if (dayInCycle <= 0) return { phase: 'unknown', dayInCycle: 0, tip: '' };

  let phase: CyclePhase = 'follicular';
  let tip = '';

  if (dayInCycle <= periodLen) {
    phase = 'menstrual';
    tip = 'Consider lighter intensity. Your body may appreciate gentle runs or cross-training.';
  } else if (dayInCycle <= 13) {
    phase = 'follicular';
    tip = 'Energy rising! Good time for building endurance and trying longer runs.';
  } else if (dayInCycle <= 16) {
    phase = 'ovulation';
    tip = 'Peak performance phase. Great for PRs, speed work, or challenging routes!';
  } else {
    phase = 'luteal';
    tip = 'Listen to your body. Moderate intensity works well; save intense efforts for follicular phase.';
  }

  return { phase, dayInCycle, tip };
}
