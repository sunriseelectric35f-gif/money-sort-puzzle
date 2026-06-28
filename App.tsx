import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GameState, Wallet } from './src/types';
import { DENOMS, denom } from './src/items';
import {
  initLevel,
  tapWallet,
  undo,
  hint,
  addFreeWallet,
  LEVEL_COUNT,
} from './src/engine';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── palette ─────────────────────────────────────────────────────────────────
const BG = '#0E1428';
const BG2 = '#161E3D';
const CARD = '#1E2950';
const ACCENT = '#4ADE80';   // money green
const ACCENT2 = '#FBBF24';  // gold
const TEXT = '#F1F5F9';
const SUB = '#8B95B8';
const TUBE = '#0A0F22';

// ─── single note (a stacked bill in a wallet) ────────────────────────────────
function Note({ id, w, h }: { id: number; w: number; h: number }) {
  const d = denom(id);
  return (
    <View style={[styles.note, { width: w, height: h, backgroundColor: d.color }]}>
      <Text style={[styles.noteEmoji, { fontSize: h * 0.5 }]}>{d.emoji}</Text>
    </View>
  );
}

// ─── wallet / tube ───────────────────────────────────────────────────────────
function WalletTube({
  wallet, capacity, selected, isHintTarget, isHintSource, onPress, tubeW, noteH,
}: {
  wallet: Wallet;
  capacity: number;
  selected: boolean;
  isHintTarget: boolean;
  isHintSource: boolean;
  onPress: () => void;
  tubeW: number;
  noteH: number;
}) {
  const lift = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(lift, { toValue: selected ? 1 : 0, duration: 140, useNativeDriver: true }).start();
  }, [selected]);

  useEffect(() => {
    if (isHintTarget || isHintSource) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 420, useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0, duration: 420, useNativeDriver: false }),
        ])
      ).start();
    } else {
      glow.stopAnimation(); glow.setValue(0);
    }
  }, [isHintTarget, isHintSource]);

  const borderColor = glow.interpolate({ inputRange: [0, 1], outputRange: ['#2A3766', ACCENT2] });
  const translateY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const tubeH = capacity * (noteH + 3) + 14;

  return (
    <Pressable onPress={onPress} disabled={wallet.banked}>
      <Animated.View
        style={[
          styles.tube,
          { width: tubeW, height: tubeH, borderColor, transform: [{ translateY }] },
          wallet.banked && styles.tubeBanked,
        ]}
      >
        {wallet.banked ? (
          <View style={styles.bankedInner}>
            <Text style={styles.bankedCheck}>✓</Text>
            <Text style={styles.bankedLabel}>BANKED</Text>
          </View>
        ) : (
          <View style={styles.tubeStack}>
            {wallet.notes.slice().reverse().map((id, i) => (
              <Note key={`${wallet.index}-${i}`} id={id} w={tubeW - 12} h={noteH} />
            ))}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function HUD({ game }: { game: GameState }) {
  const parColor = game.moves <= game.par ? ACCENT : game.moves <= game.par * 1.4 ? ACCENT2 : '#F87171';
  return (
    <View style={styles.hud}>
      <View style={styles.hudCol}>
        <Text style={styles.hudLabel}>LEVEL</Text>
        <Text style={styles.hudValue}>{game.levelIndex + 1}<Text style={styles.hudSub}>/{LEVEL_COUNT}</Text></Text>
      </View>
      <View style={[styles.hudCol, styles.hudColCenter]}>
        <Text style={styles.hudLabel}>VAULT</Text>
        <Text style={[styles.hudValue, { color: ACCENT2 }]}>${game.vault.toLocaleString()}</Text>
      </View>
      <View style={[styles.hudCol, styles.hudColRight]}>
        <Text style={styles.hudLabel}>MOVES</Text>
        <Text style={[styles.hudValue, { color: parColor }]}>{game.moves}<Text style={styles.hudSub}> · par {game.par}</Text></Text>
      </View>
    </View>
  );
}

// ─── combo flash ─────────────────────────────────────────────────────────────
function ComboFlash({ combo }: { combo: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (combo >= 2) {
      a.setValue(0);
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.delay(500),
        Animated.timing(a, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();
    }
  }, [combo]);
  if (combo < 2) return null;
  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] });
  return (
    <Animated.View style={[styles.combo, { opacity: a, transform: [{ scale }] }]} pointerEvents="none">
      <Text style={styles.comboText}>COMBO x{combo}!</Text>
    </Animated.View>
  );
}

