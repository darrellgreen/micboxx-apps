import React, { useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Polyline, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable } from "@micboxx/ui";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";

interface PerformanceOverviewChartProps {
  trackId: number;
}

const CARD_BG = "#131820";

export function PerformanceOverviewChart({ trackId }: PerformanceOverviewChartProps) {
  const { analytics } = useCreatorBootstrap();
  const topTracks = analytics?.catalogPerformance?.topTracks ?? [];
  const trackPerf = topTracks.find((t) => t.trackId === trackId);
  const totalTrackPlays = trackPerf?.plays ?? 16;

  const [canvasWidth, setCanvasWidth] = useState(294);

  // Generate simulated historical coordinate points based on actual plays data
  const basePercentages = [0.10, 0.15, 0.25, 0.18, 0.12, 0.16, 0.22];
  const chartValues = basePercentages.map(p => Math.round(totalTrackPlays * p));
  
  const maxSeriesValue = Math.max(...chartValues, 4);
  const maxValue = Math.ceil(maxSeriesValue / 4) * 4; // round up to multiple of 4
  const minValue = 0;

  // Generate 4 dynamic date labels ending at the previous day (yesterday)
  const dates = [7, 5, 3, 1].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const height = 160;
  const paddingTop = 15;
  const paddingBottom = 20;
  
  const baseline = height - paddingBottom;
  const chartHeight = baseline - paddingTop;
  
  const chartWidth = canvasWidth;
  const stepX = chartWidth / (chartValues.length - 1);
  
  const coordinates = chartValues.map((val, index) => {
    const x = stepX * index;
    const y = baseline - ((val - minValue) / (maxValue - minValue)) * chartHeight;
    return { val, x, y };
  });

  // Draw grid lines at Y: max, 2/3, 1/3, 0
  const gridValues = [maxValue, Math.round(maxValue * 2 / 3), Math.round(maxValue / 3), 0];

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width: layoutWidth } = event.nativeEvent.layout;
    if (layoutWidth > 0 && layoutWidth !== canvasWidth) {
      setCanvasWidth(layoutWidth);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance Overview</Text>
        
        <AnimatedPressable style={styles.timeDropdown} onPress={() => {}}>
          <Text style={styles.periodText}>Last 7 Days</Text>
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
        <View style={styles.canvasContainer} onLayout={handleLayout}>
          <Svg style={styles.svg}>
            <Defs>
              <LinearGradient id="chart-area-grad-root" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#00B3A6" stopOpacity={0.2} />
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
            <Path d={`M 0 ${baseline} L ${coordinates.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} L ${chartWidth} ${baseline} Z`} fill="url(#chart-area-grad-root)" />

            {/* Line curve */}
            <Polyline
              points={coordinates.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
              fill="none"
              stroke="#00B3A6"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Solid teal circular dots */}
            {coordinates.map((pt, idx) => (
              <Circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={4}
                fill="#00B3A6"
              />
            ))}
          </Svg>
        </View>
      </View>

      {/* X Axis Labels */}
      <View style={[styles.xAxisLabels, { marginLeft: 28 }]}>
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
    width: 20,
    justifyContent: "space-between",
    paddingVertical: 1, // Align with grid lines
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
  },
  xAxisText: {
    color: tokens.colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    width: 60,
    textAlign: "center",
  },
});
