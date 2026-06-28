// Visual themes — purchasable with vault cash. Each theme recolors the board
// background, tube, accents, and the note palette (5 tiers). Color-blind safety
// is preserved because tiers also carry distinct emoji + labels (see items.ts).
export interface Theme {
  id: string;
  name: string;
  cost: number;          // vault cost to unlock (0 = free/default)
  bg: string;
  bg2: string;
  card: string;
  tube: string;
  accent: string;
  accent2: string;
  text: string;
  sub: string;
  notePalette: string[]; // 5 colors, indexed by tier 0..4
}

export const THEMES: Theme[] = [
  {
    id: 'classic', name: 'Classic Navy', cost: 0,
    bg: '#0E1428', bg2: '#161E3D', card: '#1E2950', tube: '#0A0F22',
    accent: '#4ADE80', accent2: '#FBBF24', text: '#F1F5F9', sub: '#8B95B8',
    notePalette: ['#5BB76B', '#4C8DF6', '#A86FE8', '#E4B23C', '#3FD6CE'],
  },
  {
    id: 'mint', name: 'Mint Vault', cost: 1500,
    bg: '#07211B', bg2: '#0C3026', card: '#12463A', tube: '#04140F',
    accent: '#34D399', accent2: '#FDE68A', text: '#ECFDF5', sub: '#6EE7B7',
    notePalette: ['#6EE7B7', '#34D399', '#A7F3D0', '#FBBF24', '#F0FDF4'],
  },
  {
    id: 'sunset', name: 'Sunset Cash', cost: 2500,
    bg: '#2A0E1E', bg2: '#3D1428', card: '#511A36', tube: '#1A0712',
    accent: '#FB7185', accent2: '#FCD34D', text: '#FFF1F2', sub: '#FDA4AF',
    notePalette: ['#FDA4AF', '#FB7185', '#F472B6', '#FCD34D', '#FFE4E6'],
  },
  {
    id: 'mono', name: 'Carbon Mono', cost: 4000,
    bg: '#0B0B0D', bg2: '#161618', card: '#222226', tube: '#050506',
    accent: '#E5E7EB', accent2: '#9CA3AF', text: '#FAFAFA', sub: '#71717A',
    notePalette: ['#52525B', '#71717A', '#A1A1AA', '#D4D4D8', '#FAFAFA'],
  },
  {
    id: 'gold', name: 'Gold Reserve', cost: 8000,
    bg: '#1C1606', bg2: '#2A2109', card: '#3D300E', tube: '#0F0B03',
    accent: '#FBBF24', accent2: '#FDE68A', text: '#FFFBEB', sub: '#D6B65C',
    notePalette: ['#D6B65C', '#FBBF24', '#F59E0B', '#FDE68A', '#FFFBEB'],
  },
];

export function theme(id: string): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}
