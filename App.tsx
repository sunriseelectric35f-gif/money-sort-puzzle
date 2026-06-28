import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Pressable, StyleSheet, ScrollView, Animated, Easing,
  Dimensions, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  initLevel, tapWallet, undo, hint, addFreeWallet, LEVEL_COUNT,
  MAX_FREE_WALLETS, levelMeta,
} from './src/engine';
import { DENOMS, denom, tierValue } from './src/items';
import { SaveData, GameState, Wallet } from './src/types';
import {
  loadSave, recordResult, buyTheme, setTheme, toggleSound, toggleHaptics,
  totalStars, DEFAULT_SAVE,
} from './src/storage';
import { THEMES, theme as getTheme, Theme } from './src/themes';
import { play, haptic, initAudio, setSoundEnabled, setHapticsEnabled } from './src/audio';

const { width: SCREEN_W } = Dimensions.get('window');

type Screen = 'menu' | 'levels' | 'game' | 'shop';

const shadowSoft = {
  shadowColor: '#3A2A12', shadowOpacity: 0.18, shadowRadius: 7,
  shadowOffset: { width: 0, height: 4 }, elevation: 4,
};
const shadowTiny = {
  shadowColor: '#3A2A12', shadowOpacity: 0.14, shadowRadius: 3,
  shadowOffset: { width: 0, height: 2 }, elevation: 2,
};

export default function App() {
  const [save, setSave] = useState<SaveData>(DEFAULT_SAVE);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<Screen>('menu');
  const [levelIndex, setLevelIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const s = await loadSave();
      setSave(s);
      setSoundEnabled(s.soundOn);
      setHapticsEnabled(s.hapticsOn);
      initAudio();
      setLoaded(true);
    })();
  }, []);

  const th = getTheme(save.activeTheme);
  const startLevel = (i: number) => { setLevelIndex(i); setScreen('game'); };

  if (!loaded) {
    return (
      <SafeAreaProvider>
        <View style={[styles.center, { backgroundColor: '#FBF1DD' }]}>
          <Text style={{ fontSize: 56 }}>🫙</Text>
          <Text style={{ color: '#4A3726', fontSize: 24, fontWeight: '900', marginTop: 8 }}>Money Sort</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={th.id === 'gold' ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.root, { backgroundColor: th.bg }]} edges={['top', 'bottom']}>
        {screen === 'menu' && (
          <MenuScreen th={th} save={save} onPlay={() => setScreen('levels')} onShop={() => setScreen('shop')}
            onToggleSound={async () => { const n = await toggleSound(save); setSave(n); setSoundEnabled(n.soundOn); }}
            onToggleHaptics={async () => { const n = await toggleHaptics(save); setSave(n); setHapticsEnabled(n.hapticsOn); }} />
        )}
        {screen === 'levels' && (
          <LevelSelect th={th} save={save} onBack={() => setScreen('menu')} onPick={startLevel} />
        )}
        {screen === 'shop' && (
          <ShopScreen th={th} save={save} onBack={() => setScreen('menu')}
            onBuy={async (id, cost) => { const n = await buyTheme(save, id, cost); if (n) { setSave(n); haptic('success'); play('bank'); } else { haptic('warning'); play('error'); } }}
            onEquip={async (id) => { const n = await setTheme(save, id); setSave(n); haptic('light'); }} />
        )}
        {screen === 'game' && (
          <GameScreen th={th} levelIndex={levelIndex} vault={save.vault}
            onExit={() => setScreen('levels')}
            onNext={() => { const ni = Math.min(levelIndex + 1, LEVEL_COUNT - 1); setLevelIndex(ni); }}
            onWin={async (stars, vaultGained) => {
              const n = await recordResult(save, levelIndex, stars, vaultGained);
              setSave(n);
            }} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ───────────────────────────────────────────────── reusable: chunky button ───
function ChunkyButton({ color, edge, onPress, disabled, children, style }: {
  color: string; edge: string; onPress: () => void; disabled?: boolean;
  children: React.ReactNode; style?: any;
}) {
  const dy = useRef(new Animated.Value(0)).current;
  const press = (to: number) =>
    Animated.timing(dy, { toValue: to, duration: 60, useNativeDriver: true }).start();
  const ty = dy.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });
  return (
    <Pressable disabled={disabled} onPress={onPress}
      onPressIn={() => press(1)} onPressOut={() => press(0)}
      style={[{ opacity: disabled ? 0.5 : 1 }, style]}>
      <View style={{ backgroundColor: edge, borderRadius: 18, paddingBottom: 5 }}>
        <Animated.View style={{ backgroundColor: color, borderRadius: 18, transform: [{ translateY: ty }] }}>
          {children}
        </Animated.View>
      </View>
    </Pressable>
  );
}

// ───────────────────────────────────────────────── reusable: cute face ───────
function Face({ size = 1, color = 'rgba(60,42,28,0.6)' }: { size?: number; color?: string }) {
  const e = 5 * size;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 7 * size }}>
        <View style={{ width: e, height: e, borderRadius: e, backgroundColor: color }} />
        <View style={{ width: e, height: e, borderRadius: e, backgroundColor: color }} />
      </View>
      <View style={{ width: 11 * size, height: 6 * size, borderBottomWidth: 2, borderColor: color, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, marginTop: 2 }} />
    </View>
  );
}

