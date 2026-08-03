import {
  useId,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
} from "react";
import "./mascot-animations.css";

export const MASCOT_POSES = [
  "sleeping",
  "sitting",
  "waving",
  "peeking",
  "thinking",
  "celebrating",
] as const;

export type MascotStaticPose = (typeof MASCOT_POSES)[number];

const POSE_LABELS: Record<MascotStaticPose, string> = {
  sleeping:
    "Mascot asleep, lying horizontally with his head resting on stretched front paws",
  sitting: "Mascot sitting at rest",
  waving: "Mascot waving one front paw",
  peeking: "Mascot peeking over an edge with both paws on it",
  thinking: "Mascot sitting with one paw at his chin, thinking",
  celebrating: "Mascot celebrating with both front paws raised",
};

type MascotPoseProps = Omit<
  SVGProps<SVGSVGElement>,
  "aria-label" | "children"
> & {
  pose: MascotStaticPose;
  label?: string;
  decorative?: boolean;
  animated?: boolean;
  accent?: string;
};

type ArtworkProps = {
  body: string;
  animated: boolean;
};

function Ear({
  transform,
  body,
}: {
  transform: string;
  body: string;
}) {
  return (
    <g transform={transform}>
      <path
        d="M3 -15C-8 -15 -15 -5 -16 8C-17 20 -13 28 -7 28C-1 28 2 20 3 12C4 3 4 -6 3 -15Z"
        fill={body}
        stroke="var(--gt-mascot-pose-ink)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M1 -9C-7 -3 -10 10 -7 23"
        fill="none"
        stroke="var(--gt-mascot-pose-ink)"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.8"
      />
    </g>
  );
}

function Toes({ transform }: { transform?: string }) {
  return (
    <g
      transform={transform}
      fill="none"
      stroke="var(--gt-mascot-pose-ink)"
      strokeWidth="1.1"
      strokeLinecap="round"
    >
      <path d="M-4 -0.4C-4.6 1.8 -4.8 3.4 -4.6 5" />
      <path d="M0.2 -1.2C0.2 1.4 0.2 3.4 0.4 5.4" />
      <path d="M4.4 -0.4C4.8 1.8 5 3.4 4.8 4.8" />
    </g>
  );
}

function Paw({
  transform,
  body,
  rx = 10.5,
  ry = 8.2,
  toesTransform,
}: {
  transform: string;
  body: string;
  rx?: number;
  ry?: number;
  toesTransform?: string;
}) {
  return (
    <g transform={transform}>
      <ellipse
        rx={rx}
        ry={ry}
        fill={body}
        stroke="var(--gt-mascot-pose-ink)"
        strokeWidth="1.6"
      />
      <Toes transform={toesTransform} />
    </g>
  );
}

function Limb({ d, body }: { d: string; body: string }) {
  return (
    <>
      <path
        d={d}
        fill="none"
        stroke="var(--gt-mascot-pose-ink)"
        strokeWidth="12.6"
        strokeLinecap="round"
      />
      <path
        d={d}
        fill="none"
        stroke={body}
        strokeWidth="9.2"
        strokeLinecap="round"
      />
    </>
  );
}

function Face({
  body,
  eyeY = 45,
  eyeScaleY = 1,
  noseY = 60,
  headTransform,
  leftMouth = "M62 64.8C62 70 56.6 71 54 67.4",
  rightMouth = "M62 64.8C62 70 67.4 71 70 67.4",
  openMouth,
  leftEarTransform = "translate(42 22) rotate(22)",
  rightEarTransform = "translate(82 22) scale(-1 1) rotate(22)",
}: {
  body: string;
  eyeY?: number;
  eyeScaleY?: number;
  noseY?: number;
  headTransform?: string;
  leftMouth?: string;
  rightMouth?: string;
  openMouth?: string;
  leftEarTransform?: string;
  rightEarTransform?: string;
}) {
  const face = (
    <>
      <Ear transform={leftEarTransform} body={body} />
      <Ear transform={rightEarTransform} body={body} />
      <ellipse
        cx="62"
        cy="47"
        rx="34.5"
        ry="32"
        fill={body}
        stroke="var(--gt-mascot-pose-ink)"
        strokeWidth="1.6"
      />
      {[48, 76].map((eyeX) => (
        <g
          key={eyeX}
          transform={`translate(${eyeX} ${eyeY}) scale(1 ${eyeScaleY})`}
        >
          <ellipse
            rx="5.8"
            ry="8.2"
            fill="var(--gt-mascot-pose-ink)"
          />
          <circle cx="1.6" cy="-3.4" r="1.8" fill="#ffffff" />
        </g>
      ))}
      <ellipse
        cx="62"
        cy={noseY}
        rx="6.6"
        ry="5"
        fill="var(--gt-mascot-pose-ink)"
      />
      <ellipse
        cx="62"
        cy={noseY - 2.4}
        rx="3.4"
        ry="1.3"
        fill="#ffffff"
        opacity="0.26"
      />
      {openMouth ? (
        <path
          d={openMouth}
          fill="var(--gt-mascot-pose-ink)"
          stroke="var(--gt-mascot-pose-ink)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <path
            d={leftMouth}
            fill="none"
            stroke="var(--gt-mascot-pose-ink)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d={rightMouth}
            fill="none"
            stroke="var(--gt-mascot-pose-ink)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </>
      )}
    </>
  );

  return headTransform ? <g transform={headTransform}>{face}</g> : face;
}

