import React from "react";
import { StyleSheet, View } from "react-native";
import type { Cell, Point } from "../game/tetris";
import { BOARD_HEIGHT, BOARD_WIDTH, TETROMINO_COLORS } from "../game/tetris";

type Props = {
  board: Cell[][];
  ghostCells: Point[];
  cellSize: number;
};

function keyFor(x: number, y: number) {
  return `${y}:${x}`;
}

export default function BoardView({ board, ghostCells, cellSize }: Props) {
  const ghostSet = React.useMemo(() => {
    const s = new Set<string>();
    for (const p of ghostCells) s.add(keyFor(p.x, p.y));
    return s;
  }, [ghostCells]);

  return (
    <View
      style={[
        styles.frame,
        {
          width: BOARD_WIDTH * cellSize + 2,
          height: BOARD_HEIGHT * cellSize + 2,
        },
      ]}
    >
      {board.map((row, y) => (
        <View key={`row-${y}`} style={styles.row}>
          {row.map((c, x) => {
            const isGhost = ghostSet.has(keyFor(x, y)) && c === 0;
            const bg = c === 0 ? "transparent" : TETROMINO_COLORS[c];
            return (
              <View
                key={`cell-${x}-${y}`}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: bg,
                    borderColor: c === 0 ? "rgba(100,116,139,0.12)" : "rgba(17,24,39,0.15)",
                    borderStyle: "solid",
                    borderWidth: 1,
                    opacity: c === 0 ? 1 : 1,
                  },
                  isGhost ? styles.ghostCell : null,
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(100,116,139,0.25)",
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    borderRadius: 6,
  },
  ghostCell: {
    backgroundColor: "rgba(59,130,246,0.10)",
    borderColor: "rgba(59,130,246,0.25)",
    borderStyle: "dashed",
  },
});
