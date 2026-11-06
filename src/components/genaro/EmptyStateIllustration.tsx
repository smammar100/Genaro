'use client';

import * as React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { cx } from './utils';

export type EmptyStateIllustrationVariant =
  | 'list' | 'kanban' | 'calendar' | 'gallery' | 'checklist' | 'timeline'
  | 'search' | 'lock' | 'notFound' | 'error' | 'chart' | 'detail' | 'chat';

const W = 220;
const H = 140;

const d = (ms: number) => ({ ["--d" as string]: `${ms}ms` }) as CSSProperties;

/** A rounded bar, the unit every ghost line is built from. */
function Bar({ x, y, w, h = 5, fill = "var(--bg-fill-secondary)", className, style }: { x: number; y: number; w: number; h?: number; fill?: string; className?: string; style?: CSSProperties }) {
  return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} className={className} style={style} />;
}

function Slot({ x, y, w, h, r = 6 }: { x: number; y: number; w: number; h: number; r?: number }) {
  return <rect className="p-illo__slot" x={x} y={y} width={w} height={h} rx={r} fill="none" stroke="var(--border-brand)" strokeWidth="1.25" strokeDasharray="4 3" />;
}

function Row({ y, i, ghost = true, plate = false }: { y: number; i: number; ghost?: boolean; plate?: boolean }) {
  const tone = ghost ? "var(--bg-fill-secondary)" : "var(--bg-fill-tertiary-active)";
  const x = plate ? 52 : 40;
  return (
    <g className={ghost ? "p-illo__in p-illo__ghost" : undefined} style={d(120 + i * 45)}>
      {plate ? (
        // Car Capital lists lead with the reg plate.
        <rect x={20} y={y + 3} width={26} height={10} rx={2} fill="var(--color-plate)" opacity={ghost ? 0.45 : 1} />
      ) : (
        <circle cx={28} cy={y + 8} r={6} fill={ghost ? "var(--bg-fill-tertiary)" : "var(--bg-fill-brand)"} />
      )}
      <Bar x={x} y={y + 3} w={[84, 64, 96, 72][i % 4]} fill={tone} />
      <Bar x={x} y={y + 11} w={[44, 52, 36, 48][i % 4]} h={4} fill="var(--bg-fill-tertiary)" />
      <Bar x={170} y={y + 4} w={30} h={8} fill={ghost ? "var(--bg-fill-tertiary)" : "var(--bg-surface-brand)"} />
    </g>
  );
}

function Frame({ children, toolbar = true }: { children: ReactNode; toolbar?: boolean }) {
  return (
    <>
      <rect className="p-illo__frame" x="6" y="6" width={W - 12} height={H - 12} rx="10" fill="var(--bg-surface)" stroke="var(--border)" />
      {toolbar ? (
        <g className="p-illo__in" style={d(40)}>
          <Bar x={18} y={17} w={64} h={10} fill="var(--bg-fill-secondary)" />
          <Bar x={174} y={17} w={28} h={10} fill="var(--bg-fill-brand)" />
        </g>
      ) : null}
      {children}
    </>
  );
}

function List({ plates }: { plates: boolean }) {
  return (
    <Frame>
      <Slot x={14} y={34} w={192} h={22} />
      <g className="p-illo__land">
        <Row y={37} i={0} ghost={false} plate={plates} />
      </g>
      {[1, 2, 3].map((i) => <Row key={i} y={37 + i * 23} i={i} plate={plates} />)}
    </Frame>
  );
}

function Kanban() {
  const lanes = [0, 1, 2, 3];
  return (
    <Frame toolbar={false}>
      {lanes.map((i) => (
        <g key={i} className="p-illo__in" style={d(60 + i * 50)}>
          <rect x={14 + i * 49} y={16} width={45} height={110} rx={7} fill="var(--bg-fill-secondary)" />
          <Bar x={20 + i * 49} y={23} w={22} h={4} fill="var(--bg-fill-tertiary-active)" />
          {i > 0 ? (
            <g className="p-illo__ghost">
              <rect x={19 + i * 49} y={33} width={35} height={22} rx={4} fill="var(--bg-surface)" />
              <Bar x={23 + i * 49} y={39} w={22} h={4} fill="var(--bg-fill-tertiary)" />
              <Bar x={23 + i * 49} y={46} w={14} h={3} fill="var(--bg-fill-tertiary)" />
              {i === 2 ? <rect x={19 + i * 49} y={60} width={35} height={22} rx={4} fill="var(--bg-surface)" /> : null}
            </g>
          ) : null}
        </g>
      ))}
      <Slot x={19} y={33} w={35} h={22} r={4} />
      <g className="p-illo__land p-illo__glide">
        <rect x={19} y={33} width={35} height={22} rx={4} fill="var(--bg-surface)" stroke="var(--border-brand)" />
        <Bar x={23} y={39} w={24} h={4} fill="var(--bg-fill-brand)" />
        <Bar x={23} y={46} w={14} h={3} fill="var(--bg-fill-tertiary-active)" />
      </g>
    </Frame>
  );
}