function SleepingPose({ body, animated }: ArtworkProps) {
  return (
    <>
      <ellipse
        cx="168"
        cy="129"
        rx="104"
        ry="5.5"
        fill="var(--gt-mascot-pose-shadow)"
      />
      <g className={animated ? "gt-pose-sleep" : undefined}>
        <path
          d="M146 120C140 106 145 95 158 89C177 80 206 78 227 86C247 94 255 108 250 118C247 124 239 126 227 126L157 126C150 126 148 125 146 120Z"
          fill={body}
          stroke="var(--gt-mascot-pose-ink)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M214 90C226 97 228 111 221 122"
          fill="none"
          stroke="var(--gt-mascot-pose-ink)"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.8"
        />
      </g>
      <Paw
        transform="translate(202 120) rotate(4)"
        body={body}
        rx={9.6}
        ry={6.6}
        toesTransform="rotate(-92) scale(0.86)"
      />
      <path
        d="M150 108C128 108 104 109 86 110"
        fill="none"
        stroke="var(--gt-mascot-pose-ink)"
        strokeWidth="11.8"
        strokeLinecap="round"
      />
      <path
        d="M150 108C128 108 104 109 86 110"
        fill="none"
        stroke={body}
        strokeWidth="8.4"
        strokeLinecap="round"
      />
      <ellipse
        cx="79"
        cy="110"
        rx="9.2"
        ry="6.6"
        transform="rotate(-4 79 110)"
        fill={body}
        stroke="var(--gt-mascot-pose-ink)"
        strokeWidth="1.6"
      />
      <g className={animated ? "gt-pose-sleep-head" : undefined}>
        <g transform="rotate(-6 112 92)">
          <Ear
            transform="translate(133 83) rotate(64) scale(0.94)"
            body={body}
          />
          <ellipse
            cx="112"
            cy="94"
            rx="34"
            ry="27"
            fill={body}
            stroke="var(--gt-mascot-pose-ink)"
            strokeWidth="1.6"
          />
          <path
            d="M90 90Q97 96 104 89"
            fill="none"
            stroke="var(--gt-mascot-pose-ink)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M116 88Q123 94 130 87"
            fill="none"
            stroke="var(--gt-mascot-pose-ink)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <ellipse
            cx="87"
            cy="102"
            rx="6.4"
            ry="4.8"
            transform="rotate(-12 87 102)"
            fill="var(--gt-mascot-pose-ink)"
          />
          <ellipse
            cx="86.6"
            cy="99.6"
            rx="3.2"
            ry="1.2"
            transform="rotate(-12 86.6 99.6)"
            fill="#ffffff"
            opacity="0.26"
          />
          <path
            d="M88 106.4C89 110.4 94.4 110.8 97 107.6"
            fill="none"
            stroke="var(--gt-mascot-pose-ink)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <Ear
            transform="translate(108 67) rotate(-34) scale(0.88)"
            body={body}
          />
        </g>
      </g>
      <Limb d="M148 118C132 123 114 124 100 123" body={body} />
      <Paw
        transform="translate(89 122) rotate(-3)"
        body={body}
        ry={7.6}
        toesTransform="rotate(-93)"
      />
    </>
  );
}

