import { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import {
  daysBetween,
  daysToTarget,
  isoDate,
  parseDate,
  plannedWeightAt,
} from '../storage/weight';
import { spacing, useTheme, useThemedStyles } from '../theme';
import type { WeightEntry, WeightSettings } from '../types';

interface Props {
  settings: WeightSettings;
  entries: ReadonlyArray<WeightEntry>;
  /** Chart width in px. */
  width: number;
  /** Chart height in px. */
  height: number;
}

// Padding around the plot area.
const PAD_LEFT = 42;
const PAD_RIGHT = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;

export function WeightChart({ settings, entries, width, height }: Props) {
  const styles = useThemedStyles((c) =>
    StyleSheet.create({
      wrap: {
        backgroundColor: c.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.border,
        padding: 4,
      },
      empty: { color: c.textMuted, fontSize: 12, padding: spacing.md },
    })
  );
  const { colors } = useTheme();

  const layout = useMemo(() => {
    const yMin =
      settings.minWeight ??
      Math.min(settings.targetWeight - 0.5, settings.startWeight - 0.5);
    const yMax =
      settings.maxWeight ??
      Math.max(settings.startWeight + 0.5, settings.targetWeight + 0.5);
    const yRange = yMax - yMin;

    // Number of days planned + a buffer.
    const plannedDays = Math.max(1, daysToTarget(settings));
    const today = isoDate(Date.now());
    const daysSinceStart = daysBetween(settings.startDate, today);
    const totalDays = Math.max(plannedDays, daysSinceStart) + 2;

    const plotW = width - PAD_LEFT - PAD_RIGHT;
    const plotH = height - PAD_TOP - PAD_BOTTOM;

    const xForDay = (day: number) =>
      PAD_LEFT + (day / Math.max(1, totalDays)) * plotW;
    const yForWeight = (w: number) =>
      PAD_TOP + ((yMax - w) / Math.max(0.001, yRange)) * plotH;

    // Grid lines (every 0.5 kg).
    const gridLines: number[] = [];
    const step = 0.5;
    const start = Math.ceil(yMin / step) * step;
    for (let w = start; w <= yMax + 0.0001; w += step) {
      gridLines.push(Math.round(w * 10) / 10);
    }

    // Planned dots — every day.
    const plannedDots = Array.from({ length: totalDays + 1 }, (_, i) => ({
      x: xForDay(i),
      y: yForWeight(plannedWeightAt(settings, i)),
      day: i,
    }));

    // Actual entries — align to day index from startDate.
    const actualPoints = entries
      .map((e) => ({
        x: xForDay(Math.max(0, daysBetween(settings.startDate, e.date))),
        y: yForWeight(e.weight),
        date: e.date,
        weight: e.weight,
      }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

    // X-axis labels — show every ~7 days.
    const labelStep = Math.max(1, Math.ceil(totalDays / 7));
    const xLabels: { x: number; label: string }[] = [];
    for (let i = 0; i <= totalDays; i += labelStep) {
      const dateMs =
        parseDate(settings.startDate).getTime() + i * 24 * 3600 * 1000;
      const d = new Date(dateMs);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      xLabels.push({ x: xForDay(i), label: `${dd}/${mm}` });
    }

    // Today marker.
    const todayX = xForDay(Math.max(0, daysSinceStart));

    return {
      yMin,
      yMax,
      gridLines,
      plannedDots,
      actualPoints,
      xLabels,
      todayX,
      xForDay,
      yForWeight,
      totalDays,
    };
  }, [settings, entries, width, height]);

  if (!Number.isFinite(width) || width <= 0) {
    return null;
  }

  const polylinePoints = layout.actualPoints
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {layout.gridLines.map((w) => (
          <Line
            key={`h${w}`}
            x1={PAD_LEFT}
            y1={layout.yForWeight(w)}
            x2={width - PAD_RIGHT}
            y2={layout.yForWeight(w)}
            stroke={colors.border}
            strokeDasharray="2,3"
            strokeWidth={0.6}
          />
        ))}
        {/* Y-axis labels */}
        {layout.gridLines.map((w) => (
          <SvgText
            key={`ylbl${w}`}
            x={4}
            y={layout.yForWeight(w) + 4}
            fontSize={9}
            fill={colors.textMuted}
          >
            {w.toFixed(1)}
          </SvgText>
        ))}

        {/* Today vertical marker */}
        <Line
          x1={layout.todayX}
          y1={PAD_TOP}
          x2={layout.todayX}
          y2={height - PAD_BOTTOM}
          stroke={colors.accent}
          strokeDasharray="3,3"
          strokeWidth={1}
          opacity={0.6}
        />

        {/* Planned dots (hollow circles) */}
        {layout.plannedDots.map((p) => (
          <Circle
            key={`plan${p.day}`}
            cx={p.x}
            cy={p.y}
            r={2.5}
            stroke={colors.textMuted}
            strokeWidth={1}
            fill="none"
          />
        ))}

        {/* Actual line + filled circles */}
        {layout.actualPoints.length > 1 && (
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2}
          />
        )}
        {layout.actualPoints.map((p) => (
          <Circle
            key={`act${p.date}`}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill={colors.accent}
          />
        ))}

        {/* X-axis labels */}
        {layout.xLabels.map((lbl, i) => (
          <SvgText
            key={`xlbl${i}`}
            x={lbl.x}
            y={height - 8}
            fontSize={9}
            fill={colors.textMuted}
            textAnchor="middle"
          >
            {lbl.label}
          </SvgText>
        ))}

        {/* Frame */}
        <Rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={width - PAD_LEFT - PAD_RIGHT}
          height={height - PAD_TOP - PAD_BOTTOM}
          stroke={colors.border}
          strokeWidth={1}
          fill="none"
        />
      </Svg>
    </View>
  );
}

