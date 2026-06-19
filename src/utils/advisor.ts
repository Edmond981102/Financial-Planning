import { differenceInCalendarMonths, parseISO } from 'date-fns';
import { SavingsGoal } from '../types';

export type GoalStatusLevel = 'completed' | 'ahead' | 'on-track' | 'behind' | 'at-risk' | 'no-plan';

export interface GoalStatus {
  level: GoalStatusLevel;
  monthsLeft: number;
  requiredMonthlyContribution: number;
  projectedShortfall: number; // positive = short of target by target date, at current contribution rate
  message: string;
}

export function getGoalStatus(goal: SavingsGoal): GoalStatus {
  const remaining = goal.targetAmount - goal.currentAmount;

  if (remaining <= 0) {
    return {
      level: 'completed',
      monthsLeft: 0,
      requiredMonthlyContribution: 0,
      projectedShortfall: 0,
      message: 'Goal reached!',
    };
  }

  const monthsLeft = Math.max(0, differenceInCalendarMonths(parseISO(goal.targetDate), new Date()));
  const stated = goal.monthlyContribution ?? 0;

  if (monthsLeft <= 0) {
    return {
      level: 'at-risk',
      monthsLeft: 0,
      requiredMonthlyContribution: remaining,
      projectedShortfall: remaining,
      message: `Target date has passed and you're still $${remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })} short.`,
    };
  }

  const requiredMonthlyContribution = remaining / monthsLeft;
  const projectedShortfall = Math.max(0, remaining - stated * monthsLeft);

  if (stated <= 0) {
    return {
      level: 'no-plan',
      monthsLeft,
      requiredMonthlyContribution,
      projectedShortfall: remaining,
      message: `Set a monthly contribution of $${requiredMonthlyContribution.toLocaleString(undefined, { maximumFractionDigits: 0 })} to hit this goal by its target date.`,
    };
  }

  const ratio = stated / requiredMonthlyContribution;

  if (ratio >= 1.05) {
    return {
      level: 'ahead',
      monthsLeft,
      requiredMonthlyContribution,
      projectedShortfall: 0,
      message: `Ahead of pace — at $${stated.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo you'll hit this goal early.`,
    };
  }

  if (ratio >= 0.95) {
    return {
      level: 'on-track',
      monthsLeft,
      requiredMonthlyContribution,
      projectedShortfall: 0,
      message: `On track — keep contributing $${stated.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo to hit your target date.`,
    };
  }

  const level: GoalStatusLevel = ratio >= 0.6 ? 'behind' : 'at-risk';
  return {
    level,
    monthsLeft,
    requiredMonthlyContribution,
    projectedShortfall,
    message: `At $${stated.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo you'll fall $${projectedShortfall.toLocaleString(undefined, { maximumFractionDigits: 0 })} short. Raise to $${requiredMonthlyContribution.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo to stay on track.`,
  };
}