function Calendar() {
  const cols = 7;
  const cw = 26;
  return (
    <Frame toolbar={false}>
      {Array.from({ length: cols }, (_, i) => (
        <g key={i} className="p-illo__in" style={d(40 + i * 30)}>
          <Bar x={20 + i * cw} y={18} w={14} h={4} fill="var(--bg-fill-tertiary-active)" />
          <Bar x={20 + i * cw} y={25} w={8} h={6} fill="var(--bg-fill-tertiary)" />
        </g>
      ))}
      {[40, 62, 84, 106].map((y, i) => (
        <line key={y} className="p-illo__in" style={d(200 + i * 40)} x1="14" x2="206" y1={y} y2={y} stroke="var(--border-secondary)" />
      ))}
      <g className="p-illo__ghost p-illo__in" style={d(320)}>
        <rect x={18 + 1 * cw} y={86} width={22} height={18} rx={4} fill="var(--bg-fill-secondary)" />
        <rect x={18 + 5 * cw} y={44} width={22} height={14} rx={4} fill="var(--bg-fill-secondary)" />
      </g>
      <Slot x={18 + 3 * cw} y={64} w={22} h={18} r={4} />
      <g className="p-illo__land p-illo__pop">
        <rect x={18 + 3 * cw} y={64} width={22} height={18} rx={4} fill="var(--bg-surface-brand)" stroke="var(--border-brand)" />
        <rect x={18 + 3 * cw} y={64} width={3} height={18} rx={1.5} fill="var(--bg-fill-brand)" />
        <Bar x={24 + 3 * cw} y={69} w={12} h={3} fill="var(--bg-fill-brand)" />
      </g>
    </Frame>
  );
}

function Gallery() {
  const tiles = [0, 1, 2, 3, 4, 5];
  return (
    <Frame>
      {tiles.map((i) => {
        const x = 16 + (i % 3) * 63;
        const y = 36 + Math.floor(i / 3) * 46;
        return (
          <g key={i}>
            <rect className="p-illo__in" style={d(80 + i * 40)} x={x} y={y} width={58} height={40} rx={6} fill="none" stroke="var(--border-secondary)" strokeDasharray="4 3" />
            {i < 3 ? (
              <g className="p-illo__drop" style={d(i * 260)}>
                <rect x={x} y={y} width={58} height={40} rx={6} fill="var(--bg-fill-secondary)" />
                <path d={`M${x + 6} ${y + 34} L${x + 20} ${y + 20} L${x + 30} ${y + 28} L${x + 38} ${y + 22} L${x + 52} ${y + 34} Z`} fill="var(--bg-fill-tertiary-active)" />
                <circle cx={x + 44} cy={y + 11} r={4} fill={i === 0 ? "var(--color-plate)" : "var(--bg-fill-tertiary-active)"} />
              </g>
            ) : null}
          </g>
        );
      })}
    </Frame>
  );
}

function Checklist() {
  return (
    <Frame toolbar={false}>
      <g className="p-illo__in" style={d(40)}>
        <Bar x={18} y={18} w={70} h={6} fill="var(--bg-fill-tertiary-active)" />
        <rect x={18} y={30} width={184} height={5} rx={2.5} fill="var(--bg-fill-secondary)" />
      </g>
      <rect className="p-illo__progress" x={18} y={30} width={184} height={5} rx={2.5} fill="var(--bg-fill-brand)" />
      {[0, 1, 2, 3, 4].map((i) => {
        const y = 44 + i * 17;
        return (
          <g key={i} className="p-illo__in" style={d(100 + i * 50)}>
            <rect x={18} y={y} width={11} height={11} rx={3} fill="var(--bg-surface)" stroke="var(--border-emphasis)" />
            <path className="p-illo__tick" style={d(i * 420)} d={`M20.5 ${y + 5.5} L23 ${y + 8} L27 ${y + 3}`} pathLength={1} fill="none" stroke="var(--icon-brand)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <Bar x={36} y={y + 3} w={[96, 72, 110, 64, 88][i]} fill="var(--bg-fill-secondary)" />
            <Bar x={176} y={y + 2} w={26} h={7} fill="var(--bg-fill-tertiary)" />
          </g>
        );
      })}
    </Frame>
  );
}

