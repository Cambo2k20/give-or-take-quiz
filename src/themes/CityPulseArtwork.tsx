import { useId } from "react";
import type { BackgroundThemeId } from "../../lib/themes";
import type { ThemeArtworkProps } from "./ThemeArtwork";
import { SvgArtworkFrame } from "./SvgArtworkFrame";
import "./city-pulse.css";

export const themeId = "city-pulse" satisfies BackgroundThemeId;

type Building = {
  height: number;
  id: string;
  width: number;
  x: number;
};

const VIEWBOX_HEIGHT = 900;

const DISTANT_BUILDINGS: readonly Building[] = [
  { id: "f01", x: 0, width: 112, height: 198 },
  { id: "f02", x: 98, width: 126, height: 252 },
  { id: "f03", x: 210, width: 104, height: 176 },
  { id: "f04", x: 300, width: 142, height: 286 },
  { id: "f05", x: 426, width: 110, height: 216 },
  { id: "f06", x: 522, width: 142, height: 248 },
  { id: "f07", x: 648, width: 126, height: 318 },
  { id: "f08", x: 758, width: 136, height: 224 },
  { id: "f09", x: 878, width: 132, height: 306 },
  { id: "f10", x: 994, width: 116, height: 202 },
  { id: "f11", x: 1094, width: 142, height: 264 },
  { id: "f12", x: 1220, width: 110, height: 190 },
  { id: "f13", x: 1316, width: 140, height: 280 },
  { id: "f14", x: 1440, width: 104, height: 222 },
  { id: "f15", x: 1530, width: 92, height: 168 },
] as const;

const NEAR_BUILDINGS: readonly Building[] = [
  { id: "n01", x: -12, width: 126, height: 286 },
  { id: "n02", x: 90, width: 142, height: 394 },
  { id: "n03", x: 210, width: 116, height: 322 },
  { id: "n04", x: 306, width: 148, height: 442 },
  { id: "n05", x: 430, width: 118, height: 270 },
  { id: "n06", x: 520, width: 132, height: 350 },
  { id: "n07", x: 948, width: 130, height: 334 },
  { id: "n08", x: 1052, width: 126, height: 270 },
  { id: "n09", x: 1156, width: 148, height: 430 },
  { id: "n10", x: 1280, width: 116, height: 312 },
  { id: "n11", x: 1374, width: 144, height: 382 },
  { id: "n12", x: 1494, width: 120, height: 278 },
] as const;

function buildingTop(building: Building) {
  return VIEWBOX_HEIGHT - building.height;
}

const WINDOW_CYCLES_PER_SKYLINE = 3;
const ANIMATED_WINDOW_FREQUENCY = 8;

function windowsFor(
  building: Building,
  buildingIndex: number,
  near: boolean,
  cycle: number | null,
) {
  const top = buildingTop(building);
  const sideInset = near ? 15 : 13;
  const windowWidth = near ? 4 : 3;
  const windowHeight = near ? 6 : 4;
  const columnGap = near ? 18 : 16;
  const rowGap = near ? 24 : 20;
  const rows = Math.max(
    1,
    Math.floor((building.height - 42) / rowGap),
  );
  const columns = Math.max(
    1,
    Math.floor((building.width - sideInset * 2) / columnGap),
  );

  return Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const densityStep = row < rows * 0.3 ? 4 : row < rows * 0.55 ? 3 : 2;
    const seed = buildingIndex * 17 + row * 11 + column * 7;
    if (seed % densityStep === 0) return null;

    const x =
      building.x +
      sideInset +
      column * columnGap +
      ((row + buildingIndex) % 2) * 2;
    const y = top + 34 + row * rowGap;
    const warm = (seed + row) % 5 < 2;
    const motionSeed = seed * 7 + row * 5 + column * 3;
    const animated = motionSeed % ANIMATED_WINDOW_FREQUENCY === 0;
    const windowCycle =
      Math.floor(motionSeed / ANIMATED_WINDOW_FREQUENCY) %
      WINDOW_CYCLES_PER_SKYLINE;
    if (cycle === null ? animated : !animated || windowCycle !== cycle) {
      return null;
    }

    return (
      <rect
        key={`${building.id}-w-${index}`}
        x={x}
        y={y}
        width={windowWidth}
        height={windowHeight}
        rx="0.8"
        fill={
          warm
            ? "var(--artwork-city-window-coral)"
            : "var(--artwork-city-window-cyan)"
        }
      />
    );
  });
}

function BuildingClip({
  buildings,
  id,
}: {
  buildings: readonly Building[];
  id: string;
}) {
  return (
    <clipPath id={id}>
      {buildings.map((building) => (
        <rect
          key={`${building.id}-clip`}
          x={building.x}
          y={buildingTop(building)}
          width={building.width}
          height={building.height}
        />
      ))}
    </clipPath>
  );
}