function SittingPose({ body, animated }: ArtworkProps) {
  return (
    <>
      <ellipse
        cx="62"
        cy="142"
        rx="34"
        ry="5"
        fill="var(--gt-mascot-pose-shadow)"
      />
      <g className={animated ? "gt-pose-breathe" : undefined}>
        <ellipse
          cx="62"
          cy="106"
          rx="30"
          ry="30"
          fill={body}
          stroke="var(--gt-mascot-pose-ink)"
          strokeWidth="1.6"
        />
      </g>
      <Limb d="M50 78C36 86 31 104 34 118" body={body} />
      <Limb d="M74 78C88 86 93 104 90 118" body={body} />
      <Paw transform="translate(33 126) rotate(6)" body={body} />
      <Paw transform="translate(91 126) rotate(-6)" body={body} />
      <Face body={body} />
    </>
  );
}

function WavingPose({ body }: ArtworkProps) {
  return (
    <>
      <ellipse
        cx="62"
        cy="142"
        rx="34"
        ry="5"
        fill="var(--gt-mascot-pose-shadow)"
      />
      <ellipse
        cx="62"
        cy="106"
        rx="30"
        ry="30"
        fill={body}
        stroke="var(--gt-mascot-pose-ink)"
        strokeWidth="1.6"
      />
      <Limb d="M50 78C36 86 31 104 34 118" body={body} />
      <Paw transform="translate(33 126) rotate(6)" body={body} />
      <Paw transform="translate(88 128) rotate(-10)" body={body} />
      <Face
        body={body}
        headTransform="rotate(3 62 78)"
        leftEarTransform="translate(42 22) rotate(22)"
        rightEarTransform="translate(82 22) scale(-1 1) rotate(10)"
        leftMouth="M62 64.6C62 70.6 55.8 71.8 53 67.8"
        rightMouth="M62 64.6C62 70.6 68.2 71.8 71 67.8"
      />
      <Limb d="M76 76C92 68 100 52 98 36" body={body} />
      <Paw
        transform="translate(97 30) rotate(-22)"
        body={body}
        toesTransform="rotate(180)"
      />
    </>
  );
}

function PeekingPose({ body }: ArtworkProps) {
  const fingerPaths = (
    <>
      <path d="M26 110 25.4 118" />
      <path d="M32 111 32 119" />
      <path d="M38 110 38.4 118" />
      <path d="M86 110 85.6 118" />
      <path d="M92 111 92 119" />
      <path d="M98 110 98.4 118" />
    </>
  );

  return (
    <>
      <g transform="translate(0 40)">
        <Face body={body} eyeY={47} noseY={61} />
      </g>
      <ellipse
        cx="32"
        cy="112"
        rx="10.5"
        ry="8.2"
        transform="rotate(-6 32 112)"
        fill={body}
        stroke="var(--gt-mascot-pose-ink)"
        strokeWidth="1.6"
      />
      <ellipse
        cx="92"
        cy="112"
        rx="10.5"
        ry="8.2"
        transform="rotate(6 92 112)"
        fill={body}
        stroke="var(--gt-mascot-pose-ink)"
        strokeWidth="1.6"
      />
      <rect
        x="-14"
        y="114"
        width="178"
        height="13"
        rx="6.5"
        fill="var(--gt-mascot-pose-edge)"
        stroke="var(--gt-mascot-pose-ink)"
        strokeWidth="1.6"
      />
      <g
        fill="none"
        stroke="var(--gt-mascot-pose-ink)"
        strokeWidth="5.6"
        strokeLinecap="round"
      >
        {fingerPaths}
      </g>
      <g
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.6"
        strokeLinecap="round"
      >
        {fingerPaths}
      </g>
    </>
  );
}

