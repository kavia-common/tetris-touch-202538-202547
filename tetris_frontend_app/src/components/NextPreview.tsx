import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Cell } from "../game/tetris";
import { getNextPreview, TETROMINO_COLORS } from "../game/tetris";

type Props = {
  nextType: "I" | "O" | "T" | "S" | "Z" | "J" | "L";
};

export default function NextPreview({ nextType }: Props) {
  const matrix = React.useMemo(() => getNextPreview(nextType), [nextType]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Next</Text>
      <View style={styles.grid}>
        {matrix.map((row, y) => (
          <View key={`nr-${y}`} style={styles.row}>
            {row.map((c: Cell, x) => (
              <View
                key={`nc-${x}-${y}`}
                style={[
                  styles.cell,
                  {
                    backgroundColor: c === 0 ? "transparent" : TETROMINO_COLORS[c],
                    borderColor: c === 0 ? "rgba(100,116,139,0.15)" : "rgba(17,24,39,0.15)",
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 120,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(100,116,139,0.25)",
  },
  title: {
    color: "#111827",
    fontWeight: "700",
    marginBottom: 8,
    fontSize: 14,
  },
  grid: {
    gap: 4,
  },
  row: {
    flexDirection: "row",
    gap: 4,
  },
  cell: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
  },
});