function BuildingMasses({
  buildings,
  near,
}: {
  buildings: readonly Building[];
  near: boolean;
}) {
  return (
    <>
      {buildings.map((building) => (
        <g key={building.id}>
          <rect
            x={building.x}
            y={buildingTop(building)}
            width={building.width}
            height={building.height}
            fill={
              near
                ? "var(--artwork-city-building-near)"
                : "var(--artwork-city-building-far)"
            }
          />
          <line
            x1={building.x}
            x2={building.x + building.width}
            y1={buildingTop(building) + 1}
            y2={buildingTop(building) + 1}
            stroke="var(--artwork-city-rooftop-coral)"
            strokeWidth={near ? 2 : 1}
          />
        </g>
      ))}
    </>
  );
}

function WindowRects({
  buildings,
  cycle,
  near,
}: {
  buildings: readonly Building[];
  cycle: number | null;
  near: boolean;
}) {
  return (
    <>
      {buildings.map((building, index) =>
        windowsFor(building, index, near, cycle),
      )}
    </>
  );
}

function SkylineLayer({
  buildings,
  clipId,
  cycleOffset,
  near,
}: {
  buildings: readonly Building[];
  clipId: string;
  cycleOffset: number;
  near: boolean;
}) {
  return (
    <g
      className={
        near
          ? "city-pulse__skyline-near-motion"
          : "city-pulse__skyline-far-motion"
      }
    >
      <BuildingMasses buildings={buildings} near={near} />
      <g clipPath={`url(#${clipId})`} opacity={near ? 0.72 : 0.34}>
        <g className="city-pulse__windows-static">
          <WindowRects buildings={buildings} cycle={null} near={near} />
        </g>
        {Array.from(
          { length: WINDOW_CYCLES_PER_SKYLINE },
          (_, cycle) => (
            <g
              className={`city-pulse__window-cycle city-pulse__window-cycle--${cycleOffset + cycle + 1}`}
              key={`window-cycle-${cycleOffset + cycle}`}
            >
              <WindowRects
                buildings={buildings}
                cycle={cycle}
                near={near}
              />
            </g>
          ),
        )}
        {near && (
          <g className="city-pulse__rare-accent-cycle">
            <rect
              x="1438"
              y="648"
              width="6"
              height="8"
              rx="1"
              fill="var(--artwork-city-window-coral)"
            />
          </g>
        )}
      </g>
    </g>
  );
}

export default function CityPulseArtwork(props: ThemeArtworkProps) {
  const instanceId = useId().replaceAll(":", "");
  const farClipId = `${instanceId}-city-far`;
  const nearClipId = `${instanceId}-city-near`;

  return (
    <SvgArtworkFrame {...props} className="city-pulse" washCount={3}>
      <svg
        className="svg-theme-artwork__scene city-pulse__scene"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <BuildingClip buildings={DISTANT_BUILDINGS} id={farClipId} />
          <BuildingClip buildings={NEAR_BUILDINGS} id={nearClipId} />
        </defs>

        <SkylineLayer
          buildings={DISTANT_BUILDINGS}
          clipId={farClipId}
          cycleOffset={0}
          near={false}
        />

        <g
          className="city-pulse__connections"
          fill="none"
          strokeLinecap="round"
        >
          <path
            d="M 90 506 Q 214 462 338 458"
            stroke="var(--artwork-city-connection)"
            strokeWidth="1.5"
          />
          <path
            d="M 1260 470 Q 1371 430 1482 518"
            stroke="var(--artwork-city-rooftop-coral)"
            strokeWidth="1.5"
          />
          <g fill="var(--artwork-city-window-coral)" stroke="none">
            <rect x="87" y="503" width="6" height="6" rx="1" />
            <rect x="335" y="455" width="6" height="6" rx="1" />
            <rect x="1257" y="467" width="6" height="6" rx="1" />
            <rect x="1479" y="515" width="6" height="6" rx="1" />
          </g>
          {props.variant === "backdrop" && (
            <>
              <g className="city-pulse__traffic-point" opacity="0">
                <animateMotion
                  dur="41s"
                  repeatCount="indefinite"
                  path="M 90 506 Q 214 462 338 458"
                  keyPoints="0;0;1;1"
                  keyTimes="0;0.05;0.27;1"
                  calcMode="linear"
                />
                <animate
                  attributeName="opacity"
                  dur="41s"
                  repeatCount="indefinite"
                  values="0;0;1;1;0;0"
                  keyTimes="0;0.04;0.08;0.23;0.27;1"
                />
                <circle
                  r="3"
                  fill="var(--artwork-city-window-cyan)"
                />
              </g>
              <g className="city-pulse__traffic-point" opacity="0">
                <animateMotion
                  dur="41s"
                  repeatCount="indefinite"
                  path="M 1260 470 Q 1371 430 1482 518"
                  keyPoints="0;0;1;1"
                  keyTimes="0;0.52;0.78;1"
                  calcMode="linear"
                />
                <animate
                  attributeName="opacity"
                  dur="41s"
                  repeatCount="indefinite"
                  values="0;0;1;1;0;0"
                  keyTimes="0;0.51;0.55;0.74;0.78;1"
                />
                <circle
                  r="3"
                  fill="var(--artwork-city-window-coral)"
                />
              </g>
            </>
          )}
        </g>

        <SkylineLayer
          buildings={NEAR_BUILDINGS}
          clipId={nearClipId}
          cycleOffset={WINDOW_CYCLES_PER_SKYLINE}
          near
        />
      </svg>
    </SvgArtworkFrame>
  );
}