// ───────────────────────────────────────────────── reusable: coin badge ──────
function CoinBadge({ th, value }: { th: Theme; value: number }) {
  return (
    <View style={[styles.coinBadge, { backgroundColor: th.card, borderColor: th.accent2 }, shadowTiny]}>
      <View style={[styles.coin, { backgroundColor: th.accent2 }]}>
        <Text style={styles.coinGlyph}>$</Text>
      </View>
      <Text style={[styles.coinTxt, { color: th.text }]}>{value.toLocaleString()}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────── MENU ────────
function MenuScreen({ th, save, onPlay, onShop, onToggleSound, onToggleHaptics }: {
  th: Theme; save: SaveData; onPlay: () => void; onShop: () => void;
  onToggleSound: () => void; onToggleHaptics: () => void;
}) {
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);
  const ty = float.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const rot = float.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] });

  // hero jar filled with a mixed stack
  const heroNotes = [0, 1, 1, 2, 3];

  return (
    <View style={[styles.center, { paddingHorizontal: 28 }]}>
      <Animated.View style={{ transform: [{ translateY: ty }, { rotate: rot }] }}>
        <HeroJar th={th} notes={heroNotes} />
      </Animated.View>

      <Text style={[styles.title, { color: th.text }]}>Money Sort</Text>
      <View style={[styles.ribbon, { backgroundColor: th.accent2 }]}>
        <Text style={styles.ribbonTxt}>MERGE  PUZZLE</Text>
      </View>

      <View style={[styles.vaultPill, { backgroundColor: th.card, borderColor: th.cardEdge }, shadowTiny]}>
        <View style={[styles.coin, { backgroundColor: th.accent2 }]}><Text style={styles.coinGlyph}>$</Text></View>
        <Text style={[styles.vaultTxt, { color: th.text }]}>{save.vault.toLocaleString()}</Text>
        <Text style={{ color: th.sub, fontWeight: '900' }}>   ⭐ {totalStars(save)}</Text>
      </View>

      <ChunkyButton color={th.accent} edge={th.accentEdge} onPress={() => { haptic('medium'); play('tap'); onPlay(); }} style={{ width: '100%', marginBottom: 14 }}>
        <View style={styles.bigBtnInner}><Text style={styles.bigBtnTxt}>▶  PLAY</Text></View>
      </ChunkyButton>
      <ChunkyButton color={th.card} edge={th.cardEdge} onPress={() => { haptic('light'); play('tap'); onShop(); }} style={{ width: '100%' }}>
        <View style={styles.bigBtnInner}><Text style={[styles.bigBtnTxt, { color: th.text }]}>🎨  THEMES</Text></View>
      </ChunkyButton>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.toggle, { backgroundColor: th.card, borderColor: th.cardEdge }, shadowTiny]} onPress={onToggleSound}>
          <Text style={{ color: th.text, fontWeight: '800' }}>{save.soundOn ? '🔊 Sound' : '🔇 Sound'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggle, { backgroundColor: th.card, borderColor: th.cardEdge }, shadowTiny]} onPress={onToggleHaptics}>
          <Text style={{ color: th.text, fontWeight: '800' }}>{save.hapticsOn ? '📳 Haptics' : '📴 Haptics'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.legendNote, { color: th.sub }]}>
        Pour matching notes together. {levelMeta(0).mergeN} of a kind merge into the next bill. Sort every jar to win!
      </Text>
    </View>
  );
}

