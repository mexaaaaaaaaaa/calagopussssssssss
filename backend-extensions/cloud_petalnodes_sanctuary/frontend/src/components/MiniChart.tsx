import React from 'react';
import { EmptyState } from './FeedbackStates';

export interface ChartSeriesPoint {
  label: string;
  value: number;
}

export interface MiniAreaChartProps {
  title?: string;
  series: readonly {
    name: string;
    color: string;
    points: readonly ChartSeriesPoint[];
  }[];
  unit?: string;
  maxValue?: number;
}

export function MiniAreaChart({
  series,
  unit = '%',
  maxValue = 100,
}: MiniAreaChartProps) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  const primarySeries = series[0];
  const pointCount = primarySeries?.points.length ?? 0;

  if (!primarySeries || pointCount < 2) {
    return (
      <EmptyState
        title="No telemetry points yet"
        description="Metrics will appear once panel resource sampling completes."
      />
    );
  }

  const width = 560;
  const height = 180;
  const padX = 28;
  const padTop = 16;
  const padBottom = 28;
  const plotW = width - padX * 2;
  const plotH = height - padTop - padBottom;

  const getX = (idx: number) => padX + (idx / Math.max(1, pointCount - 1)) * plotW;
  const getY = (val: number) =>
    padTop + plotH - (Math.min(maxValue, Math.max(0, val)) / maxValue) * plotH;

  const activeIndex = hoveredIdx ?? pointCount - 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <div className="flex flex-wrap items-center gap-4">
          {series.map((s) => (
            <div key={s.name} className="inline-flex items-center gap-1.5 text-[var(--calagopus-text)]">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              <span className="font-medium">{s.name}</span>
            </div>
          ))}
        </div>

        <div className="font-mono text-[var(--calagopus-text-secondary)] tabular-nums">
          <span>{primarySeries.points[activeIndex]?.label}</span>
          {series.map((s) => (
            <span key={s.name} className="ml-3 text-[var(--calagopus-text)]">
              {s.name}: {s.points[activeIndex]?.value ?? 0}
              {unit}
            </span>
          ))}
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[180px] w-full select-none"
          role="img"
          aria-label="Resource utilization trend chart"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = getY((tick / 100) * maxValue);
            return (
              <g key={tick}>
                <line
                  x1={padX}
                  x2={width - padX}
                  y1={y}
                  y2={y}
                  stroke="var(--chart-grid-color)"
                  strokeWidth="1"
                />
                <text
                  x={padX - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--chart-tick-color)"
                  className="font-mono"
                >
                  {Math.round((tick / 100) * maxValue)}
                </text>
              </g>
            );
          })}

          {series.map((s) => {
            const linePoints = s.points
              .map((pt, idx) => `${getX(idx)},${getY(pt.value)}`)
              .join(' ');
            const areaPoints = `${padX},${padTop + plotH} ${linePoints} ${
              padX + plotW
            },${padTop + plotH}`;

            return (
              <g key={s.name}>
                <polygon points={areaPoints} fill={s.color} fillOpacity={0.14} />
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={linePoints}
                />
              </g>
            );
          })}

          {primarySeries.points.map((pt, idx) => {
            const cx = getX(idx);
            const isHovered = activeIndex === idx;
            return (
              <g key={pt.label}>
                {isHovered ? (
                  <line
                    x1={cx}
                    x2={cx}
                    y1={padTop}
                    y2={padTop + plotH}
                    stroke="var(--calagopus-primary-border)"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                ) : null}

                {series.map((s) => (
                  <circle
                    key={`${s.name}-${pt.label}`}
                    cx={cx}
                    cy={getY(s.points[idx]?.value ?? 0)}
                    r={isHovered ? 4 : 2.5}
                    fill={s.color}
                    stroke="var(--calagopus-surface)"
                    strokeWidth="1.5"
                  />
                ))}

                <text
                  x={cx}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--chart-tick-color)"
                  className="font-mono"
                >
                  {pt.label}
                </text>

                <rect
                  x={cx - plotW / (pointCount * 2)}
                  y={padTop}
                  width={plotW / pointCount}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${pt.label}: ${series
                    .map((s) => `${s.name} ${s.points[idx]?.value ?? 0}${unit}`)
                    .join(', ')}`}
                  className="blush-focus-ring cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onFocus={() => setHoveredIdx(idx)}
                  onBlur={() => setHoveredIdx(null)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export interface MiniSparklineProps {
  values: readonly number[];
  color?: string;
}

export function MiniSparkline({ values, color = '#EA8CAE' }: MiniSparklineProps) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  const w = 64;
  const h = 20;

  const points = values
    .map((val, idx) => {
      const x = (idx / (values.length - 1)) * w;
      const y = h - 2 - ((val - min) / span) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-5 w-14 shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
