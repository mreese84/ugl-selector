import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { OPEN_METEO_URL, describeWeather, useForecast, type HourForecast } from '../../weather';
import { clockHours } from './dates';

const ROUND_HOURS = 4.5; // first tee time until the last group finishes, roughly

// Chart geometry (px)
const TOP = 16; // room for the "Round" label
const CHANCE_H = 84;
const GAP = 10;
const AMOUNT_H = 30;
const AXIS_H = 18;
const GUTTER = 34; // right-hand axis labels

interface Span {
  start: number; // hours after midnight
  end: number;
}

const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;
const hourName = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
const inches = (n: number) => `${n.toFixed(2)} in`;

// A bar with a rounded top, square at the baseline
function barPath(x: number, w: number, base: number, h: number) {
  const r = Math.min(4, w / 2, h);
  const top = base - h;
  return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

interface RainChartProps {
  hours: HourForecast[];
  round: Span | null;
  active: number | null; // the hour being read (pointer, finger or arrow keys)
  onActive: (hour: number | null) => void;
}

// Chance of rain (line) over expected rain per hour (bars), on one shared hour axis.
// Two panels rather than two y-axes, since percent and inches don't share a scale.
function RainChart({ hours, round, active, onActive }: RainChartProps) {
  const { ref, width } = useWidth();

  const from = Math.max(0, Math.min(7, round ? Math.floor(round.start) - 1 : 7));
  const to = Math.min(23, Math.max(19, round ? Math.ceil(round.end) + 1 : 19));
  const shown = hours.filter((h) => h.hour >= from && h.hour <= to);
  const maxAmount = Math.max(0, ...shown.map((h) => h.amount));
  const hasRain = maxAmount >= 0.01;

  const plotW = Math.max(0, width - GUTTER);
  const x = (hour: number) => ((hour - from) / (to - from)) * plotW;
  const y = (chance: number) => TOP + CHANCE_H * (1 - chance / 100);
  const chanceBase = y(0);
  const amountBase = chanceBase + GAP + AMOUNT_H;
  const panelsBottom = hasRain ? amountBase : chanceBase;
  const height = panelsBottom + AXIS_H;

  const scale = Math.max(maxAmount, 0.1); // a trace of rain shouldn't fill the strip
  const barMax = AMOUNT_H - 12; // leaves room for the wettest hour's label
  const barW = Math.min(24, (plotW / (to - from)) * 0.55);
  const wettest = hasRain ? shown.reduce((a, b) => (b.amount > a.amount ? b : a)) : null;

  const line = shown.map((h, i) => `${i ? 'L' : 'M'}${x(h.hour)},${y(h.chance)}`).join(' ');
  const area = shown.length ? `${line} L${x(shown.at(-1)!.hour)},${chanceBase} L${x(shown[0].hour)},${chanceBase} Z` : '';
  const ticks = Array.from({ length: Math.floor((to - Math.ceil(from / 2) * 2) / 2) + 1 }, (_, i) => Math.ceil(from / 2) * 2 + i * 2);

  // Snap to the closest hour
  const nearest = (px: number) => {
    const hour = from + (px / plotW) * (to - from);
    return shown.reduce((a, b) => (Math.abs(b.hour - hour) < Math.abs(a.hour - hour) ? b : a)).hour;
  };
  const onPointer = (e: PointerEvent<SVGRectElement>) =>
    shown.length && onActive(nearest(e.clientX - e.currentTarget.getBoundingClientRect().left));
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || !shown.length) return;
    e.preventDefault();
    const step = e.key === 'ArrowLeft' ? -1 : 1;
    const i = shown.findIndex((h) => h.hour === active);
    const next = i < 0 ? (step > 0 ? 0 : shown.length - 1) : Math.max(0, Math.min(shown.length - 1, i + step));
    onActive(shown[next].hour);
  };

  const hover = shown.find((h) => h.hour === active);

  return (
    <div
      ref={ref}
      className="relative mt-3 outline-none focus-visible:ring-2 focus-visible:ring-(--guide)/30 rounded-lg"
      tabIndex={0}
      role="group"
      aria-label="Hourly chance of rain and expected rainfall. Use the arrow keys to step through the hours."
      onKeyDown={onKey}
      onBlur={() => onActive(null)}
    >
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" aria-hidden="true">
          {/* Your round */}
          {round && (
            <g>
              <rect
                x={x(Math.max(from, round.start))}
                y={0}
                width={Math.max(0, x(Math.min(to, round.end)) - x(Math.max(from, round.start)))}
                height={panelsBottom}
                className="fill-(--guide)/7"
                rx={4}
              />
              <text x={x(Math.max(from, round.start)) + 5} y={11} className="fill-gray-500 text-[10px] font-semibold">
                Round
              </text>
            </g>
          )}

          {/* Chance of rain */}
          {[0, 50, 100].map((c) => (
            <g key={c}>
              <line x1={0} x2={plotW} y1={y(c)} y2={y(c)} className="stroke-gray-200" strokeWidth={1} />
              <text x={width} y={y(c) + 3.5} textAnchor="end" className="fill-gray-400 text-[10px]">
                {c}%
              </text>
            </g>
          ))}
          <path d={area} className="fill-(--guide)/10" />
          <path d={line} fill="none" className="stroke-(--guide)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* Expected rain per hour */}
          {hasRain && (
            <g>
              <line x1={0} x2={plotW} y1={amountBase} y2={amountBase} className="stroke-gray-200" strokeWidth={1} />
              {shown
                .filter((h) => h.amount >= 0.005)
                .map((h) => (
                  <path
                    key={h.hour}
                    d={barPath(x(h.hour) - barW / 2, barW, amountBase, Math.max(2, (barMax * h.amount) / scale))}
                    className="fill-(--guide)/55"
                  />
                ))}
              {wettest && (
                <text
                  x={Math.max(18, Math.min(plotW - 18, x(wettest.hour)))}
                  y={amountBase - Math.max(2, (barMax * wettest.amount) / scale) - 3}
                  textAnchor="middle"
                  className="fill-gray-500 text-[10px] font-medium"
                >
                  {inches(wettest.amount)}
                </text>
              )}
            </g>
          )}

          {/* Hours */}
          {ticks.map((h) => {
            const px = x(h);
            const anchor = px < 10 ? 'start' : px > plotW - 10 ? 'end' : 'middle';
            return (
              <text key={h} x={px} y={height - 4} textAnchor={anchor} className="fill-gray-400 text-[10px]">
                {hourLabel(h)}
              </text>
            );
          })}

          {/* Crosshair */}
          {hover && (
            <g>
              <line x1={x(hover.hour)} x2={x(hover.hour)} y1={TOP - 4} y2={panelsBottom} className="stroke-gray-300" strokeWidth={1} />
              <circle cx={x(hover.hour)} cy={y(hover.chance)} r={4} className="fill-(--guide) stroke-white" strokeWidth={2} />
            </g>
          )}

          <rect
            x={0}
            y={0}
            width={plotW}
            height={panelsBottom}
            fill="transparent"
            style={{ touchAction: 'pan-y' }}
            onPointerDown={onPointer}
            onPointerMove={onPointer}
            onPointerLeave={(e) => e.pointerType === 'mouse' && onActive(null)}
          />
        </svg>
      )}

      {/* The same numbers for screen readers */}
      <table className="sr-only">
        <caption>Hourly forecast</caption>
        <thead>
          <tr>
            <th>Hour</th>
            <th>Chance of rain</th>
            <th>Rain</th>
            <th>Temperature</th>
            <th>Wind</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((h) => (
            <tr key={h.hour}>
              <td>{hourName(h.hour)}</td>
              <td>{h.chance}%</td>
              <td>{inches(h.amount)}</td>
              <td>{Math.round(h.temp)}°F</td>
              <td>{Math.round(h.wind)} mph</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Credit() {
  return (
    <a href={OPEN_METEO_URL} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-600 shrink-0">
      Forecast: Open-Meteo ↗
    </a>
  );
}

interface RoundWeatherProps {
  place: string; // an address ending "Town, ST"
  date: string;
  timeZone: string | null;
  teeTimes: string[];
}

// The forecast for a round: rain chance and amount across the day, with the round shaded
export default function RoundWeather({ place, date, timeZone, teeTimes }: RoundWeatherProps) {
  const { status, hours } = useForecast(place, date, timeZone);
  const [active, setActive] = useState<number | null>(null);
  if (status === 'unavailable') return null; // too far out, or the forecast couldn't load
  if (status === 'loading') return <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">Loading forecast…</p>;

  const tees = teeTimes.map(clockHours).filter((h): h is number => h !== null);
  const round = tees.length ? { start: Math.min(...tees), end: Math.max(...tees) + ROUND_HOURS } : null;
  const during = hours.filter((h) =>
    round ? h.hour >= Math.floor(round.start) && h.hour <= Math.ceil(round.end) : h.hour >= 8 && h.hour <= 18,
  );
  const maxChance = Math.max(0, ...during.map((h) => h.chance));
  const total = during.reduce((sum, h) => sum + h.amount, 0);
  const temps = during.map((h) => Math.round(h.temp));
  const maxWind = Math.round(Math.max(0, ...during.map((h) => h.wind)));
  const hover = hours.find((h) => h.hour === active);
  const sky = hover ? describeWeather(hover.code) : '';

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-sm font-semibold text-gray-800">{round ? 'Weather during the round' : 'Weather'}</p>
      {/* While reading the chart, these two lines show the hour under the pointer or finger */}
      <div aria-live="polite">
        {hover ? (
          <>
            <p className="text-sm text-gray-700 mt-0.5">
              <span className="font-semibold text-gray-900">{hourName(hover.hour)}</span>
              {sky && ` · ${sky}`}
            </p>
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{hover.chance}%</span> chance of rain ·{' '}
              <span className="font-semibold text-gray-700">{inches(hover.amount)}</span> · {Math.round(hover.temp)}°F · wind{' '}
              {Math.round(hover.wind)} mph
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-700 mt-0.5">
              {total >= 0.01
                ? `Up to ${maxChance}% chance of rain · ${inches(total)} expected`
                : `No measurable rain${maxChance > 0 ? ` · up to ${maxChance}% chance` : ' expected'}`}
            </p>
            {temps.length > 0 && (
              <p className="text-xs text-gray-500">
                {Math.min(...temps)}–{Math.max(...temps)}°F · wind up to {maxWind} mph
              </p>
            )}
          </>
        )}
      </div>
      <RainChart hours={hours} round={round} active={active} onActive={setActive} />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mt-1.5 text-[11px] text-gray-500">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 rounded-full bg-(--guide)" aria-hidden="true" />
            Chance of rain
          </span>
          {total >= 0.01 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2.5 rounded-t-sm bg-(--guide)/55" aria-hidden="true" />
              Rain per hour
            </span>
          )}
        </span>
        <Credit />
      </div>
    </div>
  );
}