function Timeline() {
  return (
    <Frame>
      <line className="p-illo__in" style={d(60)} x1="30" x2="30" y1="38" y2="128" stroke="var(--border-secondary)" strokeWidth="1.5" />
      <Slot x={42} y={36} w={160} h={22} />
      <g className="p-illo__land">
        <circle cx={30} cy={47} r={5} fill="var(--bg-fill-brand)" />
        <rect x={44} y={38} width={156} height={18} rx={5} fill="var(--bg-surface-brand)" />
        <Bar x={52} y={44} w={70} h={5} fill="var(--bg-fill-brand)" />
        <Bar x={168} y={44} w={24} h={5} fill="var(--bg-fill-tertiary-active)" />
      </g>
      {[0, 1, 2].map((i) => {
        const y = 66 + i * 22;
        return (
          <g key={i} className="p-illo__in p-illo__ghost" style={d(140 + i * 50)}>
            <circle cx={30} cy={y + 8} r={4} fill="var(--bg-fill-tertiary-active)" />
            <Bar x={44} y={y + 3} w={[90, 70, 100][i]} fill="var(--bg-fill-secondary)" />
            <Bar x={44} y={y + 11} w={40} h={4} fill="var(--bg-fill-tertiary)" />
          </g>
        );
      })}
    </Frame>
  );
}

function Search({ plates }: { plates: boolean }) {
  return (
    <Frame toolbar={false}>
      <g className="p-illo__in" style={d(40)}>
        <rect x={18} y={16} width={120} height={14} rx={7} fill="var(--bg-surface)" stroke="var(--border-brand)" />
        <circle cx={27} cy={23} r={3} fill="none" stroke="var(--icon-brand)" strokeWidth="1.4" />
        <Bar x={34} y={21} w={40} h={4} fill="var(--bg-fill-tertiary-active)" />
        <Bar x={146} y={16} w={26} h={14} fill="var(--bg-fill-secondary)" />
        <Bar x={176} y={16} w={26} h={14} fill="var(--bg-fill-secondary)" />
      </g>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} className="p-illo__filter" style={d(i * 90)}>
          <Row y={40 + i * 22} i={i} plate={plates} />
        </g>
      ))}
      <g className="p-illo__sweep">
        <circle cx={110} cy={84} r={14} fill="var(--bg-surface)" stroke="var(--icon-brand)" strokeWidth="2.5" />
        <line x1={120} y1={94} x2={130} y2={104} stroke="var(--icon-brand)" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </Frame>
  );
}

function Lock() {
  return (
    <Frame>
      {[0, 1, 2, 3].map((i) => <Row key={i} y={38 + i * 22} i={i} />)}
      <rect x="7" y="32" width={W - 14} height={H - 39} fill="var(--bg-surface)" opacity="0.72" />
      <g className="p-illo__lock">
        <circle className="p-illo__ring" cx={110} cy={82} r={22} fill="none" stroke="var(--border-brand)" strokeWidth="1.25" />
        <path className="p-illo__shackle" d="M101 80 V73 C101 68 105 64 110 64 C115 64 119 68 119 73 V80" fill="none" stroke="var(--icon-brand)" strokeWidth="3" strokeLinecap="round" />
        <rect x={97} y={78} width={26} height={20} rx={5} fill="var(--bg-fill-brand)" />
        <circle cx={110} cy={86.5} r={2.4} fill="var(--text-brand-on-bg-fill)" />
        <rect x={109} y={88} width={2} height={5} rx={1} fill="var(--text-brand-on-bg-fill)" />
      </g>
    </Frame>
  );
}

