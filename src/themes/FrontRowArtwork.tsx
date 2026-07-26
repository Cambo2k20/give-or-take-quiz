import { useId } from "react";
import type { BackgroundThemeId } from "../../lib/themes";
import type { ThemeArtworkProps } from "./ThemeArtwork";
import { SvgArtworkFrame } from "./SvgArtworkFrame";

export const themeId = "front-row" satisfies BackgroundThemeId;

const FRONT_ROW_MOTION = (
  <style>{`
    .front-row .svg-theme-artwork__wash {
      animation: none;
      will-change: auto;
    }

    .front-row__screen-glow {
      animation: front-row-screen-shift 23s ease-in-out infinite alternate;
      will-change: opacity;
    }

    @keyframes front-row-screen-shift {
      0% { opacity: 0.72; }
      31% { opacity: 0.82; }
      67% { opacity: 0.76; }
      100% { opacity: 0.9; }
    }

    @media (prefers-reduced-motion: reduce) {
      .front-row__screen-glow {
        animation: none;
        opacity: 0.8;
      }
    }
  `}</style>
);

type SeatRowProps = {
  count: number;
  fill: string;
  gap: number;
  opacity: number;
  scale: number;
  seatId: string;
  startX: number;
  y: number;
};

function SeatRow({
  count,
  fill,
  gap,
  opacity,
  scale,
  seatId,
  startX,
  y,
}: SeatRowProps) {
  return (
    <g className="front-row__seat-row" fill={fill} opacity={opacity}>
      {Array.from({ length: count }, (_, index) => (
        <use
          href={`#${seatId}`}
          key={`${seatId}-${y}-${index}`}
          transform={`translate(${startX + index * gap} ${y}) scale(${scale})`}
        />
      ))}
    </g>
  );
}

export default function FrontRowArtwork(props: ThemeArtworkProps) {
  const instanceId = useId().replaceAll(":", "");
  const seatId = `${instanceId}-front-row-seat`;
  const screenGlowId = `${instanceId}-front-row-screen-glow`;
  const auditoriumHazeId = `${instanceId}-front-row-haze`;

  return (
    <SvgArtworkFrame
      {...props}
      className="front-row"
      motionStyles={FRONT_ROW_MOTION}
    >
      <svg
        className="svg-theme-artwork__scene front-row__scene"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <g id={seatId}>
            <path d="M -62 126 V 43 C -62 14 -42 0 0 0 C 42 0 62 14 62 43 V 126 Z" />
            <path
              d="M -47 45 C -47 22 -31 12 0 12 C 31 12 47 22 47 45"
              fill="none"
              stroke="var(--artwork-connection)"
              strokeWidth="2"
              opacity="0.34"
            />
          </g>
          <radialGradient id={screenGlowId}>
            <stop
              offset="0"
              stopColor="var(--artwork-detail-cool)"
              stopOpacity="0.54"
            />
            <stop
              offset="0.48"
              stopColor="var(--artwork-detail-warm)"
              stopOpacity="0.2"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-detail-warm)"
              stopOpacity="0"
            />
          </radialGradient>
          <linearGradient
            id={auditoriumHazeId}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0"
              stopColor="var(--artwork-detail-warm)"
              stopOpacity="0.1"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-detail-warm)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        <rect width="1600" height="900" fill="var(--artwork-bg)" />

        <g className="front-row__screen-glow">
          <ellipse
            cx="800"
            cy="278"
            rx="610"
            ry="365"
            fill={`url(#${screenGlowId})`}
          />
          <rect
            x="430"
            y="92"
            width="740"
            height="316"
            rx="4"
            fill="var(--artwork-orb)"
            stroke="var(--artwork-orbit-inner)"
            strokeWidth="2"
          />
          <rect
            x="444"
            y="106"
            width="712"
            height="288"
            rx="2"
            fill="var(--artwork-detail-cool)"
            opacity="0.24"
          />
        </g>

        <path
          d="M 320 408 H 1280 L 1510 900 H 90 Z"
          fill={`url(#${auditoriumHazeId})`}
          opacity="0.32"
        />

        <path
          d="M 0 516 C 360 494 1240 494 1600 516"
          fill="none"
          stroke="var(--artwork-orbit)"
          strokeWidth="1.5"
          opacity="0.22"
        />
        <SeatRow
          count={15}
          fill="var(--artwork-structure-far)"
          gap={116}
          opacity={0.34}
          scale={0.54}
          seatId={seatId}
          startX={-12}
          y={514}
        />

        <path
          d="M 0 636 C 390 610 1210 610 1600 636"
          fill="none"
          stroke="var(--artwork-orbit)"
          strokeWidth="1.5"
          opacity="0.28"
        />
        <SeatRow
          count={10}
          fill="var(--artwork-structure-far)"
          gap={190}
          opacity={0.68}
          scale={0.86}
          seatId={seatId}
          startX={-54}
          y={614}
        />

        <SeatRow
          count={7}
          fill="var(--artwork-structure-near)"
          gap={292}
          opacity={1}
          scale={1.46}
          seatId={seatId}
          startX={-78}
          y={720}
        />
        <path
          d="M 0 892 H 1600"
          fill="none"
          stroke="var(--artwork-orbit)"
          strokeWidth="2"
          opacity="0.18"
        />
      </svg>
    </SvgArtworkFrame>
  );
}
