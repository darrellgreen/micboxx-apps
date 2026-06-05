import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Polyline, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable, BottomActionSheet } from "@micboxx/ui";

const CARD_BG = "#131820";

export function AlbumPerformanceOverviewChart() {
  const [selectedDays, setSelectedDays] = useState<7 | 14 | 30>(7);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Scale plays based on the selected period
  const periodPlaysMultiplier = selectedDays === 14 ? 1.8 : selectedDays === 30 ? 3.5 : 1.0;
  const baseValues = [100, 180, 360, 220, 120, 170, 255];
  const totalAlbumPlays = 1400;
  
  // Ensure the daily average increases for longer periods to show positive performance scaling
  const averagePlaysPerDay = (totalAlbumPlays / 7) * (selectedDays === 14 ? 1.4 : selectedDays === 30 ? 1.8 : 1.0);

  // Generate simulated daily plays based on total period plays using sine wave + growth trends
  const chartValues = (() => {
    if (selectedDays === 7) {
      return baseValues;
    }

    const points: number[] = [];
    for (let i = 0; i < selectedDays; i++) {
      const growth = (i / (selectedDays - 1 || 1)) * 0.35; // positive growth trend from left to right (recent days)
      const trend = Math.sin((i / (selectedDays - 1 || 1)) * Math.PI * 2.5) * 0.2;
      const subTrend = Math.sin((i / (selectedDays - 1 || 1)) * Math.PI * 6) * 0.1;
      const pseudoRand = (((i * 23 + 7) % 10) / 10) * 0.15 - 0.075;
      const multiplier = Math.max(0.1, 0.85 + growth + trend + subTrend + pseudoRand);
      points.push(Math.round(averagePlaysPerDay * multiplier));
    }
    return points;
  })();

  // Generate dynamic date labels based on the selected period
  const dateOffsets = selectedDays === 14
    ? [14, 10, 6, 2]
    : selectedDays === 30
      ? [30, 20, 10, 2]
      : [7, 5, 3, 1];

  const dates = dateOffsets.map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const width = 340;
  const height = 160;
  const paddingLeft = 32; // space for Y-axis labels
  const paddingRight = 16;
  const paddingTop = 15;
  const paddingBottom = 20;
  
  const baseline = height - paddingBottom;
  const chartHeight = baseline - paddingTop;
  const chartWidth = width - paddingLeft - paddingRight;

  const maxSeriesValue = Math.max(...chartValues, 40);
  const maxValue = Math.ceil(maxSeriesValue / 40) * 40; // round up to multiple of 40 for clean grid ticks
  const minValue = 0;

  const stepX = chartWidth / (chartValues.length - 1 || 1);
  
  const coordinates = chartValues.map((val, index) => {
    const x = paddingLeft + stepX * index;
    const y = baseline - ((val - minValue) / (maxValue - minValue)) * chartHeight;
    return { val, x, y };
  });

  const circleRadius = selectedDays === 30 ? 1.5 : selectedDays === 14 ? 2.5 : 4;

  const gridValues = [maxValue, Math.round(maxValue * 0.75), Math.round(maxValue * 0.5), Math.round(maxValue * 0.25), 0];

  const sheetItems = [
    {
      key: "7",
      label: "Last 7 Days",
      onPress: () => setSelectedDays(7),
    },
    {
      key: "14",
      label: "Last 14 Days",
      onPress: () => setSelectedDays(14),
    },
    {
      key: "30",
      label: "Last 30 Days",
      onPress: () => setSelectedDays(30),
    },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance Overview</Text>
        
        <AnimatedPressable style={styles.timeDropdown} onPress={() => setSheetVisible(true)}>
          <Text style={styles.periodText}>Last {selectedDays} Days</Text>
          <Ionicons name="chevron-down" size={12} color="#00B3A6" style={styles.dropdownIcon} />
        </AnimatedPressable>
      </View>

      <View style={styles.chartContainer}>
        {/* Y Axis Labels (Left) */}
        <View style={styles.yAxisLabels}>
          {gridValues.map((val) => (
            <Text key={val} style={styles.yAxisText}>
              {val}
            </Text>
          ))}
        </View>

        {/* SVG Drawing Canvas */}
        <View style={styles.canvasContainer}>
          <Svg style={styles.svg}>
            <Defs>
              <LinearGradient id="chart-area-grad-album" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#00B3A6" stopOpacity={0.25} />
                <Stop offset="100%" stopColor="#00B3A6" stopOpacity={0.0} />
              </LinearGradient>
            </Defs>

            {/* Grid lines */}
            {gridValues.map((val) => {
              const y = baseline - ((val - minValue) / (maxValue - minValue)) * chartHeight;
              return (
                <Line
                  key={val}
                  x1={0}
                  x2={chartWidth}
                  y1={y}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeDasharray="3 5"
                  strokeWidth={1}
                />
              );
            })}

            {/* Area under the curve */}
            <Path d={`M 0 ${baseline} L ${coordinates.map(p => `${(p.x - paddingLeft).toFixed(1)},${p.y.toFixed(1)}`).join(" ")} L ${chartWidth} ${baseline} Z`} fill="url(#chart-area-grad-album)" />

            {/* Line curve */}
            <Polyline
              points={coordinates.map(p => `${(p.x - paddingLeft).toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
              fill="none"
              stroke="#00B3A6"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Solid teal circular dots at data vertices */}
            {coordinates.map((pt, idx) => (
              <Circle
                key={idx}
                cx={pt.x - paddingLeft}
                cy={pt.y}
                r={circleRadius}
                fill="#00B3A6"
              />
            ))}
          </Svg>
        </View>
      </View>

      {/* X Axis Labels */}
      <View style={styles.xAxisLabels}>
        {dates.map((date, idx) => (
          <Text
            key={date}
            style={[
              styles.xAxisText,
              idx === 0 && { textAlign: "left" },
              idx === dates.length - 1 && { textAlign: "right" },
            ]}
          >
            {date}
          </Text>
        ))}
      </View>

      <BottomActionSheet
        visible={sheetVisible}
        title="Select Time Period"
        items={sheetItems}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  timeDropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  periodText: {
    color: "#00B3A6",
    fontSize: 11,
    fontWeight: "600",
  },
  dropdownIcon: {
    marginLeft: 4,
  },
  chartContainer: {
    flexDirection: "row",
    height: 120,
    gap: 8,
  },
  yAxisLabels: {
    width: 24,
    justifyContent: "space-between",
    paddingVertical: 1,
    alignItems: "flex-end",
  },
  yAxisText: {
    color: tokens.colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
  },
  canvasContainer: {
    flex: 1,
    height: "100%",
  },
  svg: {
    width: "100%",
    height: "100%",
  },
  xAxisLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 32, // Align with chart area offset
  },
  xAxisText: {
    color: tokens.colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    width: 60,
    textAlign: "center",
  },
});