function NotFound() {
  return (
    <Frame>
      {[0, 2, 3].map((i) => <Row key={i} y={38 + i * 22} i={i} />)}
      <rect className="p-illo__in" style={d(200)} x={14} y={57} width={192} height={22} rx={6} fill="none" stroke="var(--border-emphasis)" strokeDasharray="4 3" />
      <g className="p-illo__adrift">
        <rect x={20} y={60} width={180} height={18} rx={5} fill="var(--bg-surface)" stroke="var(--border)" />
        <circle cx={30} cy={69} r={5} fill="var(--bg-fill-tertiary)" />
        <Bar x={40} y={66} w={70} h={5} fill="var(--bg-fill-tertiary-active)" />
        <circle cx={184} cy={69} r={6} fill="var(--bg-fill-brand)" />
        <path d="M182 67 C182 65.9 182.9 65 184 65 C185.1 65 186 65.8 186 66.9 C186 68.3 184 68.4 184 70" fill="none" stroke="var(--text-brand-on-bg-fill)" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx={184} cy={72.2} r={0.7} fill="var(--text-brand-on-bg-fill)" />
      </g>
    </Frame>
  );
}

function ErrorTpl() {
  return (
    <Frame>
      {[0, 2, 3].map((i) => <Row key={i} y={38 + i * 22} i={i} />)}
      <g className="p-illo__in" style={d(260)}>
        <rect x={14} y={58} width={192} height={20} rx={6} fill="var(--bg-surface-critical)" stroke="var(--border-critical)" />
        <rect x={14} y={58} width={4} height={20} rx={2} fill="var(--bg-fill-critical)" />
        <Bar x={26} y={65} w={86} h={5} fill="var(--bg-fill-critical-secondary)" />
      </g>
      <g className="p-illo__retry">
        <path d="M188 62 A6 6 0 1 1 182 68" fill="none" stroke="var(--icon-critical)" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M185.5 58.5 L188 62 L184.3 63.6" fill="none" stroke="var(--icon-critical)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </Frame>
  );
}

function Chart() {
  const bars = [18, 26, 14, 34, 22, 40, 30];
  return (
    <Frame toolbar={false}>
      <g className="p-illo__in" style={d(40)}>
        <Bar x={18} y={18} w={50} h={6} fill="var(--bg-fill-tertiary-active)" />
        <Bar x={18} y={28} w={30} h={10} fill="var(--bg-fill-secondary)" />
      </g>
      <line className="p-illo__in" style={d(80)} x1="18" x2="202" y1="122" y2="122" stroke="var(--border-secondary)" />
      <line className="p-illo__in" style={d(120)} x1="18" x2="202" y1="70" y2="70" stroke="var(--border-brand)" strokeDasharray="4 3" />
      {bars.map((h, i) => (
        <rect key={i} className="p-illo__grow" style={d(160 + i * 70)} x={24 + i * 26} y={122 - h} width={16} height={h} rx={3} fill={i === bars.length - 1 ? "var(--bg-fill-brand)" : "var(--bg-fill-secondary)"} />
      ))}
    </Frame>
  );
}

function Detail() {
  return (
    <Frame toolbar={false}>
      <g className="p-illo__in" style={d(40)}>
        <rect x={16} y={16} width={92} height={70} rx={7} fill="var(--bg-fill-secondary)" />
        <path d="M36 66 C36 62 38.5 60.5 42 60 L50 53 C52 51.6 54 51 56.4 51 H72 C75 51 77 52.3 78.8 54.6 L83 60 C86.5 60.6 89 62.6 89 66 V68 H36 Z" fill="var(--bg-fill-tertiary-active)" />
        <rect x={68} y={63} width={12} height={4} rx={1} fill="var(--color-plate)" />
      </g>
      {[0, 1, 2].map((i) => <rect key={i} className="p-illo__in" style={d(120 + i * 40)} x={16 + i * 32} y={92} width={28} height={20} rx={4} fill="var(--bg-fill-secondary)" />)}
      <g className="p-illo__in" style={d(160)}>
        <Bar x={118} y={20} w={78} h={7} fill="var(--bg-fill-tertiary-active)" />
        <Bar x={118} y={32} w={54} h={5} fill="var(--bg-fill-secondary)" />
        <Bar x={118} y={48} w={44} h={10} fill="var(--bg-fill-secondary)" />
        <Bar x={118} y={66} w={84} h={4} fill="var(--bg-fill-tertiary)" />
        <Bar x={118} y={74} w={70} h={4} fill="var(--bg-fill-tertiary)" />
      </g>
      <g className="p-illo__pop p-illo__land">
        <rect x={118} y={92} width={40} height={16} rx={8} fill="var(--bg-surface-brand)" stroke="var(--border-brand)" />
        <circle cx={128} cy={100} r={2.5} fill="var(--bg-fill-brand)" />
        <circle className="p-illo__ping" cx={128} cy={100} r={2.5} fill="none" stroke="var(--icon-brand)" />
        <Bar x={134} y={98} w={18} h={4} fill="var(--bg-fill-brand)" />
      </g>
    </Frame>
  );
}

