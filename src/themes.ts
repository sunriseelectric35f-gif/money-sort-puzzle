// Visual themes — purchasable with vault cash. v2 "cozy money-jar" art direction:
// warm tabletop backgrounds, wooden/grass board frames, glossy glass jars and
// denomination chips. Color-blind safety is preserved because tiers ALSO carry
// distinct emoji + labels (see items.ts) and a consistent hue ladder
// (green→blue→purple→gold→teal) is kept across the colored themes.
export interface Theme {
  id: string;
  name: string;
  cost: number;          // vault cost to unlock (0 = free/default)

  // ── surfaces ──
  bg: string;            // app background (warm tabletop)
  bg2: string;           // secondary panel / pill backdrop
  card: string;          // cards & pills
  cardEdge: string;      // chunky bottom edge under cards/pills
  frame: string;         // board frame (wood / grass)
  frameEdge: string;     // darker frame base (3D lip)
  play: string;          // inner play area behind the jars

  // ── glass jars ──
  jarGlass: string;      // translucent glass fill
  jarRim: string;        // rim / outline
  gloss: string;         // specular highlight (translucent white)

  // ── accents & text ──
  accent: string;        // primary action color
  accentEdge: string;    // chunky base under primary buttons
  accent2: string;       // gold / star / coin highlight
  text: string;
  sub: string;

  // ── notes (denomination chips) ──
  notePalette: string[]; // 5 fills, indexed by tier 0..4
  noteEdge: string[];    // 5 darker outlines, indexed by tier 0..4
}

// Canonical color-blind-friendly hue ladder reused across the colored themes so
// players learn "green=$1, blue=$5…" once. Mono & Gold intentionally restyle it
// (emoji + label keep them unambiguous).
const NOTE_FILL = ['#5FBE6A', '#4FA3F0', '#B07BEC', '#F4B73B', '#3FCBC0'];
const NOTE_EDGE = ['#3C9A48', '#2E7BC4', '#854FC4', '#C98A1E', '#23A398'];

export const THEMES: Theme[] = [
  {
    id: 'classic', name: 'Cozy Cream', cost: 0,
    bg: '#FBF1DD', bg2: '#F4E6C8',
    card: '#FFF8EC', cardEdge: '#E6CFA1',
    frame: '#C9894A', frameEdge: '#9A6026',
    play: '#F7E9C9',
    jarGlass: 'rgba(255,255,255,0.42)', jarRim: '#B8854F', gloss: 'rgba(255,255,255,0.6)',
    accent: '#5FBE5C', accentEdge: '#3E9440', accent2: '#F4B73B',
    text: '#4A3726', sub: '#9B8161',
    notePalette: NOTE_FILL, noteEdge: NOTE_EDGE,
  },
  {
    id: 'mint', name: 'Mint Meadow', cost: 1500,
    bg: '#E5F6DF', bg2: '#D3EEC6',
    card: '#FBFFF6', cardEdge: '#BCE0A8',
    frame: '#79B557', frameEdge: '#4E8A34',
    play: '#F1FBEA',
    jarGlass: 'rgba(255,255,255,0.46)', jarRim: '#6BAB52', gloss: 'rgba(255,255,255,0.62)',
    accent: '#3FB36B', accentEdge: '#2C8A50', accent2: '#F6C84A',
    text: '#2E4A2C', sub: '#6E8E66',
    notePalette: NOTE_FILL, noteEdge: NOTE_EDGE,
  },
  {
    id: 'sunset', name: 'Sunset Jam', cost: 2500,
    bg: '#FFE7DA', bg2: '#FFD6C2',
    card: '#FFF5EE', cardEdge: '#F2C7B1',
    frame: '#DE885A', frameEdge: '#AF5C33',
    play: '#FFEFE5',
    jarGlass: 'rgba(255,255,255,0.42)', jarRim: '#D6885F', gloss: 'rgba(255,255,255,0.6)',
    accent: '#F77E5C', accentEdge: '#CE543A', accent2: '#FBC34A',
    text: '#5A372A', sub: '#A88070',
    notePalette: NOTE_FILL, noteEdge: NOTE_EDGE,
  },
  {
    id: 'mono', name: 'Slate Stone', cost: 4000,
    bg: '#E9EAEF', bg2: '#DBDCE4',
    card: '#FAFAFC', cardEdge: '#C4C5CF',
    frame: '#8A8C98', frameEdge: '#5E606C',
    play: '#F1F2F6',
    jarGlass: 'rgba(255,255,255,0.5)', jarRim: '#82838F', gloss: 'rgba(255,255,255,0.7)',
    accent: '#6C6E7B', accentEdge: '#4A4C57', accent2: '#C9A227',
    text: '#2E3039', sub: '#75788A',
    notePalette: ['#7C7E8A', '#9A9CAA', '#B6B8C6', '#D2D4DE', '#ECEDF3'],
    noteEdge:    ['#55576A', '#6E7082', '#8C8E9E', '#A8AAB8', '#C4C6D2'],
  },
  {
    id: 'gold', name: 'Gold Reserve', cost: 8000,
    bg: '#221A08', bg2: '#312612',
    card: '#3D2F14', cardEdge: '#2A1F0C',
    frame: '#C79A3A', frameEdge: '#8A6A1E',
    play: '#2C2110',
    jarGlass: 'rgba(255,236,180,0.16)', jarRim: '#D9B24E', gloss: 'rgba(255,248,220,0.4)',
    accent: '#F4C23B', accentEdge: '#C2901E', accent2: '#FDE9A8',
    text: '#FFF6DD', sub: '#CDAE63',
    notePalette: ['#C98F32', '#E0A93E', '#EFC24E', '#F6D873', '#FBEAA8'],
    noteEdge:    ['#8A5E18', '#A2761F', '#C29328', '#D8B33E', '#E6CC66'],
  },
];

export function theme(id: string): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}
