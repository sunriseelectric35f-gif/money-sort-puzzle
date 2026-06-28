// Money Sort denominations — color-blind-safe (distinct emoji + label, not color alone).
// Tier ladder: each merge climbs to the next denomination. value uses the real
// 5x cash cascade fantasy: $1 -> $5 -> $20 -> $100 -> $500.
import { Denomination } from './types';

export const DENOMS: Denomination[] = [
  { tier: 0, label: '$1',   emoji: '💵', color: '#5BB76B', value: 1 },   // green
  { tier: 1, label: '$5',   emoji: '💶', color: '#4C8DF6', value: 5 },   // blue
  { tier: 2, label: '$20',  emoji: '💷', color: '#A86FE8', value: 20 },  // purple
  { tier: 3, label: '$100', emoji: '🪙', color: '#E4B23C', value: 100 }, // gold
  { tier: 4, label: '$500', emoji: '💎', color: '#3FD6CE', value: 500 }, // teal gem
];

export const TOP_TIER = DENOMS.length - 1;

export function denom(tier: number): Denomination {
  return DENOMS[Math.max(0, Math.min(tier, DENOMS.length - 1))];
}

// Value of one note of a tier.
export function tierValue(tier: number): number {
  return denom(tier).value;
}
