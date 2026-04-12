"use client";

interface Props {
  data: { date: string; views: number }[]; // date = "YYYY-MM-DD"
}

export function ViewsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-zinc-600 text-sm">
        Todavía no hay datos de visitas.
      </div>
    );
  }

  const W = 600;
  const H = 140;
  const PAD = { top: 16, right: 16, bottom: 28, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => d.views), 1);
  const step = innerW / Math.max(data.length - 1, 1);

  // Map to SVG coordinates
  const pts = data.map((d, i) => ({
    x: PAD.left + i * step,
    y: PAD.top + innerH - (d.views / maxVal) * innerH,
    views: d.views,
    date: d.date,
  }));

  // Smooth cubic bezier path
  const linePath = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = pts[i - 1];
    const cpx = (prev.x + pt.x) / 2;
    return `${acc} C ${cpx},${prev.y} ${cpx},${pt.y} ${pt.x},${pt.y}`;
  }, "");

  // Area fill — close path along bottom
  const areaPath = `${linePath} L ${pts[pts.length - 1].x},${PAD.top + innerH} L ${PAD.left},${PAD.top + innerH} Z`;

  // Y-axis labels (0, mid, max)
  const yLabels = [
    { val: maxVal, y: PAD.top },
    { val: Math.round(maxVal / 2), y: PAD.top + innerH / 2 },
    { val: 0, y: PAD.top + innerH },
  ];

  // X-axis: show every ~5 days
  const xLabels = pts.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: "280px" }}
        aria-label="Gráfico de visitas por día"
      >
        <defs>
          <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0ff42" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f0ff42" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map(({ y }) => (
          <line
            key={y}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y}
            y2={y}
            stroke="#27272a"
            strokeWidth="1"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#viewsGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#f0ff42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots on data points */}
        {pts.map((pt) => (
          <circle key={pt.date} cx={pt.x} cy={pt.y} r="3" fill="#f0ff42" />
        ))}

        {/* Y-axis labels */}
        {yLabels.map(({ val, y }) => (
          <text
            key={y}
            x={PAD.left - 6}
            y={y + 4}
            textAnchor="end"
            fontSize="10"
            fill="#71717a"
          >
            {val}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabels.map((pt) => (
          <text
            key={pt.date}
            x={pt.x}
            y={H - 4}
            textAnchor="middle"
            fontSize="10"
            fill="#71717a"
          >
            {pt.date.slice(5)} {/* MM-DD */}
          </text>
        ))}
      </svg>
    </div>
  );
}
