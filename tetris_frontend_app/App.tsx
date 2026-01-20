import React from "react";
import { StatusBar } from "expo-status-bar";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Pressable,
  PanResponder,
} from "react-native";
import BoardView from "./src/components/BoardView";
import ControlPad from "./src/components/ControlPad";
import NextPreview from "./src/components/NextPreview";
import {
  createInitialState,
  getGhostCells,
  getRenderBoard,
  hardDrop,
  stepGravity,
  tryMove,
  tryRotate,
  type GameState,
} from "./src/game/tetris";
import { loadHighScore, saveHighScore } from "./src/storage/highScore";

const THEME = {
  background: "#f9fafb",
  surface: "#ffffff",
  text: "#111827",
  primary: "#3b82f6",
  secondary: "#64748b",
  success: "#06b6d4",
  error: "#EF4444",
};

export default function App() {
  const { width } = useWindowDimensions();

  const [highScore, setHighScore] = React.useState<number>(0);
  const bagRef = React.useRef<import("./src/game/tetris").BagState | null>(null);
  const [state, setState] = React.useState<GameState | null>(null);

  // Layout: board centered; compute cell size based on screen width.
  const cellSize = Math.max(14, Math.min(28, Math.floor((width - 48) / 10)));

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const hs = await loadHighScore();
      if (!mounted) return;
      setHighScore(hs);
      const init = createInitialState(hs);
      bagRef.current = init.bag;
      setState(init.state);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persistHighScoreIfNeeded = React.useCallback(async (s: GameState) => {
    if (s.highScore > highScore) {
      setHighScore(s.highScore);
      await saveHighScore(s.highScore);
    }
  }, [highScore]);

  const startGame = React.useCallback(() => {
    if (!state) return;
    const init = createInitialState(highScore);
    bagRef.current = init.bag;
    setState({ ...init.state, status: "playing" });
  }, [state, highScore]);

  const togglePause = React.useCallback(() => {
    if (!state) return;
    if (state.status === "playing") setState({ ...state, status: "paused" });
    else if (state.status === "paused") setState({ ...state, status: "playing" });
  }, [state]);

  const moveLeft = React.useCallback(() => {
    if (!state || state.status !== "playing" || !state.active) return;
    setState({ ...state, active: tryMove(state.board, state.active, "left") });
  }, [state]);

  const moveRight = React.useCallback(() => {
    if (!state || state.status !== "playing" || !state.active) return;
    setState({ ...state, active: tryMove(state.board, state.active, "right") });
  }, [state]);

  const softDown = React.useCallback(() => {
    if (!state || state.status !== "playing" || !state.active) return;
    setState({ ...state, active: tryMove(state.board, state.active, "down") });
  }, [state]);

  const rotate = React.useCallback(() => {
    if (!state || state.status !== "playing" || !state.active) return;
    setState({ ...state, active: tryRotate(state.board, state.active) });
  }, [state]);

  const drop = React.useCallback(() => {
    if (!state || state.status !== "playing" || !state.active) return;
    // Hard drop to landing position; lock happens on next gravity tick.
    const landed = hardDrop(state.board, state.active);
    setState({ ...state, active: landed });
  }, [state]);

  // Gravity/game loop
  React.useEffect(() => {
    if (!state || state.status !== "playing") return;
    const bag = bagRef.current;
    if (!bag) return;

    const id = setInterval(() => {
      setState((prev) => {
        if (!prev || prev.status !== "playing") return prev;
        const bag2 = bagRef.current;
        if (!bag2) return prev;

        const res = stepGravity(prev, bag2);
        bagRef.current = res.bag;

        if (res.state.status === "gameover") {
          // save high score if needed
          void persistHighScoreIfNeeded(res.state);
        }
        return res.state;
      });
    }, state.dropIntervalMs);

    return () => clearInterval(id);
  }, [state, persistHighScoreIfNeeded]);

  // Optional swipe controls: horizontal swipe -> move; down swipe -> drop; tap -> rotate.
  const panResponder = React.useMemo(() => {
    let accX = 0;
    let accY = 0;
    const thresholdX = 16;
    const thresholdY = 22;

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Avoid stealing presses from buttons: only respond to meaningful drags
        return Math.abs(gestureState.dx) > 8 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        accX = 0;
        accY = 0;
      },
      onPanResponderMove: (_evt, g) => {
        accX += g.dx;
        accY += g.dy;

        // Reset deltas by consuming steps.
        if (accX > thresholdX) {
          moveRight();
          accX = 0;
        } else if (accX < -thresholdX) {
          moveLeft();
          accX = 0;
        }

        if (accY > thresholdY) {
          // Down swipe: hard drop for snappy mobile gameplay
          drop();
          accY = 0;
        }
      },
    });
  }, [moveLeft, moveRight, drop]);

  if (!state) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: THEME.background }]}>
        <View style={styles.center}>
          <Text style={styles.title}>Tetris Touch</Text>
          <Text style={styles.subtitle}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderBoard = getRenderBoard(state);
  const ghostCells = state.active ? getGhostCells(state.board, state.active) : [];
  const isInteractive = state.status !== "gameover";
  const isPaused = state.status === "paused";

  const headerRight =
    state.status === "playing" || state.status === "paused" ? (
      <NextPreview nextType={state.next} />
    ) : (
      <View style={styles.helpCard}>
        <Text style={styles.helpTitle}>Controls</Text>
        <Text style={styles.helpText}>◀ ▶ move</Text>
        <Text style={styles.helpText}>Rotate button or tap board</Text>
        <Text style={styles.helpText}>Drop for fast landing</Text>
      </View>
    );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: THEME.background }]}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Text style={styles.title}>Tetris Touch</Text>
          <Text style={styles.subtitle}>Modern • Mobile • Classic</Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Score</Text>
            <Text style={styles.statValue}>{state.score}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Lines</Text>
            <Text style={styles.statValue}>{state.lines}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Level</Text>
            <Text style={styles.statValue}>{state.level}</Text>
          </View>
          <View style={[styles.statPill, styles.statPillAlt]}>
            <Text style={styles.statLabel}>High</Text>
            <Text style={styles.statValue}>{Math.max(highScore, state.highScore)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.main}>
        <View style={styles.boardColumn}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tetris playfield (tap to rotate)"
            onPress={rotate}
            disabled={state.status !== "playing"}
            style={({ pressed }) => [{ opacity: pressed ? 0.98 : 1 }]}
            {...panResponder.panHandlers}
          >
            <BoardView board={renderBoard} ghostCells={ghostCells} cellSize={cellSize} />
          </Pressable>

          {state.status === "idle" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start game"
              onPress={startGame}
              style={({ pressed }) => [
                styles.primaryCta,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.primaryCtaText}>Start</Text>
            </Pressable>
          ) : null}

          {state.status === "gameover" ? (
            <View style={styles.gameOver}>
              <Text style={styles.gameOverTitle}>Game Over</Text>
              <Text style={styles.gameOverText}>Score: {state.score}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Play again"
                onPress={() => {
                  Alert.alert("New Game", "Start a new game?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Start", style: "default", onPress: startGame },
                  ]);
                }}
                style={({ pressed }) => [
                  styles.primaryCta,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.primaryCtaText}>Play Again</Text>
              </Pressable>
            </View>
          ) : null}

          {state.status === "paused" ? (
            <View style={styles.pausedBanner}>
              <Text style={styles.pausedText}>Paused</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sideColumn}>{headerRight}</View>
      </View>

      <ControlPad
        disabled={!isInteractive}
        onLeft={moveLeft}
        onRight={moveRight}
        onDown={softDown}
        onRotate={rotate}
        onDrop={drop}
        onPauseToggle={togglePause}
        isPaused={isPaused}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 12,
  },
  brand: {
    gap: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: THEME.text,
  },
  subtitle: {
    color: THEME.secondary,
    fontSize: 14,
    fontWeight: "600",
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: "rgba(100,116,139,0.25)",
    flexDirection: "row",
    gap: 8,
    alignItems: "baseline",
  },
  statPillAlt: {
    borderColor: "rgba(59,130,246,0.35)",
    backgroundColor: "rgba(59,130,246,0.06)",
  },
  statLabel: {
    color: THEME.secondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  statValue: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
  },
  main: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  boardColumn: {
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sideColumn: {
    width: 130,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  helpCard: {
    width: 130,
    padding: 12,
    borderRadius: 16,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: "rgba(100,116,139,0.25)",
    gap: 6,
  },
  helpTitle: {
    color: THEME.text,
    fontWeight: "900",
    marginBottom: 2,
  },
  helpText: {
    color: THEME.secondary,
    fontWeight: "700",
    fontSize: 12,
  },
  primaryCta: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
    width: "100%",
    maxWidth: 260,
    shadowColor: "#111827",
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  primaryCtaText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  gameOver: {
    alignItems: "center",
    gap: 10,
    paddingTop: 6,
  },
  gameOverTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: THEME.error,
  },
  gameOverText: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.text,
  },
  pausedBanner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(6,182,212,0.10)",
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.25)",
  },
  pausedText: {
    color: THEME.secondary,
    fontWeight: "900",
  },
});
