import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  disabled?: boolean;
  onLeft: () => void;
  onRight: () => void;
  onDown: () => void;
  onRotate: () => void;
  onDrop: () => void;
  onPauseToggle: () => void;
  isPaused: boolean;
};

function useRepeater(fn: () => void, initialDelayMs = 180, repeatMs = 60) {
  const tRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const iRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = React.useCallback(() => {
    if (tRef.current) clearTimeout(tRef.current);
    if (iRef.current) clearInterval(iRef.current);
    tRef.current = null;
    iRef.current = null;
  }, []);

  const start = React.useCallback(() => {
    fn(); // fire once immediately for responsiveness
    stop();
    tRef.current = setTimeout(() => {
      iRef.current = setInterval(fn, repeatMs);
    }, initialDelayMs);
  }, [fn, initialDelayMs, repeatMs, stop]);

  React.useEffect(() => stop, [stop]);

  return { start, stop };
}

function Button({
  label,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const bg =
    variant === "primary"
      ? "#3b82f6"
      : variant === "danger"
        ? "#EF4444"
        : "#64748b";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

export default function ControlPad({
  disabled,
  onLeft,
  onRight,
  onDown,
  onRotate,
  onDrop,
  onPauseToggle,
  isPaused,
}: Props) {
  const leftR = useRepeater(onLeft);
  const rightR = useRepeater(onRight);
  const downR = useRepeater(onDown, 120, 50);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Button
          label="Rotate"
          variant="secondary"
          disabled={disabled}
          onPress={onRotate}
        />
        <Button
          label={isPaused ? "Resume" : "Pause"}
          variant="danger"
          disabled={disabled}
          onPress={onPauseToggle}
        />
        <Button label="Drop" disabled={disabled} onPress={onDrop} />
      </View>

      <View style={styles.row}>
        <Button
          label="◀"
          disabled={disabled}
          onPress={onLeft}
          onPressIn={leftR.start}
          onPressOut={leftR.stop}
        />
        <Button
          label="▼"
          disabled={disabled}
          onPress={onDown}
          onPressIn={downR.start}
          onPressOut={downR.stop}
        />
        <Button
          label="▶"
          disabled={disabled}
          onPress={onRight}
          onPressIn={rightR.start}
          onPressOut={rightR.stop}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  btn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  btnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
});