// Kickoff "YYYY-MM-DD" and hour in a time zone
function localDateHour(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

const GAME_HOURS = 3.5;

// One line for the football card: conditions at kickoff and the rain chance during the game
export function KickoffWeather({ place, kickoff, timeZone }: { place: string; kickoff: string; timeZone: string }) {
  const { date, hour } = localDateHour(kickoff, timeZone);
  const { status, hours } = useForecast(place, date, timeZone);
  const atKickoff = hours.find((h) => h.hour === hour);
  if (status !== 'ready' || !atKickoff) return null;
  const game = hours.filter((h) => h.hour > hour && h.hour <= hour + Math.ceil(GAME_HOURS));
  const chance = Math.max(atKickoff.chance, ...game.map((h) => h.chance));
  const sky = describeWeather(atKickoff.code);
  return (
    <div className="mt-3 text-sm">
      <p className="text-xs text-gray-400 uppercase tracking-wider">Weather</p>
      <p className="font-medium text-gray-800 mt-0.5">
        {Math.round(atKickoff.temp)}°F at kickoff{sky && ` · ${sky}`} · wind {Math.round(atKickoff.wind)} mph
        <span className="text-gray-500 font-normal"> · up to {chance}% chance of rain during the game</span>
      </p>
      <p className="text-[11px] mt-0.5">
        <Credit />
      </p>
    </div>
  );
}