// ─── overlay ─────────────────────────────────────────────────────────────────
function Victory({ game, onNext, onRetry }: { game: GameState; onNext: () => void; onRetry: () => void }) {
  if (game.phase !== 'victory') return null;
  const stars = '⭐'.repeat(game.stars) + '☆'.repeat(3 - game.stars);
  return (
    <View style={styles.overlay}>
      <View style={styles.overlayCard}>
        <Text style={styles.overlayTitle}>💰 Level Cleared!</Text>
        <Text style={styles.overlayStars}>{stars}</Text>
        <View style={styles.overlayStats}>
          <View style={styles.statBox}><Text style={styles.statNum}>{game.score}</Text><Text style={styles.statLbl}>SCORE</Text></View>
          <View style={styles.statBox}><Text style={styles.statNum}>{game.moves}</Text><Text style={styles.statLbl}>MOVES</Text></View>
          <View style={styles.statBox}><Text style={[styles.statNum, { color: ACCENT2 }]}>${game.vault}</Text><Text style={styles.statLbl}>VAULT</Text></View>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={onNext}>
          <Text style={styles.primaryBtnText}>Next Level →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onRetry}>
          <Text style={styles.secondaryBtnText}>Replay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── booster bar ─────────────────────────────────────────────────────────────
function Boosters({ game, onUndo, onHint, onWallet }: {
  game: GameState; onUndo: () => void; onHint: () => void; onWallet: () => void;
}) {
  return (
    <View style={styles.boosterBar}>
      <TouchableOpacity style={styles.boosterBtn} onPress={onUndo} disabled={game.history.length === 0}>
        <Text style={[styles.boosterEmoji, game.history.length === 0 && styles.dim]}>↩️</Text>
        <Text style={styles.boosterLabel}>Undo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.boosterBtn} onPress={onHint}>
        <Text style={styles.boosterEmoji}>💡</Text>
        <Text style={styles.boosterLabel}>Hint</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.boosterBtn} onPress={onWallet} disabled={game.freeWalletsUsed >= 2}>
        <Text style={[styles.boosterEmoji, game.freeWalletsUsed >= 2 && styles.dim]}>➕</Text>
        <Text style={styles.boosterLabel}>+Wallet ({2 - game.freeWalletsUsed})</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── main ────────────────────────────────────────────────────────────────────
export default function App() {
  const [game, setGame] = useState<GameState>(() => initLevel(0, 0));

  const handleTap = useCallback((i: number) => setGame(g => tapWallet(g, i)), []);
  const handleNext = useCallback(() => {
    setGame(g => initLevel((g.levelIndex + 1) % LEVEL_COUNT, g.vault));
  }, []);
  const handleRetry = useCallback(() => setGame(g => initLevel(g.levelIndex, g.vault)), []);

  // layout: lay wallets in rows of up to 5
  const n = game.wallets.length;
  const perRow = n <= 4 ? n : n <= 8 ? Math.ceil(n / 2) : Math.ceil(n / 3);
  const tubeW = Math.min(70, Math.floor((SW - 32) / perRow) - 8);
  const noteH = Math.max(16, Math.min(26, Math.floor((SH * 0.42) / game.capacity)) - 3);

  const rows: Wallet[][] = [];
  for (let i = 0; i < n; i += perRow) rows.push(game.wallets.slice(i, i + perRow));

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />
      <HUD game={game} />

      <View style={styles.titleWrap}>
        <Text style={styles.title}>Money Sort</Text>
        <Text style={styles.subtitle}>Sort the cash · fill a wallet to bank it</Text>
      </View>

      <View style={styles.boardArea}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.tubeRow}>
            {row.map(w => (
              <WalletTube
                key={w.index}
                wallet={w}
                capacity={game.capacity}
                selected={game.selected === w.index}
                isHintSource={game.hintMove?.from === w.index}
                isHintTarget={game.hintMove?.to === w.index}
                onPress={() => handleTap(w.index)}
                tubeW={tubeW}
                noteH={noteH}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        {DENOMS.slice(0, game.wallets.reduce((m, w) => Math.max(m, ...w.notes, -1), -1) + 1).map(d => (
          <View key={d.id} style={styles.legendItem}>
            <Text style={styles.legendEmoji}>{d.emoji}</Text>
            <Text style={styles.legendLabel}>{d.label}</Text>
          </View>
        ))}
      </View>

      <Boosters
        game={game}
        onUndo={() => setGame(g => undo(g))}
        onHint={() => setGame(g => hint(g))}
        onWallet={() => setGame(g => addFreeWallet(g))}
      />

      <ComboFlash combo={game.combo} />
      <Victory game={game} onNext={handleNext} onRetry={handleRetry} />
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  hud: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, backgroundColor: BG2, borderBottomWidth: 1, borderBottomColor: '#243056' },
  hudCol: { flex: 1 },
  hudColCenter: { alignItems: 'center' },
  hudColRight: { alignItems: 'flex-end' },
  hudLabel: { fontSize: 10, color: SUB, fontWeight: '700', letterSpacing: 1 },
  hudValue: { fontSize: 19, color: TEXT, fontWeight: '800', marginTop: 2 },
  hudSub: { fontSize: 11, color: SUB, fontWeight: '600' },

  titleWrap: { alignItems: 'center', paddingVertical: 10 },
  title: { fontSize: 26, fontWeight: '900', color: ACCENT, letterSpacing: 0.5 },
  subtitle: { fontSize: 12, color: SUB, marginTop: 2 },

  boardArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  tubeRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 10, marginVertical: 8 },

  tube: {
    backgroundColor: TUBE, borderRadius: 14, borderWidth: 2,
    paddingVertical: 7, paddingHorizontal: 6,
    justifyContent: 'flex-end', alignItems: 'center',
  },
  tubeBanked: { backgroundColor: '#0F2A1A', borderColor: ACCENT },
  tubeStack: { justifyContent: 'flex-end', alignItems: 'center', gap: 3 },
  bankedInner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bankedCheck: { fontSize: 28, color: ACCENT, fontWeight: '900' },
  bankedLabel: { fontSize: 9, color: ACCENT, fontWeight: '800', letterSpacing: 1, marginTop: 2 },

  note: { borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)' },
  noteEmoji: { textAlign: 'center' },

  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendEmoji: { fontSize: 14 },
  legendLabel: { fontSize: 11, color: SUB, fontWeight: '600' },

  boosterBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: BG2, borderTopWidth: 1, borderTopColor: '#243056' },
  boosterBtn: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 6 },
  boosterEmoji: { fontSize: 24 },
  boosterLabel: { fontSize: 11, color: SUB, fontWeight: '600', marginTop: 3 },
  dim: { opacity: 0.3 },

  combo: { position: 'absolute', top: SH * 0.4, alignSelf: 'center', backgroundColor: ACCENT2, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  comboText: { color: '#3B2A00', fontWeight: '900', fontSize: 18 },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(7,11,26,0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  overlayCard: { backgroundColor: CARD, borderRadius: 24, padding: 28, alignItems: 'center', width: SW * 0.84, borderWidth: 1, borderColor: ACCENT },
  overlayTitle: { fontSize: 24, fontWeight: '900', color: TEXT, marginBottom: 10 },
  overlayStars: { fontSize: 30, marginBottom: 16, letterSpacing: 4 },
  overlayStats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 22 },
  statBox: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: TEXT },
  statLbl: { fontSize: 10, color: SUB, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  primaryBtn: { backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 10 },
  primaryBtnText: { color: '#05230F', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { backgroundColor: '#26315A', borderRadius: 14, paddingVertical: 12, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#37457A' },
  secondaryBtnText: { color: SUB, fontSize: 15, fontWeight: '600' },
});
