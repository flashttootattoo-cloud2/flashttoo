"use client";

interface Series {
  date: string;
  artists: number;
  clients: number;
}

interface Props {
  data: Series[];
}

export function GrowthChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-zinc-600 text-sm">
        Sin datos todavía.
      </div>
    );
  }

  const W = 600;
  const H = 160;
  const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => Math.max(d.artists, d.clients)), 1);
  const step = innerW / Math.max(data.length - 1, 1);

  const toSvg = (val: number, i: number) => ({
    x: PAD.left + i * step,
    y: PAD.top + innerH - (val / maxVal) * innerH,
  });

  const makePath = (getValue: (d: Series) => number) =>
    data.reduce((acc, d, i) => {
      const { x, y } = toSvg(getValue(d), i);
      if (i === 0) return `M ${x},${y}`;
      const prev = toSvg(getValue(data[i - 1]), i - 1);
      const cpx = (prev.x + x) / 2;
      return `${acc} C ${cpx},${prev.y} ${cpx},${y} ${x},${y}`;
    }, "");

  const artistsPath = makePath((d) => d.artists);
  const clientsPath = makePath((d) => d.clients);

  const yLabels = [
    { val: maxVal, y: PAD.top },
    { val: Math.round(maxVal / 2), y: PAD.top + innerH / 2 },
    { val: 0, y: PAD.top + innerH },
  ];

  const xLabels = data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1);

  return (
    <div className="w-full overflow-x-auto">
      {/* Legend */}
      <div className="flex items-center gap-5 mb-3 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-amber-400 inline-block rounded" />
          Tatuadores
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-blue-400 inline-block rounded" />
          Clientes
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: "280px" }}>
        <defs>
          <linearGradient id="artistsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0ff42" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#f0ff42" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="clientsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map(({ y }) => (
          <line key={y} x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#27272a" strokeWidth="1" />
        ))}

        {/* Area fills */}
        <path
          d={`${artistsPath} L ${PAD.left + (data.length - 1) * step},${PAD.top + innerH} L ${PAD.left},${PAD.top + innerH} Z`}
          fill="url(#artistsGrad)"
        />
        <path
          d={`${clientsPath} L ${PAD.left + (data.length - 1) * step},${PAD.top + innerH} L ${PAD.left},${PAD.top + innerH} Z`}
          fill="url(#clientsGrad)"
        />

        {/* Lines */}
        <path d={artistsPath} fill="none" stroke="#f0ff42" strokeWidth="2" strokeLinecap="round" />
        <path d={clientsPath} fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />

        {/* Dots */}
        {data.map((d, i) => {
          const a = toSvg(d.artists, i);
          const c = toSvg(d.clients, i);
          return (
            <g key={d.date}>
              <circle cx={a.x} cy={a.y} r="2.5" fill="#f0ff42" />
              <circle cx={c.x} cy={c.y} r="2.5" fill="#60a5fa" />
            </g>
          );
        })}

        {/* Y-axis labels */}
        {yLabels.map(({ val, y }) => (
          <text key={y} x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#71717a">
            {val}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabels.map((d, i) => {
          const { x } = toSvg(0, data.indexOf(d));
          return (
            <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize="10" fill="#71717a">
              {d.date.slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
