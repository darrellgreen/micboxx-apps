import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Polyline, Stop } from "react-native-svg";
import { tokens } from "@micboxx/theme";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";

interface PerformanceOverviewChartProps {
  trackId: number;
}

type ChartPoint = { label: string; plays: number };

const CARD_BG = "#131820";

export function PerformanceOverviewChart({ trackId }: PerformanceOverviewChartProps) {
  const { analytics } = useCreatorBootstrap();
  
  // Read playsOverTime or fall back to default weekly mock data
  const rawPoints = analytics?.hero?.playsOverTime;
  const points: ChartPoint[] = rawPoints && rawPoints.length > 0 
    ? rawPoints.map(p => ({ label: p.label, plays: p.plays }))
    : [
        { label: "Mon", plays: 120 },
        { label: "Tue", plays: 180 },
        { label: "Wed", plays: 150 },
        { label: "Thu", plays: 220 },
        { label: "Fri", plays: 190 },
        { label: "Sat", plays: 280 },
        { label: "Sun", plays: 240 },
      ];

  const width = 340;
  const height = 180;
  const paddingX = 24;
  const paddingTop = 20;
  const paddingBottom = 24;
  const baseline = height - paddingBottom;
  const chartHeight = baseline - paddingTop;
  
  const playsValues = points.map((p) => p.plays);
  const maxValue = Math.max(1, ...playsValues);
  const minValue = Math.min(...playsValues, 0);
  const valRange = maxValue - minValue;

  const stepX = points.length > 1 ? (width - paddingX * 2) / (points.length - 1) : 0;
  
  const coordinates = points.map((point, index) => {
    const x = paddingX + stepX * index;
    const y = baseline - ((point.plays - minValue) / valRange) * chartHeight;
    return { ...point, x, y };
  });

  const polylinePoints = coordinates.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const areaPath = `M ${paddingX} ${baseline} L ${polylinePoints} L ${width - paddingX} ${baseline} Z`;
  
  const highlight = coordinates.reduce(
    (best, point) => (point.plays >= best.plays ? point : best),
    coordinates[0] ?? { label: "", plays: 0, x: paddingX, y: baseline }
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Performance Trend</Text>
          <Text style={styles.subtitle}>Plays over time</Text>
        </View>
        <View style={styles.periodBadge}>
          <Text style={styles.periodBadgeText}>LAST 7 DAYS</Text>
        </View>
      </View>

      <View style={styles.chartWrap}>
        <Svg viewBox={`0 0 ${width} ${height}`} style={styles.chartSvg}>
          <Defs>
            <LinearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={tokens.colors.accent} stopOpacity={0.18} />
              <Stop offset="100%" stopColor={tokens.colors.accent} stopOpacity={0.0} />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = paddingTop + chartHeight * fraction;
            return (
              <Line
                key={fraction}
                x1={paddingX}
                x2={width - paddingX}
                y1={y}
                y2={y}
                stroke={tokens.colors.gridSoft}
                strokeDasharray="2 4"
                strokeWidth={1}
              />
            );
          })}

          {/* Area under the line */}
          <Path d={areaPath} fill="url(#chart-area)" />

          {/* Line path */}
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={tokens.colors.accent}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Peak point highlights */}
          <Circle cx={highlight.x} cy={highlight.y} r={6} fill="rgba(0,179,166,0.3)" />
          <Circle cx={highlight.x} cy={highlight.y} r={3} fill={tokens.colors.accent} />
        </Svg>
      </View>

      {/* X Axis Labels */}
      <View style={styles.axisLabels}>
        {points.map((pt, idx) => {
          // Render first, middle, last labels to prevent overlapping
          const shouldShow = idx === 0 || idx === Math.floor(points.length / 2) || idx === points.length - 1;
          return (
            <Text
              key={pt.label}
              style={[
                styles.axisLabelText,
                idx === 0 && { textAlign: "left" },
                idx === points.length - 1 && { textAlign: "right" },
                !shouldShow && { opacity: 0 },
              ]}
            >
              {pt.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: tokens.radiusSystem.container,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.typography.base,
    fontWeight: tokens.typography.bold,
  },
  subtitle: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.xs,
  },
  periodBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radiusSystem.pill,
  },
  periodBadgeText: {
    color: tokens.colors.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  chartWrap: {
    height: 140,
    overflow: "hidden",
  },
  chartSvg: {
    width: "100%",
    height: "100%",
  },
  axisLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  axisLabelText: {
    color: tokens.colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    width: 60,
    textAlign: "center",
  },
});