/**
 * A conversation: a teammate's message and a reply, ghosted, then your first
 * message lands as a brand bubble carrying a reg plate, above the message box.
 */
function Chat() {
  return (
    <Frame toolbar={false}>
      <g className="p-illo__in" style={d(40)}>
        <circle cx={24} cy={22} r={6} fill="var(--bg-fill-tertiary)" />
        <Bar x={36} y={17} w={58} h={6} fill="var(--bg-fill-tertiary-active)" />
        <Bar x={36} y={26} w={34} h={4} fill="var(--bg-fill-tertiary)" />
      </g>
      <g className="p-illo__in p-illo__ghost" style={d(120)}>
        <circle cx={22} cy={48} r={5} fill="var(--bg-fill-tertiary)" />
        <rect x={32} y={38} width={96} height={18} rx={9} fill="var(--bg-fill-secondary)" />
        <Bar x={41} y={45} w={62} h={4} fill="var(--bg-fill-tertiary)" />
      </g>
      <g className="p-illo__in p-illo__ghost" style={d(180)}>
        <rect x={130} y={60} width={72} height={14} rx={7} fill="var(--bg-fill-tertiary)" />
        <Bar x={139} y={65} w={44} h={4} fill="var(--bg-fill-secondary)" />
      </g>
      <Slot x={94} y={79} w={110} h={22} r={11} />
      <g className="p-illo__land">
        <rect x={96} y={81} width={106} height={18} rx={9} fill="var(--bg-fill-brand)" />
        {/* The first message is about a car: its plate, then the words. */}
        <rect x={104} y={85} width={26} height={10} rx={2} fill="var(--color-plate)" />
        <Bar x={136} y={88} w={54} h={4} fill="var(--bg-surface)" />
      </g>
      <g className="p-illo__in" style={d(240)}>
        <rect x={16} y={110} width={188} height={16} rx={8} fill="var(--bg-surface)" stroke="var(--border)" />
        <Bar x={26} y={116} w={60} h={4} fill="var(--bg-fill-tertiary)" />
        <circle cx={194} cy={118} r={5} fill="var(--bg-fill-brand)" />
      </g>
    </Frame>
  );
}

const VARIANTS: Record<EmptyStateIllustrationVariant, (props: { plates: boolean }) => ReactNode> = {
  list: List, kanban: Kanban, calendar: Calendar, gallery: Gallery, checklist: Checklist,
  timeline: Timeline, search: Search, lock: Lock, notFound: NotFound, error: ErrorTpl,
  chart: Chart, detail: Detail, chat: Chat,
};

export interface EmptyStateIllustrationProps {
  /** The kind of screen that is empty: its ghosted miniature is drawn, with the first item landing in place. */
  variant: EmptyStateIllustrationVariant;
  /** `medium` (280px) on a page, `small` (200px) inside a card. */
  size?: 'medium' | 'small';
  /** Lead each list row with a reg plate, for lists of vehicles. */
  plates?: boolean;
  className?: string;
}

/**
 * A ghosted miniature of the screen once it has content, for EmptyState's
 * `illustration` slot. The first item lands where it will appear, on a 4.6s
 * loop; with reduced motion it rests in the landed state.
 * @import import { EmptyStateIllustration } from "@/components/genaro";
 */
export function EmptyStateIllustration({ variant, size = 'medium', plates = false, className }: EmptyStateIllustrationProps) {
  const id = React.useId().replace(/:/g, '');
  const Drawing = VARIANTS[variant];
  const width = size === 'small' ? 200 : 280;
  return (
    <svg
      className={cx('p-illo', `p-illo--${variant}`, className)}
      width={width}
      height={(width * H) / W}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={`p-illo-fade-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="55%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id={`p-illo-mask-${id}`}>
          <rect width={W} height={H} fill={`url(#p-illo-fade-${id})`} />
        </mask>
      </defs>
      {/* Fades out at the bottom, so it reads as a glimpse of the screen, not a screenshot. */}
      <g mask={`url(#p-illo-mask-${id})`}>
        <Drawing plates={plates} />
      </g>
    </svg>
  );
}
