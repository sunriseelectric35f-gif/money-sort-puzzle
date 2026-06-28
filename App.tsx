import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Easing,
  Dimensions, StatusBar as RNStatusBar, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  initLevel, tapWallet, undo, hint, addFreeWallet, LEVEL_COUNT,
  MAX_FREE_WALLETS, levelMeta,
} from './src/engine';
import { DENOMS, denom, tierValue } from './src/items';
import { SaveData, GameState } from './src/types';
import {
  loadSave, recordResult, buyTheme, setTheme, toggleSound, toggleHaptics,
  totalStars, DEFAULT_SAVE,
} from './src/storage';
import { THEMES, theme as getTheme, Theme } from './src/themes';
import { play, haptic, initAudio, setSoundEnabled, setHapticsEnabled } from './src/audio';

const { width: SCREEN_W } = Dimensions.get('window');

type Screen = 'menu' | 'levels' | 'game' | 'shop';

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
        <View style={[styles.center, { backgroundColor: '#0E1428' }]}>
          <Text style={{ color: '#4ADE80', fontSize: 22, fontWeight: '800' }}>💵 Money Sort</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
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

// ─────────────────────────────────────────────────────────────── MENU ────────
function MenuScreen({ th, save, onPlay, onShop, onToggleSound, onToggleHaptics }: {
  th: Theme; save: SaveData; onPlay: () => void; onShop: () => void;
  onToggleSound: () => void; onToggleHaptics: () => void;
}) {
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);
  const ty = float.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  return (
    <View style={[styles.center, { paddingHorizontal: 28 }]}>
      <Animated.Text style={{ fontSize: 64, transform: [{ translateY: ty }] }}>💵</Animated.Text>
      <Text style={[styles.title, { color: th.text }]}>Money Sort</Text>
      <Text style={[styles.subtitle, { color: th.accent }]}>Merge Puzzle</Text>

      <View style={[styles.vaultPill, { backgroundColor: th.card, borderColor: th.accent }]}>
        <Text style={{ fontSize: 18 }}>🏦</Text>
        <Text style={[styles.vaultTxt, { color: th.text }]}>${save.vault.toLocaleString()}</Text>
        <Text style={{ color: th.accent2, fontWeight: '700' }}>  ⭐ {totalStars(save)}</Text>
      </View>

      <TouchableOpacity style={[styles.bigBtn, { backgroundColor: th.accent }]} onPress={onPlay} activeOpacity={0.85}>
        <Text style={styles.bigBtnTxt}>▶  PLAY</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.bigBtn, { backgroundColor: th.card, borderColor: th.accent2, borderWidth: 2 }]} onPress={onShop} activeOpacity={0.85}>
        <Text style={[styles.bigBtnTxt, { color: th.text }]}>🎨  THEMES</Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.toggle, { backgroundColor: th.card }]} onPress={onToggleSound}>
          <Text style={{ color: th.text, fontWeight: '700' }}>{save.soundOn ? '🔊 Sound' : '🔇 Sound'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggle, { backgroundColor: th.card }]} onPress={onToggleHaptics}>
          <Text style={{ color: th.text, fontWeight: '700' }}>{save.hapticsOn ? '📳 Haptics' : '📴 Haptics'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.legendNote, { color: th.sub }]}>
        Merge {levelMeta(0).mergeN}× same notes → next denomination. Sort every wallet to win.
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────── LEVEL SELECT ───────
function LevelSelect({ th, save, onBack, onPick }: {
  th: Theme; save: SaveData; onBack: () => void; onPick: (i: number) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Header th={th} title="Select Level" onBack={onBack} right={`🏦 $${save.vault.toLocaleString()}`} />
      <ScrollView contentContainerStyle={styles.grid}>
        {Array.from({ length: LEVEL_COUNT }).map((_, i) => {
          const unlocked = i <= save.highestUnlocked;
          const stars = save.stars[i] ?? 0;
          const meta = levelMeta(i);
          return (
            <TouchableOpacity key={i} disabled={!unlocked}
              style={[styles.cell, {
                backgroundColor: unlocked ? th.card : th.tube,
                borderColor: stars === 3 ? th.accent2 : th.accent,
                opacity: unlocked ? 1 : 0.4,
              }]}
              onPress={() => { haptic('light'); onPick(i); }}>
              <Text style={[styles.cellNum, { color: th.text }]}>{unlocked ? i + 1 : '🔒'}</Text>
              <Text style={styles.cellStars}>{stars > 0 ? '⭐'.repeat(stars) : ''}</Text>
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
      <Header th={th} title="Theme Shop" onBack={onBack} right={`🏦 $${save.vault.toLocaleString()}`} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {THEMES.map(t => {
          const owned = save.unlockedTheme.includes(t.id);
          const active = save.activeTheme === t.id;
          return (
            <View key={t.id} style={[styles.shopCard, { backgroundColor: t.card, borderColor: active ? th.accent2 : 'transparent' }]}>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                {t.notePalette.map((c, i) => (
                  <View key={i} style={{ width: 26, height: 34, borderRadius: 5, backgroundColor: c, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12 }}>{DENOMS[i].emoji}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ color: t.text, fontWeight: '800', fontSize: 16 }}>{t.name}</Text>
              <Text style={{ color: t.accent, marginBottom: 10 }}>{t.cost === 0 ? 'Free' : `$${t.cost.toLocaleString()}`}</Text>
              {active ? (
                <View style={[styles.shopBtn, { backgroundColor: th.accent2 }]}><Text style={styles.shopBtnTxt}>✓ EQUIPPED</Text></View>
              ) : owned ? (
                <TouchableOpacity style={[styles.shopBtn, { backgroundColor: th.accent }]} onPress={() => onEquip(t.id)}>
                  <Text style={styles.shopBtnTxt}>EQUIP</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.shopBtn, { backgroundColor: save.vault >= t.cost ? th.accent : th.tube }]}
                  onPress={() => onBuy(t.id, t.cost)}>
                  <Text style={styles.shopBtnTxt}>{save.vault >= t.cost ? 'BUY' : 'NOT ENOUGH'}</Text>
                </TouchableOpacity>
              )}
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

  // side-effects on state change: merge/bank fx, win
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
        // attempted illegal move
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

  return (
    <View style={{ flex: 1 }}>
      <Header th={th} title={`Level ${levelIndex + 1}`} onBack={onExit}
        right={`🏦 $${g.vault.toLocaleString()}`} />

      <View style={styles.hud}>
        <Stat th={th} label="Moves" value={`${g.moves}`} />
        <Stat th={th} label="Par" value={`${g.par}`} />
        <Stat th={th} label="Score" value={`${g.score}`} />
        <Stat th={th} label="Combo" value={g.combo > 1 ? `x${g.combo}` : '—'} hot={g.combo > 1} />
      </View>

      <Animated.View style={[styles.board, { transform: [{ translateX: shakeX }] }]}>
        {g.wallets.map((w, i) => (
          <WalletView key={i} th={th} wallet={w} capacity={g.capacity}
            selected={g.selected === i} hint={g.hintMove?.from === i || g.hintMove?.to === i}
            justMerged={g.lastMerges.some(m => m.wallet === i)}
            justBanked={g.lastBank === i}
            onPress={() => onTap(i)} />
        ))}
      </Animated.View>

      <View style={styles.controls}>
        <CtrlBtn th={th} icon="↩️" label="Undo" disabled={g.history.length === 0}
          onPress={() => { setG(prev => undo(prev)); haptic('light'); play('tap'); }} />
        <CtrlBtn th={th} icon="💡" label={`Hint (${g.hintsUsed})`}
          onPress={() => { setG(prev => hint(prev)); haptic('light'); }} />
        <CtrlBtn th={th} icon="➕" label={`Wallet ${g.freeWalletsUsed}/${MAX_FREE_WALLETS}`}
          disabled={g.freeWalletsUsed >= MAX_FREE_WALLETS}
          onPress={() => { setG(prev => addFreeWallet(prev)); haptic('medium'); play('tap'); }} />
        <CtrlBtn th={th} icon="🔄" label="Reset"
          onPress={() => { setG(initLevel(levelIndex, g.vault)); haptic('medium'); }} />
      </View>

      <LegendBar th={th} tiers={meta.tiers} />

      {g.phase === 'victory' && (
        <Animated.View style={[styles.winOverlay, { opacity: winFade }]}>
          <View style={[styles.winCard, { backgroundColor: th.card, borderColor: th.accent2 }]}>
            <Text style={styles.winEmoji}>{g.stars === 3 ? '🏆' : '🎉'}</Text>
            <Text style={[styles.winTitle, { color: th.text }]}>Level Complete!</Text>
            <Text style={styles.winStars}>{'⭐'.repeat(g.stars)}{'☆'.repeat(3 - g.stars)}</Text>
            <Text style={[styles.winStat, { color: th.sub }]}>Moves {g.moves} · Par {g.par}</Text>
            <Text style={[styles.winStat, { color: th.accent }]}>Score {g.score}  ·  +${vaultGained(g).toLocaleString()} 🏦</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
              <TouchableOpacity style={[styles.winBtn, { backgroundColor: th.card, borderColor: th.accent, borderWidth: 2 }]} onPress={onExit}>
                <Text style={[styles.winBtnTxt, { color: th.text }]}>Levels</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.winBtn, { backgroundColor: th.accent }]}
                onPress={() => { reportedRef.current = false; winFade.setValue(0); onNext(); }}>
                <Text style={styles.winBtnTxt}>Next ▶</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function vaultGained(g: GameState): number {
  // recompute banked cash this level from current banked wallets
  let v = 0;
  for (const w of g.wallets) {
    if (w.banked && w.notes.length > 0) v += tierValue(w.notes[0]) * w.notes.length;
  }
  return v;
}

// ───────────────────────────────────────────────── WALLET (tube) ─────────────
function WalletView({ th, wallet, capacity, selected, hint, justMerged, justBanked, onPress }: {
  th: Theme; wallet: any; capacity: number; selected: boolean; hint: boolean;
  justMerged: boolean; justBanked: boolean; onPress: () => void;
}) {
  const lift = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(lift, { toValue: selected ? 1 : 0, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
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

  const ty = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const sc = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const slots = Array.from({ length: capacity });

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.walletWrap}>
      <Animated.View style={[
        styles.tube,
        {
          backgroundColor: th.tube,
          borderColor: justBanked ? th.accent2 : selected ? th.accent : hint ? th.accent2 : 'rgba(255,255,255,0.08)',
          borderWidth: selected || hint || justBanked ? 2.5 : 1.5,
          transform: [{ translateY: ty }, { scale: sc }],
        },
      ]}>
        {slots.map((_, idx) => {
          const fromTop = capacity - 1 - idx; // render top-down
          const note = wallet.notes[fromTop];
          if (note === undefined) {
            return <View key={idx} style={[styles.slot]} />;
          }
          const d = denom(note);
          const col = th.notePalette[note] ?? d.color;
          return (
            <View key={idx} style={[styles.slot, styles.note, { backgroundColor: col }]}>
              <Text style={styles.noteEmoji}>{d.emoji}</Text>
              <Text style={styles.noteLabel}>{d.label}</Text>
            </View>
          );
        })}
        {wallet.banked && (
          <View style={styles.bankedBadge}><Text style={{ fontSize: 14 }}>🔒</Text></View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ───────────────────────────────────────────────────── small UI ──────────────
function Header({ th, title, onBack, right }: { th: Theme; title: string; onBack: () => void; right?: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: th.card }]}>
        <Text style={{ color: th.text, fontSize: 18, fontWeight: '800' }}>‹</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: th.text }]}>{title}</Text>
      <Text style={[styles.headerRight, { color: th.accent }]}>{right ?? ''}</Text>
    </View>
  );
}
function Stat({ th, label, value, hot }: { th: Theme; label: string; value: string; hot?: boolean }) {
  return (
    <View style={[styles.stat, { backgroundColor: th.card }]}>
      <Text style={[styles.statLabel, { color: th.sub }]}>{label}</Text>
      <Text style={[styles.statValue, { color: hot ? th.accent2 : th.text }]}>{value}</Text>
    </View>
  );
}
function CtrlBtn({ th, icon, label, onPress, disabled }: { th: Theme; icon: string; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress}
      style={[styles.ctrl, { backgroundColor: th.card, opacity: disabled ? 0.4 : 1 }]}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={[styles.ctrlLabel, { color: th.sub }]}>{label}</Text>
    </TouchableOpacity>
  );
}
function LegendBar({ th, tiers }: { th: Theme; tiers: number }) {
  return (
    <View style={styles.legend}>
      {DENOMS.slice(0, tiers).map((d, i) => (
        <View key={i} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: th.notePalette[i] ?? d.color }]}>
            <Text style={{ fontSize: 10 }}>{d.emoji}</Text>
          </View>
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
  title: { fontSize: 40, fontWeight: '900', marginTop: 8, letterSpacing: 0.5 },
  subtitle: { fontSize: 18, fontWeight: '700', marginBottom: 26, letterSpacing: 3, textTransform: 'uppercase' },
  vaultPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, borderWidth: 1.5, marginBottom: 30 },
  vaultTxt: { fontSize: 18, fontWeight: '800' },
  bigBtn: { width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 14 },
  bigBtnTxt: { color: '#06240F', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  toggle: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  legendNote: { textAlign: 'center', marginTop: 28, fontSize: 13, lineHeight: 19, paddingHorizontal: 10 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800' },
  headerRight: { fontSize: 15, fontWeight: '800' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10, justifyContent: 'center' },
  cell: { width: (SCREEN_W - 24 - 40) / 5, aspectRatio: 0.82, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', padding: 4 },
  cellNum: { fontSize: 18, fontWeight: '900' },
  cellStars: { fontSize: 9, marginTop: 2 },
  cellPar: { fontSize: 9, marginTop: 2 },

  hud: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, gap: 8, marginBottom: 6 },
  stat: { flex: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '900', marginTop: 2 },

  board: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 12 },
  walletWrap: { alignItems: 'center' },
  tube: { width: 56, borderRadius: 14, padding: 5, gap: 5, justifyContent: 'flex-start' },
  slot: { width: 46, height: 34, borderRadius: 7 },
  note: { alignItems: 'center', justifyContent: 'center' },
  noteEmoji: { fontSize: 14, lineHeight: 16 },
  noteLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(0,0,0,0.55)' },
  bankedBadge: { position: 'absolute', top: -10, right: -6 },

  controls: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  ctrl: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', gap: 3 },
  ctrlLabel: { fontSize: 10, fontWeight: '700' },

  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 12, paddingVertical: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 20, height: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  legendTxt: { fontSize: 11, fontWeight: '700' },

  winOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  winCard: { width: '100%', borderRadius: 22, borderWidth: 2, padding: 26, alignItems: 'center' },
  winEmoji: { fontSize: 56 },
  winTitle: { fontSize: 26, fontWeight: '900', marginTop: 6 },
  winStars: { fontSize: 30, marginVertical: 10 },
  winStat: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  winBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  winBtnTxt: { color: '#06240F', fontSize: 16, fontWeight: '900' },

  shopCard: { borderRadius: 18, padding: 18, borderWidth: 2 },
  shopBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  shopBtnTxt: { color: '#06240F', fontWeight: '900', fontSize: 15 },
});