function ThinkingPose({ body, animated }: ArtworkProps) {
  return (
    <>
      <ellipse
        cx="62"
        cy="142"
        rx="36"
        ry="5"
        fill="var(--gt-mascot-pose-shadow)"
      />
      <g className={animated ? "gt-pose-breathe" : undefined}>
        <ellipse
          cx="62"
          cy="108"
          rx="31"
          ry="28"
          fill={body}
          stroke="var(--gt-mascot-pose-ink)"
          strokeWidth="1.6"
        />
      </g>
      <Limb d="M50 80C38 90 38 104 44 112" body={body} />
      <Paw
        transform="translate(31 130) rotate(-8)"
        body={body}
        rx={10.8}
        ry={8}
      />
      <Paw
        transform="translate(93 130) rotate(8)"
        body={body}
        rx={10.8}
        ry={8}
      />
      <Paw transform="translate(45 114) rotate(14)" body={body} />
      <Face
        body={body}
        eyeScaleY={0.82}
        headTransform="rotate(8 62 78)"
        leftEarTransform="translate(42 23) rotate(30)"
        rightEarTransform="translate(82 22) scale(-1 1) rotate(16)"
        leftMouth="M62 64.8C62 68.6 58 69.4 55.6 68.6"
        rightMouth="M62 64.8C62 69.8 67.4 70.6 70 67.4"
      />
      <Limb d="M80 94C93 86 93 74 87 67" body={body} />
      <Paw
        transform="translate(85 63) rotate(-26)"
        body={body}
        toesTransform="rotate(124)"
      />
    </>
  );
}

function CelebratingPose({ body, animated }: ArtworkProps) {
  return (
    <>
      <ellipse
        cx="62"
        cy="144"
        rx="28"
        ry="4.5"
        fill="var(--gt-mascot-pose-shadow)"
      />
      <g className={animated ? "gt-pose-float" : undefined}>
        <ellipse
          cx="62"
          cy="104"
          rx="29.5"
          ry="29"
          fill={body}
          stroke="var(--gt-mascot-pose-ink)"
          strokeWidth="1.6"
        />
        <Paw
          transform="translate(46 130) rotate(-18)"
          body={body}
          rx={10.4}
          ry={7.6}
        />
        <Paw
          transform="translate(78 130) rotate(18)"
          body={body}
          rx={10.4}
          ry={7.6}
        />
        <Face
          body={body}
          eyeY={44}
          noseY={59}
          leftEarTransform="translate(42 21) rotate(8)"
          rightEarTransform="translate(82 21) scale(-1 1) rotate(8)"
          openMouth="M55 67.6C55.6 76 68.4 76 69 67.6Z"
        />
        <Limb d="M46 84C28 76 16 60 14 45" body={body} />
        <Limb d="M78 84C96 76 108 60 110 45" body={body} />
        <Paw
          transform="translate(12 39) rotate(26)"
          body={body}
          toesTransform="rotate(186)"
        />
        <Paw
          transform="translate(112 39) rotate(-26)"
          body={body}
          toesTransform="rotate(174)"
        />
      </g>
      <circle
        cx="8"
        cy="86"
        r="3"
        fill="var(--gt-mascot-pose-accent)"
      />
      <circle
        cx="132"
        cy="78"
        r="2.4"
        fill="var(--gt-mascot-pose-accent)"
      />
      <circle
        cx="122"
        cy="102"
        r="2"
        fill="var(--gt-mascot-pose-accent)"
      />
    </>
  );
}

const ARTWORK: Record<
  MascotStaticPose,
  (props: ArtworkProps) => ReactNode
> = {
  sleeping: (props) => <SleepingPose {...props} />,
  sitting: (props) => <SittingPose {...props} />,
  waving: (props) => <WavingPose {...props} />,
  peeking: (props) => <PeekingPose {...props} />,
  thinking: (props) => <ThinkingPose {...props} />,
  celebrating: (props) => <CelebratingPose {...props} />,
};

export function MascotPose({
  pose,
  label = POSE_LABELS[pose],
  decorative = false,
  animated = false,
  accent = "#ff8a13",
  className = "",
  style,
  viewBox: requestedViewBox,
  ...svgProps
}: MascotPoseProps) {
  const gradientId = `gt-mascot-pose-${useId().replaceAll(":", "")}`;
  const body = `url(#${gradientId})`;
  const viewBox =
    requestedViewBox ?? (pose === "sleeping" ? "0 0 300 140" : "0 0 150 150");
  const artwork = ARTWORK[pose]({ body, animated });
  const mascotStyle = {
    ...style,
    "--gt-mascot-pose-accent": accent,
  } as CSSProperties;

  return (
    <svg
      {...svgProps}
      viewBox={viewBox}
      className={`gt-mascot-pose gt-mascot-pose-${pose} ${className}`.trim()}
      style={mascotStyle}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="var(--gt-mascot-pose-body)" />
          <stop offset="0.58" stopColor="var(--gt-mascot-pose-body)" />
          <stop offset="1" stopColor="var(--gt-mascot-pose-body-shade)" />
        </linearGradient>
      </defs>
      {artwork}
    </svg>
  );
}
