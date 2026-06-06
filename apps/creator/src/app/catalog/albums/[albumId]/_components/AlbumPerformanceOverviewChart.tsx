import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Polyline, Stop, ClipPath, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable, BottomActionSheet, ShimmerPlaceholder } from "@micboxx/ui";
import { useLocalSearchParams } from "expo-router";
import { getAlbumPlays, type PlayTimeseriesData } from "@/shared/api/creator-dashboard";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  ReduceMotion,
  Easing,
  type SharedValue,
} from "react-native-reanimated";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

interface AnimatedDotProps {
  cx: number;
  cy: number;
  circleRadius: number;
  index: number;
  totalPoints: number;
  chartProgress: SharedValue<number>;
}

function AnimatedDot({ cx, cy, circleRadius, index, totalPoints, chartProgress }: AnimatedDotProps) {
  const animatedProps = useAnimatedProps(() => {
    const startThreshold = (index / totalPoints) * 0.7;
    const rawProgress = (chartProgress.value - startThreshold) / 0.15;
    const progress = Math.max(0, Math.min(1, rawProgress));
    
    let scale = progress;
    if (index === totalPoints - 1 && chartProgress.value > 0.95) {
      const pulseFactor = Math.sin((chartProgress.value - 0.95) * Math.PI * 20) * 0.15;
      scale = progress + Math.max(0, pulseFactor);
    }

    return {
      r: circleRadius * scale,
      opacity: progress,
    };
  });

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      fill="#00B3A6"
      animatedProps={animatedProps}
    />
  );
}

const CARD_BG = "#131820";

