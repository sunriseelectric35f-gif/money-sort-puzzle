// Money Sort denominations — color-blind-safe (distinct emoji + label, not color alone)
import { Denomination } from './types';

export const DENOMS: Denomination[] = [
  { id: 0, label: '$1',   emoji: '💵', color: '#7AC74F' }, // green note
  { id: 1, label: '$5',   emoji: '💶', color: '#5B8DEF' }, // blue euro
  { id: 2, label: '$10',  emoji: '💷', color: '#B06FE8' }, // purple pound
  { id: 3, label: '$20',  emoji: '🪙', color: '#E4B558' }, // gold coin
  { id: 4, label: '$50',  emoji: '💴', color: '#E86F9E' }, // pink yen
  { id: 5, label: '$100', emoji: '💎', color: '#48D6D2' }, // teal gem (vault tier)
];

// Cash value of one note of a denomination (for score / vault accounting)
export const DENOM_VALUE = [1, 5, 10, 20, 50, 100];

export function denom(i: number): Denomination {
  return DENOMS[i % DENOMS.length];
}