// big decorative jar for the menu hero
function HeroJar({ th, notes }: { th: Theme; notes: number[] }) {
  return (
    <View style={[styles.heroJar, { backgroundColor: th.jarGlass, borderColor: th.jarRim }]}>
      <View style={[styles.jarRim, { backgroundColor: th.jarRim, width: 88, top: -7 }]} />
      <View style={[styles.glossStripe, { backgroundColor: th.gloss, top: 18, left: 12, bottom: 18 }]} />
      <View style={styles.heroFace}><Face size={1.6} /></View>
      <View style={{ flexDirection: 'column-reverse', alignItems: 'center', gap: 5, paddingTop: 8 }}>
        {notes.map((t, i) => <Chip key={i} th={th} tier={t} w={58} h={24} />)}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────── LEVEL SELECT ───────
function LevelSelect({ th, save, onBack, onPick }: {
  th: Theme; save: SaveData; onBack: () => void; onPick: (i: number) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Header th={th} title="Select Level" onBack={onBack} vault={save.vault} />
      <ScrollView contentContainerStyle={styles.grid}>
        {Array.from({ length: LEVEL_COUNT }).map((_, i) => {
          const unlocked = i <= save.highestUnlocked;
          const stars = save.stars[i] ?? 0;
          const meta = levelMeta(i);
          const done = stars === 3;
          return (
            <TouchableOpacity key={i} disabled={!unlocked} activeOpacity={0.85}
              style={[styles.cell, {
                backgroundColor: unlocked ? th.card : th.bg2,
                borderColor: done ? th.accent2 : th.cardEdge,
                opacity: unlocked ? 1 : 0.55,
              }, unlocked && shadowTiny]}
              onPress={() => { haptic('light'); play('tap'); onPick(i); }}>
              {done && <View style={[styles.cellCrown, { backgroundColor: th.accent2 }]}><Text style={{ fontSize: 10 }}>👑</Text></View>}
              <Text style={[styles.cellNum, { color: unlocked ? th.text : th.sub }]}>{unlocked ? i + 1 : '🔒'}</Text>
              <Text style={styles.cellStars}>{stars > 0 ? '⭐'.repeat(stars) : '·····'.slice(0, 3)}</Text>
              <Text style={[styles.cellPar, { color: th.sub }]}>par {meta.par}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────── SHOP ────────
function ShopScreen({ th, save, onBack, onBuy, onEquip }: {
  th: Theme; save: SaveData; onBack: () => void;
  onBuy: (id: string, cost: number) => void; onEquip: (id: string) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Header th={th} title="Theme Shop" onBack={onBack} vault={save.vault} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {THEMES.map(t => {
          const owned = save.unlockedTheme.includes(t.id);
          const active = save.activeTheme === t.id;
          const canBuy = save.vault >= t.cost;
          return (
            <View key={t.id} style={[styles.shopCard, { backgroundColor: t.bg, borderColor: active ? th.accent2 : t.cardEdge }, shadowSoft]}>
              {/* live preview: a mini board frame with chips */}
              <View style={[styles.shopPreview, { backgroundColor: t.frame, borderBottomColor: t.frameEdge }]}>
                <View style={[styles.shopPreviewInner, { backgroundColor: t.play }]}>
                  {t.notePalette.map((c, i) => (
                    <View key={i} style={[styles.shopChip, { backgroundColor: c, borderColor: t.noteEdge[i] }]}>
                      <Text style={styles.shopChipTxt}>{DENOMS[i].emoji}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <View>
                  <Text style={{ color: t.text, fontWeight: '900', fontSize: 17 }}>{t.name}</Text>
                  <Text style={{ color: t.accent, fontWeight: '800', marginTop: 2 }}>{t.cost === 0 ? 'Free' : `$${t.cost.toLocaleString()}`}</Text>
                </View>
                {active ? (
                  <View style={[styles.shopBtn, { backgroundColor: th.accent2 }]}><Text style={styles.shopBtnTxt}>✓ ACTIVE</Text></View>
                ) : owned ? (
                  <ChunkyButton color={th.accent} edge={th.accentEdge} onPress={() => onEquip(t.id)}>
                    <View style={styles.shopBtn}><Text style={styles.shopBtnTxt}>EQUIP</Text></View>
                  </ChunkyButton>
                ) : canBuy ? (
                  <ChunkyButton color={th.accent2} edge={th.cardEdge} onPress={() => onBuy(t.id, t.cost)}>
                    <View style={styles.shopBtn}><Text style={[styles.shopBtnTxt, { color: '#4A3726' }]}>BUY</Text></View>
                  </ChunkyButton>
                ) : (
                  <View style={[styles.shopBtn, { backgroundColor: th.bg2 }]}><Text style={[styles.shopBtnTxt, { color: th.sub }]}>LOCKED</Text></View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────── GAME ────────
function GameScreen({ th, levelIndex, vault, onExit, onNext, onWin }: {
  th: Theme; levelIndex: number; vault: number;
  onExit: () => void; onNext: () => void; onWin: (stars: number, vaultGained: number) => void;
}) {
  const [g, setG] = useState<GameState>(() => initLevel(levelIndex, vault));
  const shake = useRef(new Animated.Value(0)).current;
  const winFade = useRef(new Animated.Value(0)).current;
  const reportedRef = useRef(false);

  useEffect(() => { setG(initLevel(levelIndex, vault)); reportedRef.current = false; winFade.setValue(0); }, [levelIndex]);

  useEffect(() => {
    if (g.lastMerges.length > 0) { play('merge'); haptic('medium'); }
    if (g.lastBank !== null) { play('bank'); haptic('success'); }
    if (g.phase === 'victory' && !reportedRef.current) {
      reportedRef.current = true;
      play('win'); haptic('success');
      onWin(g.stars, vaultGained(g));
      Animated.timing(winFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [g]);

  const doShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const onTap = useCallback((i: number) => {
    setG(prev => {
      const before = prev.selected;
      const next = tapWallet(prev, i);
      if (before !== null && next.selected === null && next.moves === prev.moves && next.phase === prev.phase) {
        play('error'); haptic('warning'); doShake();
      } else if (next.selected !== prev.selected && next.moves === prev.moves) {
        play('tap'); haptic('light');
      } else if (next.moves > prev.moves) {
        play('pour'); haptic('light');
      }
      return next;
    });
  }, []);

  const shakeX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-9, 9] });
  const meta = levelMeta(levelIndex);
  const parRatio = g.par > 0 ? Math.min(g.moves / g.par, 1.5) : 0;
  const overPar = g.moves > g.par;

  return (
    <View style={{ flex: 1 }}>
      <Header th={th} title={`Level ${levelIndex + 1}`} onBack={onExit} vault={g.vault} />

      <View style={styles.hud}>
        <Stat th={th} label="Moves" value={`${g.moves}`} hot={overPar} />
        <Stat th={th} label="Par" value={`${g.par}`} />
        <Stat th={th} label="Score" value={`${g.score}`} />
        <Stat th={th} label="Combo" value={g.combo > 1 ? `x${g.combo}` : '—'} hot={g.combo > 1} />
      </View>

      {/* wooden board frame with inner play area */}
      <View style={[styles.boardFrame, { backgroundColor: th.frame, borderBottomColor: th.frameEdge }, shadowSoft]}>
        <View style={[styles.playArea, { backgroundColor: th.play }]}>
          <Animated.View style={[styles.board, { transform: [{ translateX: shakeX }] }]}>
            {g.wallets.map((w, i) => (
              <Jar key={i} th={th} wallet={w} capacity={g.capacity}
                selected={g.selected === i} hint={g.hintMove?.from === i || g.hintMove?.to === i}
                justMerged={g.lastMerges.some(m => m.wallet === i)}
                justBanked={g.lastBank === i}
                onPress={() => onTap(i)} />
            ))}
          </Animated.View>
        </View>
      </View>

      <View style={styles.controls}>
        <CtrlBtn th={th} icon="↩️" label="Undo" disabled={g.history.length === 0}
          onPress={() => { setG(prev => undo(prev)); haptic('light'); play('tap'); }} />
        <CtrlBtn th={th} icon="💡" label={`Hint·${g.hintsUsed}`}
          onPress={() => { setG(prev => hint(prev)); haptic('light'); }} />
        <CtrlBtn th={th} icon="🫙" label={`Jar ${g.freeWalletsUsed}/${MAX_FREE_WALLETS}`}
          disabled={g.freeWalletsUsed >= MAX_FREE_WALLETS}
          onPress={() => { setG(prev => addFreeWallet(prev)); haptic('medium'); play('tap'); }} />
        <CtrlBtn th={th} icon="🔄" label="Reset"
          onPress={() => { setG(initLevel(levelIndex, g.vault)); haptic('medium'); }} />
      </View>

      <LegendBar th={th} tiers={meta.tiers} />

      {g.phase === 'victory' && (
        <Animated.View style={[styles.winOverlay, { opacity: winFade }]}>
          <Confetti th={th} />
          <View style={[styles.winCard, { backgroundColor: th.card, borderColor: th.accent2 }, shadowSoft]}>
            <Text style={styles.winEmoji}>{g.stars === 3 ? '🏆' : '🎉'}</Text>
            <Text style={[styles.winTitle, { color: th.text }]}>Level Complete!</Text>
            <Text style={styles.winStars}>{'⭐'.repeat(g.stars)}{'☆'.repeat(3 - g.stars)}</Text>
            <Text style={[styles.winStat, { color: th.sub }]}>Moves {g.moves} · Par {g.par}</Text>
            <View style={[styles.winCashPill, { backgroundColor: th.bg2 }]}>
              <View style={[styles.coin, { backgroundColor: th.accent2 }]}><Text style={styles.coinGlyph}>$</Text></View>
              <Text style={{ color: th.text, fontWeight: '900', fontSize: 16 }}>+{vaultGained(g).toLocaleString()}</Text>
              <Text style={{ color: th.sub, fontWeight: '700' }}>   Score {g.score}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18, width: '100%' }}>
              <ChunkyButton color={th.card} edge={th.cardEdge} onPress={onExit} style={{ flex: 1 }}>
                <View style={styles.winBtn}><Text style={[styles.winBtnTxt, { color: th.text }]}>Levels</Text></View>
              </ChunkyButton>
              <ChunkyButton color={th.accent} edge={th.accentEdge}
                onPress={() => { reportedRef.current = false; winFade.setValue(0); onNext(); }} style={{ flex: 1 }}>
                <View style={styles.winBtn}><Text style={styles.winBtnTxt}>Next ▶</Text></View>
              </ChunkyButton>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function vaultGained(g: GameState): number {
  let v = 0;
  for (const w of g.wallets) {
    if (w.banked && w.notes.length > 0) v += tierValue(w.notes[0]) * w.notes.length;
  }
  return v;
}

// ───────────────────────────────────────── confetti burst (pure Animated) ────
function Confetti({ th }: { th: Theme }) {
  const palette = [...th.notePalette, th.accent2, th.accent];
  const pieces = useRef(Array.from({ length: 14 }).map((_, i) => ({
    x: (i / 14) * SCREEN_W + (i % 3) * 12 - 20,
    delay: (i % 5) * 120,
    color: palette[i % palette.length],
    rot: i % 2 === 0 ? '20deg' : '-25deg',
    v: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    pieces.forEach(p => {
      Animated.timing(p.v, { toValue: 1, duration: 1400, delay: p.delay, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
    });
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const ty = p.v.interpolate({ inputRange: [0, 1], outputRange: [-40, 520] });
        const op = p.v.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View key={i} style={{
            position: 'absolute', left: p.x, top: 0, width: 9, height: 14, borderRadius: 2,
            backgroundColor: p.color, opacity: op,
            transform: [{ translateY: ty }, { rotate: p.rot }],
          }} />
        );
      })}
    </View>
  );
}

// ───────────────────────────────────────────── denomination chip (a note) ────
function Chip({ th, tier, w = 48, h = 30 }: { th: Theme; tier: number; w?: number; h?: number }) {
  const d = denom(tier);
  const fill = th.notePalette[tier] ?? d.color;
  const edge = th.noteEdge[tier] ?? '#00000033';
  return (
    <View style={{
      width: w, height: h, borderRadius: 9, backgroundColor: fill, borderWidth: 2, borderColor: edge,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      {/* gloss highlight on the chip */}
      <View style={{ position: 'absolute', top: 2, left: 4, right: 4, height: h * 0.34, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.32)' }} />
      <Text style={styles.chipLabel}>{d.label}</Text>
    </View>
  );
}

// ───────────────────────────────────────────────── JAR (was WalletView) ──────
function Jar({ th, wallet, capacity, selected, hint, justMerged, justBanked, onPress }: {
  th: Theme; wallet: Wallet; capacity: number; selected: boolean; hint: boolean;
  justMerged: boolean; justBanked: boolean; onPress: () => void;
}) {
  const lift = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(lift, { toValue: selected ? 1 : 0, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [selected]);

  useEffect(() => {
    if (justMerged || justBanked) {
      pulse.setValue(0);
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.spring(pulse, { toValue: 0, friction: 4, useNativeDriver: true }),
      ]).start();
    }
  }, [justMerged, justBanked]);

  const ty = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const sc = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const slots = Array.from({ length: capacity });
  const filled = wallet.notes.length;
  const ringColor = justBanked ? th.accent2 : selected ? th.accent : hint ? th.accent2 : th.jarRim;
  const ringW = selected || hint || justBanked ? 3.5 : 2.5;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.jarWrap}>
      <Animated.View style={{ transform: [{ translateY: ty }, { scale: sc }] }}>
        {/* rim */}
        <View style={[styles.jarRim, { backgroundColor: ringColor, width: 64 }]} />
        {/* glass body */}
        <View style={[styles.jar, { backgroundColor: th.jarGlass, borderColor: ringColor, borderWidth: ringW }]}>
          {/* gloss stripe */}
          <View style={[styles.glossStripe, { backgroundColor: th.gloss }]} />
          {/* cute face floats over the empty upper portion */}
          {filled < capacity && (
            <View style={[styles.jarFace, { top: 6 + (capacity - 1 - filled) * 2 }]} pointerEvents="none">
              <Face size={0.95} />
            </View>
          )}
          {/* chips, bottom-up */}
          <View style={styles.jarChips}>
            {slots.map((_, idx) => {
              const note = wallet.notes[idx]; // bottom-up
              if (note === undefined) return <View key={idx} style={styles.emptySlot} />;
              return <Chip key={idx} th={th} tier={note} />;
            })}
          </View>
          {wallet.banked && (
            <View style={styles.bankedBadge}><Text style={{ fontSize: 13 }}>✅</Text></View>
          )}
        </View>
        {/* base shadow ellipse */}
        <View style={[styles.jarBase, { backgroundColor: 'rgba(0,0,0,0.10)' }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ───────────────────────────────────────────────────── small UI ──────────────
function Header({ th, title, onBack, vault }: { th: Theme; title: string; onBack: () => void; vault?: number }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => { haptic('light'); onBack(); }} style={[styles.backBtn, { backgroundColor: th.card, borderColor: th.cardEdge }, shadowTiny]}>
        <Text style={{ color: th.text, fontSize: 22, fontWeight: '900', marginTop: -2 }}>‹</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: th.text }]}>{title}</Text>
      {vault !== undefined ? <CoinBadge th={th} value={vault} /> : <View style={{ width: 40 }} />}
    </View>
  );
}
function Stat({ th, label, value, hot }: { th: Theme; label: string; value: string; hot?: boolean }) {
  return (
    <View style={[styles.stat, { backgroundColor: th.card, borderColor: hot ? th.accent2 : th.cardEdge }, shadowTiny]}>
      <Text style={[styles.statLabel, { color: th.sub }]}>{label}</Text>
      <Text style={[styles.statValue, { color: hot ? th.accent2 : th.text }]}>{value}</Text>
    </View>
  );
}
function CtrlBtn({ th, icon, label, onPress, disabled }: { th: Theme; icon: string; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} activeOpacity={0.8}
      style={[styles.ctrl, { backgroundColor: th.card, borderBottomColor: th.cardEdge, opacity: disabled ? 0.45 : 1 }, shadowTiny]}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={[styles.ctrlLabel, { color: th.sub }]}>{label}</Text>
    </TouchableOpacity>
  );
}
function LegendBar({ th, tiers }: { th: Theme; tiers: number }) {
  return (
    <View style={styles.legend}>
      {DENOMS.slice(0, tiers).map((d, i) => (
        <View key={i} style={[styles.legendItem, { backgroundColor: th.bg2 }]}>
          <View style={[styles.legendDot, { backgroundColor: th.notePalette[i] ?? d.color, borderColor: th.noteEdge[i] ?? '#0003' }]} />
          <Text style={[styles.legendTxt, { color: th.sub }]}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────── styles ──────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 42, fontWeight: '900', marginTop: 18, letterSpacing: 0.3 },
  ribbon: { paddingHorizontal: 18, paddingVertical: 5, borderRadius: 20, marginTop: 8, marginBottom: 22, transform: [{ rotate: '-2deg' }] },
  ribbonTxt: { color: '#5A3B12', fontSize: 13, fontWeight: '900', letterSpacing: 3 },

  vaultPill: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 30, borderWidth: 2, marginBottom: 28 },
  vaultTxt: { fontSize: 18, fontWeight: '900' },
  coin: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  coinGlyph: { color: '#5A3B12', fontWeight: '900', fontSize: 13 },

  bigBtnInner: { paddingVertical: 17, alignItems: 'center' },
  bigBtnTxt: { color: '#0C3314', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 12, marginTop: 18 },
  toggle: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, borderWidth: 2 },
  legendNote: { textAlign: 'center', marginTop: 26, fontSize: 13, lineHeight: 19, paddingHorizontal: 10, fontWeight: '600' },

  // hero jar
  heroJar: { width: 104, height: 120, borderRadius: 26, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 4, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8, overflow: 'hidden' },
  heroFace: { position: 'absolute', top: 20, alignSelf: 'center' },

  // header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 21, fontWeight: '900' },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 2 },
  coinTxt: { fontSize: 15, fontWeight: '900' },

  // level grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 14, gap: 11, justifyContent: 'center' },
  cell: { width: (SCREEN_W - 28 - 44) / 5, aspectRatio: 0.8, borderRadius: 16, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', padding: 4 },
  cellCrown: { position: 'absolute', top: -7, right: -5, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cellNum: { fontSize: 19, fontWeight: '900' },
  cellStars: { fontSize: 8, marginTop: 3, letterSpacing: -1 },
  cellPar: { fontSize: 9, marginTop: 2, fontWeight: '700' },

  // hud
  hud: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, gap: 8, marginBottom: 8 },
  stat: { flex: 1, borderRadius: 14, paddingVertical: 8, alignItems: 'center', borderWidth: 2 },
  statLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '900', marginTop: 2 },

  // board
  boardFrame: { flex: 1, marginHorizontal: 12, borderRadius: 28, padding: 9, borderBottomWidth: 8 },
  playArea: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  board: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 12 },

  // jar
  jarWrap: { alignItems: 'center' },
  jarRim: { height: 9, borderRadius: 6, alignSelf: 'center', marginBottom: -3, zIndex: 2 },
  jar: { width: 60, borderRadius: 16, borderTopLeftRadius: 11, borderTopRightRadius: 11, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, paddingHorizontal: 5, paddingTop: 7, paddingBottom: 6, overflow: 'hidden' },
  glossStripe: { position: 'absolute', left: 8, top: 12, bottom: 14, width: 9, borderRadius: 5, zIndex: 1 },
  jarFace: { position: 'absolute', alignSelf: 'center', zIndex: 3 },
  jarChips: { flexDirection: 'column-reverse', alignItems: 'center', gap: 4, minHeight: 40 },
  emptySlot: { width: 48, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.10)' },
  bankedBadge: { position: 'absolute', top: -2, right: -2, zIndex: 4 },
  jarBase: { width: 50, height: 7, borderRadius: 6, alignSelf: 'center', marginTop: 3, opacity: 0.5 },

  // controls
  controls: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  ctrl: { flex: 1, borderRadius: 16, paddingVertical: 10, alignItems: 'center', gap: 3, borderBottomWidth: 4 },
  ctrlLabel: { fontSize: 10, fontWeight: '800' },

  // legend
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, paddingVertical: 8, paddingHorizontal: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  legendDot: { width: 16, height: 16, borderRadius: 5, borderWidth: 1.5 },
  legendTxt: { fontSize: 11, fontWeight: '800' },

  // chip
  chipLabel: { fontSize: 12, fontWeight: '900', color: 'rgba(0,0,0,0.6)' },

  // win
  winOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,18,6,0.6)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  winCard: { width: '100%', borderRadius: 26, borderWidth: 3, padding: 26, alignItems: 'center' },
  winEmoji: { fontSize: 58 },
  winTitle: { fontSize: 26, fontWeight: '900', marginTop: 6 },
  winStars: { fontSize: 30, marginVertical: 10 },
  winStat: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  winCashPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18, marginTop: 12 },
  winBtn: { paddingVertical: 14, alignItems: 'center' },
  winBtnTxt: { color: '#0C3314', fontSize: 16, fontWeight: '900' },

  // shop
  shopCard: { borderRadius: 22, padding: 14, borderWidth: 3 },
  shopPreview: { borderRadius: 16, padding: 8, borderBottomWidth: 6 },
  shopPreviewInner: { borderRadius: 11, flexDirection: 'row', justifyContent: 'center', gap: 6, padding: 10 },
  shopChip: { width: 30, height: 38, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  shopChipTxt: { fontSize: 14 },
  shopBtn: { paddingVertical: 11, paddingHorizontal: 22, borderRadius: 14, alignItems: 'center' },
  shopBtnTxt: { color: '#0C3314', fontWeight: '900', fontSize: 14 },
});