export function AlbumPerformanceOverviewChart() {
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  const id = albumId ? parseInt(albumId, 10) : Number.NaN;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlayTimeseriesData | null>(null);

  const [selectedDays, setSelectedDays] = useState<7 | 14 | 30>(7);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Reanimated Shared Values
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(8);
  const chartProgress = useSharedValue(0);

  // Mount Animation for the whole card
  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    cardTranslateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) });
  }, []);

  // Fetch album plays dynamically
  useEffect(() => {
    let active = true;
    
    async function fetchData() {
      if (!Number.isFinite(id)) {
        setData(null);
        setError("Album analytics are not available for this release yet.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      chartProgress.value = 0;
      
      try {
        const payload = await getAlbumPlays(id, selectedDays);
        if (active) {
          setData(payload);
          chartProgress.value = withTiming(1, {
            duration: 850,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            reduceMotion: ReduceMotion.System,
          });
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load plays.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      active = false;
    };
  }, [id, selectedDays]);

  // Card container animated style
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const series = data?.series ?? [];
  const validSeries = series.filter((pt) => pt.plays !== null && pt.plays !== undefined);
  const totalPlays = data?.totalPlays ?? 0;
  const chartValues = validSeries.map((pt) => Number(pt.plays));

  const maxSeriesValue = Math.max(...chartValues, 40);
  const maxValue = Math.ceil(maxSeriesValue / 40) * 40; // round up to multiple of 40 for clean grid ticks
  const minValue = 0;

  // Generate dynamic date labels aligned exactly with graph boundaries
  const dateOffsets = selectedDays === 14
    ? [13, 9, 4, 0]
    : selectedDays === 30
      ? [29, 20, 10, 0]
      : [6, 4, 2, 0];

  const dates = dateOffsets.map((offset) => {
    const index = selectedDays - 1 - offset;
    return validSeries[index]?.label ?? "";
  });

  const width = 340;
  const height = 120;
  const paddingLeft = 32; // space for Y-axis labels
  const paddingRight = 16;
  const paddingTop = 10;
  const paddingBottom = 10;
  
  const baseline = height - paddingBottom; // 110
  const chartHeight = baseline - paddingTop; // 100
  const chartWidth = width - paddingLeft - paddingRight;

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

  const animatedRectProps = useAnimatedProps(() => ({
    width: chartWidth * chartProgress.value,
  }));

  const animatedGridProps = useAnimatedProps(() => ({
    opacity: chartProgress.value,
  }));

  const renderContent = () => {
    if (loading) {
      return (
        <View style={{ height: 120, justifyContent: "center", alignItems: "center" }}>
          <ShimmerPlaceholder width="100%" height={100} borderRadius={8} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={{ height: 120, justifyContent: "center", alignItems: "center", gap: 8 }}>
          <Ionicons name="alert-circle-outline" size={36} color={tokens.colors.danger} />
          <Text style={{ color: tokens.colors.textSecondary, fontSize: 13, fontWeight: "500", textAlign: "center", paddingHorizontal: 16 }}>
            {error}
          </Text>
        </View>
      );
    }

    if (totalPlays === 0 || series.length === 0) {
      return (
        <View style={{ height: 120, justifyContent: "center", alignItems: "center", gap: 8 }}>
          <Ionicons name="bar-chart-outline" size={36} color={tokens.colors.textMuted} />
          <Text style={{ color: tokens.colors.textSecondary, fontSize: 13, fontWeight: "500" }}>
            No plays recorded for this period
          </Text>
        </View>
      );
    }

    return (
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
              <ClipPath id="album-chart-clip">
                <AnimatedRect
                  x={0}
                  y={0}
                  width={0}
                  height={height}
                  animatedProps={animatedRectProps}
                />
              </ClipPath>
            </Defs>

            {/* Grid lines */}
            {gridValues.map((val) => {
              const y = baseline - ((val - minValue) / (maxValue - minValue)) * chartHeight;
              return (
                <AnimatedLine
                  key={val}
                  x1={0}
                  x2={chartWidth}
                  y1={y}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeDasharray="3 5"
                  strokeWidth={1}
                  animatedProps={animatedGridProps}
                />
              );
            })}

            {/* Area under the curve */}
            <Path
              d={`M 0 ${baseline} L ${coordinates.map(p => `${(p.x - paddingLeft).toFixed(1)},${p.y.toFixed(1)}`).join(" ")} L ${chartWidth} ${baseline} Z`}
              fill="url(#chart-area-grad-album)"
              clipPath="url(#album-chart-clip)"
            />

            {/* Line curve */}
            <Polyline
              points={coordinates.map(p => `${(p.x - paddingLeft).toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
              fill="none"
              stroke="#00B3A6"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath="url(#album-chart-clip)"
            />

            {/* Solid teal circular dots at data vertices */}
            {coordinates.map((pt, idx) => (
              <AnimatedDot
                key={idx}
                cx={pt.x - paddingLeft}
                cy={pt.y}
                circleRadius={circleRadius}
                index={idx}
                totalPoints={coordinates.length}
                chartProgress={chartProgress}
              />
            ))}
          </Svg>
        </View>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.card, cardAnimatedStyle]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Performance Overview</Text>
          <Text style={styles.subtitle}>Plays over time</Text>
        </View>
        
        <AnimatedPressable style={styles.timeDropdown} onPress={() => setSheetVisible(true)}>
          <Text style={styles.periodText}>Last {selectedDays} Days</Text>
          <Ionicons name="chevron-down" size={12} color="#00B3A6" style={styles.dropdownIcon} />
        </AnimatedPressable>
      </View>

      {renderContent()}

      {/* X Axis Labels */}
      {!loading && !error && totalPlays > 0 && series.length > 0 && (
        <View style={styles.xAxisLabels}>
          {dates.map((date, idx) => (
            <Text
              key={idx}
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
      )}

      {/* Bottom Summary Footer */}
      {!loading && !error && data && data.totalPlays > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {totalPlays.toLocaleString()} plays this period
          </Text>
        </View>
      )}

      <BottomActionSheet
        visible={sheetVisible}
        title="Select Time Period"
        items={sheetItems}
        onClose={() => setSheetVisible(false)}
      />
    </Animated.View>
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
    paddingTop: 10,
    paddingBottom: 10,
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
  titleContainer: {
    gap: 2,
  },
  subtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  footerText: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
});
