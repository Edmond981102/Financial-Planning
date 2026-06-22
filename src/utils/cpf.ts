import { differenceInYears, parseISO } from 'date-fns';
import { UserProfile } from '../types';

// Ordinary Wage ceiling effective 1 Jan 2026 (CPF Board). CPF contributions are
// only computed on income up to this monthly cap.
const OW_CEILING = 8000;

type AgeBand = '<=55' | '55-60' | '60-65' | '65-70' | '>70';

function getAgeBand(age: number): AgeBand {
  if (age <= 55) return '<=55';
  if (age <= 60) return '55-60';
  if (age <= 65) return '60-65';
  if (age <= 70) return '65-70';
  return '>70';
}

interface Rates {
  employee: number;
  employer: number;
}

// Citizens, and PRs from their 3rd year of residency onward. Effective 1 Jan 2026.
const FULL_RATE: Record<AgeBand, Rates> = {
  '<=55': { employee: 0.20, employer: 0.17 },
  '55-60': { employee: 0.18, employer: 0.16 },
  '60-65': { employee: 0.095, employer: 0.125 },
  '65-70': { employee: 0.075, employer: 0.09 },
  '>70': { employee: 0.05, employer: 0.075 },
};

// Graduated rates for new Singapore PRs in their 1st/2nd year. Only the <=55
// age band is officially confirmed; other bands fall back to the full rate,
// which understates take-home pay rather than overstating it. Double-check
// against the CPF Board's published SPR1/SPR2 tables if this applies to
// someone over 55.
const PR_YEAR1_RATE: Partial<Record<AgeBand, Rates>> = {
  '<=55': { employee: 0.05, employer: 0.04 },
};
const PR_YEAR2_RATE: Partial<Record<AgeBand, Rates>> = {
  '<=55': { employee: 0.15, employer: 0.09 },
};

export function getCpfResidencyYear(profile: UserProfile): 1 | 2 | 3 {
  if (profile.residencyStatus !== 'pr' || !profile.prStartDate) return 3;
  const years = differenceInYears(new Date(), parseISO(profile.prStartDate));
  if (years < 1) return 1;
  if (years < 2) return 2;
  return 3;
}

function getCpfRates(profile: UserProfile): { rates: Rates; residencyYear: 1 | 2 | 3 } | null {
  if (profile.residencyStatus !== 'citizen' && profile.residencyStatus !== 'pr') return null;
  const ageBand = getAgeBand(profile.currentAge);
  const residencyYear = getCpfResidencyYear(profile);
  const table = residencyYear === 1 ? PR_YEAR1_RATE : residencyYear === 2 ? PR_YEAR2_RATE : FULL_RATE;
  return { rates: table[ageBand] ?? FULL_RATE[ageBand], residencyYear };
}

export interface CpfBreakdown {
  applicable: boolean;
  employeeRate: number;
  employerRate: number;
  employeeContribution: number;
  employerContribution: number;
  takeHomePay: number;
  grossIncome: number; // estimated pre-CPF salary, derived by grossing takeHomePay back up
  residencyYear: 1 | 2 | 3 | null;
}

// profile.monthlyIncome is take-home pay (what actually lands in the bank each month) —
// CPF contributions are estimated by grossing that back up to the salary CPF would have
// been calculated on, rather than deducting CPF from it.
export function getCpfBreakdown(profile: UserProfile): CpfBreakdown {
  const takeHomePay = profile.monthlyIncome;
  const cpfRates = getCpfRates(profile);

  if (!cpfRates) {
    return {
      applicable: false,
      employeeRate: 0,
      employerRate: 0,
      employeeContribution: 0,
      employerContribution: 0,
      takeHomePay,
      grossIncome: takeHomePay,
      residencyYear: null,
    };
  }

  const { rates, residencyYear } = cpfRates;

  // Below the OW ceiling, CPF is a flat % of gross, so gross = takeHome / (1 - employeeRate).
  // Once that implied gross exceeds the ceiling, contributions cap at the ceiling instead,
  // so gross = takeHome + ceiling * employeeRate.
  const grossBelowCeiling = takeHomePay / (1 - rates.employee);
  const aboveCeiling = grossBelowCeiling > OW_CEILING;
  const grossIncome = aboveCeiling ? takeHomePay + OW_CEILING * rates.employee : grossBelowCeiling;
  const cpfWageBase = aboveCeiling ? OW_CEILING : grossBelowCeiling;
  const employeeContribution = cpfWageBase * rates.employee;
  const employerContribution = cpfWageBase * rates.employer;

  return {
    applicable: true,
    employeeRate: rates.employee,
    employerRate: rates.employer,
    employeeContribution,
    employerContribution,
    takeHomePay,
    grossIncome,
    residencyYear,
  };
}

// One-off migration helper: profiles created before monthlyIncome meant "take-home pay"
// stored gross salary instead. Given that old gross figure, estimates what the equivalent
// take-home pay would have been, so existing profiles can be converted without the user
// having to look up and re-enter their own number.
export function estimateNetFromGross(profile: UserProfile, grossIncome: number): number {
  const cpfRates = getCpfRates(profile);
  if (!cpfRates) return grossIncome;
  const cpfWageBase = Math.min(grossIncome, OW_CEILING);
  return grossIncome - cpfWageBase * cpfRates.rates.employee;
}
