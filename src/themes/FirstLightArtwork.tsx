import { useId } from "react";
import type { BackgroundThemeId } from "../../lib/themes";
import ceratopsianAUrl from "../assets/themes/first-light/ceratopsian-a.svg";
import ceratopsianBUrl from "../assets/themes/first-light/ceratopsian-b.svg";
import frond1Url from "../assets/themes/first-light/frond-1.svg";
import frond2Url from "../assets/themes/first-light/frond-2.svg";
import frond3Url from "../assets/themes/first-light/frond-3.svg";
import frond4Url from "../assets/themes/first-light/frond-4.svg";
import frond5Url from "../assets/themes/first-light/frond-5.svg";
import frond6Url from "../assets/themes/first-light/frond-6.svg";
import frond7Url from "../assets/themes/first-light/frond-7.svg";
import frond8Url from "../assets/themes/first-light/frond-8.svg";
import juvenileAUrl from "../assets/themes/first-light/juvenile-a.svg";
import juvenileBUrl from "../assets/themes/first-light/juvenile-b.svg";
import pteroAUrl from "../assets/themes/first-light/ptero-a.svg";
import pteroBUrl from "../assets/themes/first-light/ptero-b.svg";
import ridgeSvg from "../assets/themes/first-light/ridge.svg?raw";
import sauropodAUrl from "../assets/themes/first-light/sauropod-adult-a.svg";
import sauropodBUrl from "../assets/themes/first-light/sauropod-adult-b.svg";
import treelineSvg from "../assets/themes/first-light/treeline.svg?raw";
import type { ThemeArtworkProps } from "./ThemeArtwork";
import { SvgArtworkFrame } from "./SvgArtworkFrame";
import "./first-light.css";

export const themeId = "first-light" satisfies BackgroundThemeId;

const ASSET_MASKS = [
  ["sauropodA", sauropodAUrl],
  ["sauropodB", sauropodBUrl],
  ["juvenileA", juvenileAUrl],
  ["juvenileB", juvenileBUrl],
  ["ceratopsianA", ceratopsianAUrl],
  ["ceratopsianB", ceratopsianBUrl],
  ["pteroA", pteroAUrl],
  ["pteroB", pteroBUrl],
  ["frond1", frond1Url],
  ["frond2", frond2Url],
  ["frond3", frond3Url],
  ["frond4", frond4Url],
  ["frond5", frond5Url],
  ["frond6", frond6Url],
  ["frond7", frond7Url],
  ["frond8", frond8Url],
] as const;

const ridgePathMatch = ridgeSvg.match(/\sd="([^"]+)"/);
if (!ridgePathMatch) {
  throw new Error("First Light ridge.svg does not contain a path.");
}
const RIDGE_PATH = ridgePathMatch[1];

const treelinePathMatch = treelineSvg.match(/\sd="([^"]+)"/);
if (!treelinePathMatch) {
  throw new Error("First Light treeline.svg does not contain a path.");
}
const TREELINE_PATH = treelinePathMatch[1];

type AssetKey = (typeof ASSET_MASKS)[number][0];

type StarTone = "cool" | "white" | "warm";
type DustStar = readonly [number, number, number, number, StarTone];

function createDustStars(count: number, seed: number): DustStar[] {
  let state = seed >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return Array.from({ length: count }, () => {
    const x = +(random() * 1600).toFixed(1);
    const y = +(8 + Math.pow(random(), 1.18) * 322).toFixed(1);
    const magnitude = Math.pow(random(), 2.8);
    const radius = +(0.34 + magnitude * 0.82).toFixed(2);
    const extinction = 1 - y / 760;
    const opacity = +((0.16 + magnitude * 0.48) * extinction).toFixed(2);
    const temperature = random();
    const tone: StarTone = temperature > 0.86
      ? "warm"
      : temperature < 0.38
        ? "cool"
        : "white";

    return [x, y, radius, opacity, tone] as const;
  });
}

const DUST_STARS = createDustStars(128, 20260805);

const FINE_STARS = [
  [34, 42, 0.7, 0.42],
  [78, 92, 0.55, 0.34],
  [126, 28, 0.8, 0.48],
  [164, 154, 0.65, 0.3],
  [218, 112, 0.55, 0.4],
  [248, 38, 0.9, 0.56],
  [302, 82, 0.65, 0.32],
  [344, 214, 0.7, 0.26],
  [374, 34, 0.55, 0.36],
  [424, 176, 0.8, 0.44],
  [458, 94, 0.6, 0.3],
  [506, 246, 0.65, 0.22],
  [548, 30, 0.8, 0.5],
  [574, 162, 0.55, 0.34],
  [624, 104, 0.7, 0.42],
  [668, 222, 0.55, 0.24],
  [702, 42, 0.65, 0.38],
  [754, 182, 0.9, 0.48],
  [790, 118, 0.55, 0.28],
  [828, 24, 0.7, 0.46],
  [862, 212, 0.65, 0.24],
  [906, 148, 0.8, 0.4],
  [948, 54, 0.55, 0.34],
  [994, 242, 0.7, 0.2],
  [1032, 98, 0.65, 0.44],
  [1068, 32, 0.85, 0.52],
  [1112, 190, 0.55, 0.26],
  [1150, 126, 0.7, 0.38],
  [1196, 238, 0.6, 0.22],
  [1232, 40, 0.75, 0.48],
  [1278, 178, 0.55, 0.3],
  [1314, 92, 0.8, 0.5],
  [1358, 228, 0.65, 0.2],
  [1392, 34, 0.55, 0.36],
  [1436, 146, 0.7, 0.42],
  [1474, 76, 0.9, 0.54],
  [1518, 212, 0.55, 0.24],
  [1570, 118, 0.7, 0.38],
  [104, 222, 0.6, 0.25],
  [286, 266, 0.55, 0.2],
  [486, 292, 0.7, 0.18],
  [712, 282, 0.6, 0.18],
  [936, 302, 0.55, 0.16],
  [1164, 278, 0.65, 0.18],
  [1408, 292, 0.55, 0.16],
  [1540, 258, 0.7, 0.2],
] as const;

const BRIGHT_STARS = [
  [54, 186, 1.45, 0.72, "cool"],
  [188, 54, 1.8, 0.86, "white"],
  [276, 138, 1.25, 0.68, "warm"],
  [356, 76, 1.55, 0.78, "cool"],
  [468, 206, 1.2, 0.62, "white"],
  [584, 68, 1.95, 0.9, "warm"],
  [676, 152, 1.35, 0.7, "cool"],
  [770, 46, 1.65, 0.82, "white"],
  [858, 126, 1.2, 0.66, "warm"],
  [934, 88, 1.8, 0.86, "cool"],
  [1018, 204, 1.3, 0.64, "white"],
  [1096, 62, 1.55, 0.8, "warm"],
  [1182, 154, 1.25, 0.7, "cool"],
  [1260, 52, 1.9, 0.88, "white"],
  [1344, 194, 1.35, 0.66, "warm"],
  [1428, 96, 1.6, 0.78, "cool"],
  [1510, 42, 1.35, 0.72, "white"],
  [1560, 184, 1.75, 0.82, "warm"],
] as const;

type SilhouetteProps = {
  className?: string;
  fill: string;
  height: number;
  maskId: string;
  opacity?: number;
  width: number;
  x: number;
  y: number;
};

function Silhouette({
  className,
  fill,
  height,
  maskId,
  opacity,
  width,
  x,
  y,
}: SilhouetteProps) {
  return (
    <rect
      className={className}
      fill={fill}
      height={height}
      mask={`url(#${maskId})`}
      opacity={opacity}
      width={width}
      x={x}
      y={y}
    />
  );
}

const heroFill = "var(--artwork-first-light-hero)";
const herdSauropodFill = "var(--artwork-first-light-herd-sauropod)";
const herdJuvenileFill = "var(--artwork-first-light-herd-juvenile)";
const herdCeratopsianFill = "var(--artwork-first-light-herd-ceratopsian)";
const foliageFill = "var(--artwork-first-light-foliage)";

export default function FirstLightArtwork(props: ThemeArtworkProps) {
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (name: string) => `first-light-${instanceId}-${name}`;
  const assetMask = (key: AssetKey) => id(`asset-${key}`);

  return (
    <SvgArtworkFrame
      {...props}
      className="first-light"
      washCount={0}
    >
      <svg
        className="svg-theme-artwork__scene first-light__scene"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {ASSET_MASKS.map(([key, href]) => (
            <mask
              data-first-light-asset={key}
              id={assetMask(key)}
              key={key}
              maskContentUnits="objectBoundingBox"
              maskUnits="objectBoundingBox"
              style={{ maskType: "alpha" }}
            >
              <image
                href={href}
                width="1"
                height="1"
                preserveAspectRatio="none"
              />
            </mask>
          ))}

          <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-sky-top)"
            />
            <stop
              offset="0.46"
              stopColor="var(--artwork-first-light-sky-middle)"
            />
            <stop
              offset="0.84"
              stopColor="var(--artwork-first-light-sky-low)"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-sky-horizon)"
            />
          </linearGradient>
          <radialGradient id={id("airglow-blue")} cx="0.5" cy="0.5" r="0.5">
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-airglow-blue)"
              stopOpacity="0.34"
            />
            <stop
              offset="0.5"
              stopColor="var(--artwork-first-light-airglow-blue)"
              stopOpacity="0.12"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-airglow-blue)"
              stopOpacity="0"
            />
          </radialGradient>
          <radialGradient id={id("airglow-violet")} cx="0.5" cy="0.5" r="0.5">
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-airglow-violet)"
              stopOpacity="0.26"
            />
            <stop
              offset="0.56"
              stopColor="var(--artwork-first-light-airglow-violet)"
              stopOpacity="0.08"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-airglow-violet)"
              stopOpacity="0"
            />
          </radialGradient>
          <radialGradient id={id("milky-way")} cx="0.48" cy="0.46" r="0.58">
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-milky-way)"
              stopOpacity="0.16"
            />
            <stop
              offset="0.34"
              stopColor="var(--artwork-first-light-milky-way)"
              stopOpacity="0.07"
            />
            <stop
              offset="0.72"
              stopColor="var(--artwork-first-light-milky-way)"
              stopOpacity="0.025"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-milky-way)"
              stopOpacity="0"
            />
          </radialGradient>
          <radialGradient id={id("milky-way-rift")}>
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-sky-top)"
              stopOpacity="0.72"
            />
            <stop
              offset="0.55"
              stopColor="var(--artwork-first-light-sky-top)"
              stopOpacity="0.28"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-sky-top)"
              stopOpacity="0"
            />
          </radialGradient>
          <radialGradient id={id("zodiacal-light")}>
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-star-warm)"
              stopOpacity="0.1"
            />
            <stop
              offset="0.56"
              stopColor="var(--artwork-first-light-star-warm)"
              stopOpacity="0.035"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-star-warm)"
              stopOpacity="0"
            />
          </radialGradient>
          <radialGradient id={id("morning-star")}>
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-star-warm)"
              stopOpacity="0.42"
            />
            <stop
              offset="0.48"
              stopColor="var(--artwork-first-light-star-warm)"
              stopOpacity="0.11"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-star-warm)"
              stopOpacity="0"
            />
          </radialGradient>
          <linearGradient id={id("ground")} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-ground-top)"
            />
            <stop
              offset="0.26"
              stopColor="var(--artwork-first-light-ground-middle)"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-ground-bottom)"
            />
          </linearGradient>
          <radialGradient id={id("dawn")}>
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-dawn-core)"
              stopOpacity="0.74"
            />
            <stop
              offset="0.4"
              stopColor="var(--artwork-first-light-dawn-middle)"
              stopOpacity="0.24"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-dawn-edge)"
              stopOpacity="0"
            />
          </radialGradient>
          <radialGradient id={id("shade")}>
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-shadow)"
              stopOpacity="0.55"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-shadow)"
              stopOpacity="0"
            />
          </radialGradient>
          <linearGradient id={id("mist")} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-mist)"
              stopOpacity="0"
            />
            <stop
              offset="0.3"
              stopColor="var(--artwork-first-light-mist)"
              stopOpacity="0.045"
            />
            <stop
              offset="0.5"
              stopColor="var(--artwork-first-light-mist)"
              stopOpacity="0.1"
            />
            <stop
              offset="0.72"
              stopColor="var(--artwork-first-light-mist)"
              stopOpacity="0.04"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-mist)"
              stopOpacity="0"
            />
          </linearGradient>
          <linearGradient
            id={id("cloud-cool")}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-cloud-cool)"
              stopOpacity="0"
            />
            <stop
              offset="0.48"
              stopColor="var(--artwork-first-light-cloud-cool)"
              stopOpacity="0.13"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-cloud-cool)"
              stopOpacity="0"
            />
          </linearGradient>
          <linearGradient
            id={id("cloud-warm")}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-cloud-warm)"
              stopOpacity="0"
            />
            <stop
              offset="0.55"
              stopColor="var(--artwork-first-light-cloud-warm)"
              stopOpacity="0.1"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-cloud-warm)"
              stopOpacity="0"
            />
          </linearGradient>
          <linearGradient id={id("bank")} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-bank)"
              stopOpacity="0"
            />
            <stop
              offset="0.58"
              stopColor="var(--artwork-first-light-bank)"
              stopOpacity="0.86"
            />
            <stop
              offset="0.68"
              stopColor="var(--artwork-first-light-bank)"
              stopOpacity="0.86"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-bank)"
              stopOpacity="0"
            />
          </linearGradient>
          <linearGradient id={id("valley")} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-valley)"
              stopOpacity="0.1"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-valley)"
              stopOpacity="0"
            />
          </linearGradient>
          <linearGradient id={id("herd-fade")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.33" stopColor="#ffffff" />
            <stop offset="0.4" stopColor="#3d3d3d" />
            <stop offset="0.6" stopColor="#3d3d3d" />
            <stop offset="0.67" stopColor="#ffffff" />
            <stop offset="1" stopColor="#ffffff" />
          </linearGradient>
          <mask
            id={id("herd-gap")}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="1600"
            height="900"
          >
            <rect
              x="0"
              y="0"
              width="1600"
              height="900"
              fill={`url(#${id("herd-fade")})`}
            />
          </mask>
          <radialGradient id={id("pool")}>
            <stop
              offset="0"
              stopColor="var(--artwork-first-light-pool-core)"
              stopOpacity="0.2"
            />
            <stop
              offset="0.55"
              stopColor="var(--artwork-first-light-pool-middle)"
              stopOpacity="0.1"
            />
            <stop
              offset="1"
              stopColor="var(--artwork-first-light-pool-edge)"
              stopOpacity="0"
            />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="1600" height="472" fill={`url(#${id("sky")})`} />

        <g className="first-light__night-colour" aria-hidden="true">
          <ellipse cx="330" cy="142" rx="620" ry="270" fill={`url(#${id("airglow-blue")})`} />
          <ellipse cx="1330" cy="112" rx="520" ry="230" fill={`url(#${id("airglow-violet")})`} />
          <path
            d="M-90 -22 C220 4 492 74 764 182 C1010 280 1252 366 1690 434 L1690 510 C1270 452 990 366 720 260 C450 154 190 82 -90 64 Z"
            fill={`url(#${id("milky-way")})`}
            opacity="0.78"
          />
          <path
            d="M-40 18 C256 56 502 126 744 222 C996 322 1252 394 1640 442 L1640 472 C1256 432 980 360 722 260 C468 162 222 96 -40 62 Z"
            fill={`url(#${id("milky-way")})`}
            opacity="0.28"
          />
          <ellipse
            cx="650"
            cy="176"
            rx="330"
            ry="34"
            fill={`url(#${id("milky-way-rift")})`}
            opacity="0.48"
            transform="rotate(18 650 176)"
          />
          <ellipse
            cx="1220"
            cy="348"
            rx="250"
            ry="28"
            fill={`url(#${id("milky-way-rift")})`}
            opacity="0.34"
            transform="rotate(18 1220 348)"
          />
          <ellipse
            cx="1010"
            cy="410"
            rx="92"
            ry="275"
            fill={`url(#${id("zodiacal-light")})`}
            opacity="0.72"
            transform="rotate(-12 1010 410)"
          />
        </g>

        <g className="first-light__starfield" data-first-light-starfield>
          <g className="first-light__starfield--dust">
            {DUST_STARS.map(([cx, cy, r, opacity, tone]) => {
              const fill = tone === "warm"
                ? "var(--artwork-first-light-star-warm)"
                : tone === "cool"
                  ? "var(--artwork-first-light-star-cool)"
                  : "var(--artwork-first-light-star)";

              return (
                <circle
                  key={`${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={fill}
                  opacity={opacity}
                />
              );
            })}
          </g>
          <g className="first-light__starfield--fine" fill="var(--artwork-first-light-star)">
            {FINE_STARS.map(([cx, cy, r, opacity]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} opacity={opacity} />
            ))}
          </g>
          {BRIGHT_STARS.map(([cx, cy, r, opacity, tone], index) => {
            const fill = tone === "warm"
              ? "var(--artwork-first-light-star-warm)"
              : tone === "cool"
                ? "var(--artwork-first-light-star-cool)"
                : "var(--artwork-first-light-star)";

            return (
              <g
                className={`first-light__star-glimmer first-light__star-glimmer--${(index % 3) + 1}`}
                fill={fill}
                key={`${cx}-${cy}`}
              >
                <circle cx={cx} cy={cy} r={r * 2.8} opacity={opacity * 0.08} />
                <circle cx={cx} cy={cy} r={r} opacity={opacity} />
              </g>
            );
          })}
        </g>

        <g
          className="first-light__morning-star"
          data-first-light-morning-star
          transform="translate(912 208)"
        >
          <circle r="17" fill={`url(#${id("morning-star")})`} />
          <path d="M0 -15 L1.7 0 L0 15 L-1.7 0 Z" fill="var(--artwork-first-light-star-warm)" opacity="0.48" />
          <path d="M-16 0 L0 -1.7 L16 0 L0 1.7 Z" fill="var(--artwork-first-light-star-warm)" opacity="0.36" />
          <circle r="2.1" fill="var(--artwork-first-light-star)" />
        </g>

        <g
          className="first-light__constellations"
          fill="var(--artwork-first-light-constellation)"
          stroke="var(--artwork-first-light-constellation)"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g data-first-light-constellation="cygnus">
            <polyline points="358,136 438,151 522,126" fill="none" strokeWidth="0.75" opacity="0.16" />
            <polyline points="420,58 430,104 438,151 448,202" fill="none" strokeWidth="0.75" opacity="0.16" />
            {[[358, 136], [438, 151], [522, 126], [420, 58], [430, 104], [448, 202]].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.35" opacity="0.78" stroke="none" />
            ))}
          </g>
          <g data-first-light-constellation="ursa-major">
            <polyline points="650,146 706,110 762,92 820,74 874,112 812,138 762,92" fill="none" strokeWidth="0.7" opacity="0.14" />
            {[[650, 146], [706, 110], [762, 92], [820, 74], [874, 112], [812, 138]].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.3" opacity="0.74" stroke="none" />
            ))}
          </g>
          <g data-first-light-constellation="cassiopeia">
            <polyline points="1170,86 1214,122 1264,76 1320,116 1376,70" fill="none" strokeWidth="0.75" opacity="0.15" />
            {[[1170, 86], [1214, 122], [1264, 76], [1320, 116], [1376, 70]].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.45" opacity="0.8" stroke="none" />
            ))}
          </g>
        </g>

        <g className="first-light__meteors" strokeLinecap="round">
          <g className="first-light__meteor first-light__meteor--one">
            <path d="M196 52 L292 102" fill="none" stroke="var(--artwork-first-light-meteor)" strokeWidth="1" opacity="0.3" />
            <path d="M252 82 L292 102" fill="none" stroke="var(--artwork-first-light-meteor)" strokeWidth="1.8" opacity="0.82" />
            <circle cx="292" cy="102" r="2.1" fill="var(--artwork-first-light-meteor)" />
          </g>
          <g className="first-light__meteor first-light__meteor--two">
            <path d="M1018 48 L1100 92" fill="none" stroke="var(--artwork-first-light-meteor)" strokeWidth="0.9" opacity="0.28" />
            <path d="M1064 72 L1100 92" fill="none" stroke="var(--artwork-first-light-meteor)" strokeWidth="1.6" opacity="0.78" />
            <circle cx="1100" cy="92" r="1.9" fill="var(--artwork-first-light-meteor)" />
          </g>
          <g className="first-light__meteor first-light__meteor--three">
            <path d="M566 198 L638 236" fill="none" stroke="var(--artwork-first-light-meteor)" strokeWidth="0.8" opacity="0.24" />
            <path d="M606 219 L638 236" fill="none" stroke="var(--artwork-first-light-meteor)" strokeWidth="1.45" opacity="0.72" />
            <circle cx="638" cy="236" r="1.7" fill="var(--artwork-first-light-meteor)" />
          </g>
        </g>
        <g fill={`url(#${id("cloud-cool")})`}>
          <path
            d="M150 162 C300 128 420 120 560 131 C700 142 800 133 905 150 C800 166 690 176 560 170 C430 164 300 180 150 162 Z"
            opacity="0.9"
          />
          <path
            d="M380 190 C470 176 560 170 650 177 C700 180 730 178 760 184 C710 192 640 198 560 193 C480 189 430 196 380 190 Z"
            opacity="0.45"
          />
          <path
            d="M980 138 C1080 118 1180 112 1270 120 C1330 125 1370 122 1420 132 C1350 142 1270 150 1180 144 C1090 139 1040 150 980 138 Z"
            opacity="0.75"
          />
          <path
            d="M620 214 C760 190 880 182 980 192 C1060 200 1120 196 1180 206 C1100 220 1010 232 930 226 C830 220 720 232 620 214 Z"
            opacity="0.62"
          />
        </g>
        <g fill={`url(#${id("cloud-warm")})`}>
          <path
            d="M60 268 C260 244 430 236 600 246 C760 255 900 240 1060 248 C1140 252 1190 250 1240 258 C1140 272 1020 282 880 276 C720 270 520 286 330 278 C220 273 140 276 60 268 Z"
            opacity="0.6"
          />
          <path
            d="M1180 236 C1270 220 1350 214 1430 221 C1490 226 1520 224 1560 230 C1500 240 1420 248 1340 242 C1270 237 1220 244 1180 236 Z"
            opacity="0.55"
          />
        </g>

        {/* The broad dawn sits behind the landform; the lower bank retains atmospheric haze. */}
        <g className="first-light__dawn">
          <ellipse cx="840" cy="482" rx="500" ry="228" fill={`url(#${id("dawn")})`} />
          <ellipse
            cx="1338"
            cy="470"
            rx="260"
            ry="96"
            fill={`url(#${id("dawn")})`}
            opacity="0.5"
          />
          <ellipse
            cx="266"
            cy="474"
            rx="220"
            ry="74"
            fill={`url(#${id("dawn")})`}
            opacity="0.26"
          />
        </g>
        <svg
          className="first-light__ridge"
          height={250}
          opacity={1}
          preserveAspectRatio="none"
          viewBox="0 0 3200 200"
          width={2000}
          x={-200}
          y={205}
        >
          <path
            data-first-light-ridge-path
            d={RIDGE_PATH}
            fill="var(--artwork-first-light-ridge)"
          />
        </svg>
        <rect x="0" y="420" width="1600" height="56" fill={`url(#${id("valley")})`} />
        <svg
          className="first-light__treeline"
          height={122}
          opacity={0.95}
          preserveAspectRatio="none"
          viewBox="0 0 3200 200"
          width={1952}
          x={0}
          y={350}
        >
          <path
            data-first-light-treeline-path
            d={TREELINE_PATH}
            fill="var(--artwork-first-light-treeline)"
          />
        </svg>
        <rect x="0" y="470" width="1600" height="430" fill={`url(#${id("ground")})`} />
        <rect x="0" y="412" width="1600" height="96" fill={`url(#${id("bank")})`} />

        <g className="first-light__pterosaurs">
          <g className="first-light__ptero-pose first-light__ptero-pose--a">
            <Silhouette fill="var(--artwork-first-light-pterosaur)" height={20} maskId={assetMask("pteroA")} width={46} x={0} y={286} />
            <Silhouette fill="var(--artwork-first-light-pterosaur)" height={15} maskId={assetMask("pteroA")} width={35} x={62} y={262} />
            <Silhouette fill="var(--artwork-first-light-pterosaur)" height={12} maskId={assetMask("pteroA")} width={28} x={34} y={316} />
          </g>
          <g className="first-light__ptero-pose first-light__ptero-pose--b">
            <Silhouette fill="var(--artwork-first-light-pterosaur)" height={20} maskId={assetMask("pteroB")} width={46} x={0} y={286} />
            <Silhouette fill="var(--artwork-first-light-pterosaur)" height={15} maskId={assetMask("pteroB")} width={35} x={62} y={262} />
            <Silhouette fill="var(--artwork-first-light-pterosaur)" height={12} maskId={assetMask("pteroB")} width={28} x={34} y={316} />
          </g>
        </g>

        <g className="first-light__mist first-light__mist--horizon">
          <ellipse cx="0" cy="488" rx="760" ry="20" fill={`url(#${id("mist")})`} opacity="0.8" />
          <ellipse cx="330" cy="496" rx="520" ry="13" fill={`url(#${id("mist")})`} opacity="0.7" />
          <ellipse cx="620" cy="484" rx="300" ry="9" fill={`url(#${id("mist")})`} opacity="0.55" />
        </g>

        <g mask={`url(#${id("herd-gap")})`}>
          <g className="first-light__herd-travel">
            <g className="first-light__herd-pose first-light__herd-pose--a">
              <g className="first-light__herd-depth first-light__herd-depth--far">
                <Silhouette fill={herdCeratopsianFill} height={38.3} maskId={assetMask("ceratopsianA")} opacity={0.26} width={66} x={20} y={467.7} />
              </g>
              <g className="first-light__herd-depth first-light__herd-depth--mid">
                <Silhouette fill={herdSauropodFill} height={92.7} maskId={assetMask("sauropodA")} opacity={0.5} width={161} x={270} y={431.3} />
              </g>
              <Silhouette fill={herdSauropodFill} height={140.5} maskId={assetMask("sauropodA")} width={244} x={620} y={407.5} />
              <Silhouette fill={herdJuvenileFill} height={75.3} maskId={assetMask("juvenileA")} width={113} x={910} y={472.7} />
              <Silhouette fill={herdCeratopsianFill} height={91.2} maskId={assetMask("ceratopsianA")} width={158} x={1107} y={456.8} />
            </g>
            <g className="first-light__herd-pose first-light__herd-pose--b">
              <g className="first-light__herd-depth first-light__herd-depth--far">
                <Silhouette fill={herdCeratopsianFill} height={38.3} maskId={assetMask("ceratopsianB")} opacity={0.26} width={66} x={20} y={467.7} />
              </g>
              <g className="first-light__herd-depth first-light__herd-depth--mid">
                <Silhouette fill={herdSauropodFill} height={92.7} maskId={assetMask("sauropodB")} opacity={0.5} width={161} x={270} y={431.3} />
              </g>
              <Silhouette fill={herdSauropodFill} height={140.5} maskId={assetMask("sauropodB")} width={244} x={620} y={407.5} />
              <Silhouette fill={herdJuvenileFill} height={75.3} maskId={assetMask("juvenileB")} width={113} x={910} y={472.7} />
              <Silhouette fill={herdCeratopsianFill} height={91.2} maskId={assetMask("ceratopsianB")} width={158} x={1107} y={456.8} />
            </g>
          </g>
        </g>

        <g className="first-light__hero first-light__hero--wide">
          <ellipse cx="820" cy="612" rx="580" ry="150" fill={`url(#${id("dawn")})`} opacity="0.13" />
          <ellipse cx="800" cy="520" rx="360" ry="72" fill={`url(#${id("pool")})`} />
          <ellipse cx="798" cy="548" rx="200" ry="36" fill={`url(#${id("pool")})`} opacity="0.75" />
          <ellipse cx="800" cy="560" rx="218" ry="22" fill={`url(#${id("shade")})`} />
          <g className="first-light__hero-pose first-light__hero-pose--a">
            <Silhouette fill={heroFill} height={208} maskId={assetMask("sauropodA")} opacity={0.97} width={360} x={620} y={352} />
          </g>
          <g className="first-light__hero-pose first-light__hero-pose--b">
            <Silhouette fill={heroFill} height={208} maskId={assetMask("sauropodB")} opacity={0.97} width={360} x={620} y={352} />
          </g>
        </g>

        <g className="first-light__mist first-light__mist--middle">
          <ellipse cx="0" cy="556" rx="880" ry="24" fill={`url(#${id("mist")})`} opacity="0.66" />
          <ellipse cx="-260" cy="568" rx="540" ry="16" fill={`url(#${id("mist")})`} opacity="0.6" />
          <ellipse cx="300" cy="548" rx="420" ry="12" fill={`url(#${id("mist")})`} opacity="0.5" />
        </g>
        <g className="first-light__mist first-light__mist--near">
          <ellipse cx="0" cy="672" rx="1020" ry="26" fill={`url(#${id("mist")})`} opacity="0.26" />
          <ellipse cx="420" cy="690" rx="640" ry="18" fill={`url(#${id("mist")})`} opacity="0.22" />
          <ellipse cx="-320" cy="704" rx="500" ry="14" fill={`url(#${id("mist")})`} opacity="0.2" />
        </g>

        <g className="first-light__hero first-light__hero--phone">
          <ellipse cx="800" cy="820" rx="520" ry="140" fill={`url(#${id("dawn")})`} opacity="0.11" />
          <ellipse cx="800" cy="764" rx="330" ry="84" fill={`url(#${id("pool")})`} />
          <ellipse cx="798" cy="790" rx="190" ry="38" fill={`url(#${id("pool")})`} opacity="0.75" />
          <ellipse cx="800" cy="792" rx="200" ry="20" fill={`url(#${id("shade")})`} />
          <g className="first-light__hero-travel first-light__hero-travel--phone">
            <g className="first-light__hero-pose first-light__hero-pose--a">
              <Silhouette fill={heroFill} height={248.1} maskId={assetMask("sauropodA")} opacity={0.98} width={430} x={1010} y={541.9} />
            </g>
            <g className="first-light__hero-pose first-light__hero-pose--b">
              <Silhouette fill={heroFill} height={248.1} maskId={assetMask("sauropodB")} opacity={0.98} width={430} x={1010} y={541.9} />
            </g>
          </g>
        </g>

        <g className="first-light__hero first-light__hero--desktop">
          <ellipse cx="800" cy="850" rx="520" ry="118" fill={`url(#${id("dawn")})`} opacity="0.12" />
          <ellipse cx="800" cy="828" rx="340" ry="76" fill={`url(#${id("pool")})`} />
          <ellipse cx="800" cy="852" rx="210" ry="38" fill={`url(#${id("pool")})`} opacity="0.75" />
          <ellipse cx="800" cy="884" rx="230" ry="22" fill={`url(#${id("shade")})`} />
          <g className="first-light__hero-travel first-light__hero-travel--desktop">
            <g className="first-light__hero-pose first-light__hero-pose--a">
              <Silhouette fill={heroFill} height={346.2} maskId={assetMask("sauropodA")} opacity={0.98} width={600} x={1610} y={537} />
            </g>
            <g className="first-light__hero-pose first-light__hero-pose--b">
              <Silhouette fill={heroFill} height={346.2} maskId={assetMask("sauropodB")} opacity={0.98} width={600} x={1610} y={537} />
            </g>
          </g>
        </g>

        <g className="first-light__foreground">
          <g className="first-light__edge-bank first-light__edge-bank--left">
            <g transform="rotate(-3 -300 900)">
              <Silhouette fill={foliageFill} height={653.3} maskId={assetMask("frond1")} opacity={0.96} width={560} x={-300} y={246.7} />
            </g>
            <g transform="rotate(-2 -140 900)">
              <Silhouette fill={foliageFill} height={303.3} maskId={assetMask("frond2")} opacity={0.88} width={260} x={-160} y={596.7} />
            </g>
            <g transform="rotate(3 -20 900)">
              <Silhouette fill={foliageFill} height={257} maskId={assetMask("frond4")} opacity={0.86} width={220} x={-40} y={643} />
            </g>
            <g transform="rotate(-2 60 900)">
              <Silhouette fill={foliageFill} height={233.7} maskId={assetMask("frond8")} opacity={0.82} width={200} x={40} y={666.3} />
            </g>
          </g>
          <g className="first-light__category-foliage first-light__category-foliage--left">
            <g transform="rotate(-2 520 900)">
              <Silhouette fill={foliageFill} height={210} maskId={assetMask("frond3")} opacity={0.76} width={180} x={340} y={690} />
            </g>
          </g>
          <g className="first-light__category-foliage first-light__category-foliage--right">
            <g transform="rotate(2 1080 900)">
              <Silhouette fill={foliageFill} height={210} maskId={assetMask("frond2")} opacity={0.76} width={180} x={1080} y={690} />
            </g>
          </g>
          <g className="first-light__edge-bank first-light__edge-bank--right">
            <g transform="translate(1600 0) scale(-1 1)">
              <g transform="rotate(-2 -220 900)">
                <Silhouette fill={foliageFill} height={560} maskId={assetMask("frond1")} opacity={0.88} width={480} x={-220} y={340} />
              </g>
              <g transform="rotate(-3 60 900)">
                <Silhouette fill={foliageFill} height={257} maskId={assetMask("frond5")} opacity={0.84} width={220} x={40} y={643} />
              </g>
            </g>
            <g transform="rotate(2 1600 900)">
              <Silhouette fill={foliageFill} height={233.7} maskId={assetMask("frond3")} opacity={0.82} width={200} x={1400} y={666.3} />
            </g>
            <g transform="rotate(2 1540 900)">
              <Silhouette fill={foliageFill} height={222} maskId={assetMask("frond7")} opacity={0.8} width={190} x={1360} y={678} />
            </g>
          </g>
        </g>

        <g className="first-light__phone-foreground">
          <g className="first-light__phone-edge first-light__phone-edge--left">
            <g transform="rotate(-4 440 900)">
              <Silhouette fill={foliageFill} height={396.7} maskId={assetMask("frond2")} opacity={0.9} width={340} x={440} y={503.3} />
            </g>
            <g transform="rotate(-2 400 900)">
              <Silhouette fill={foliageFill} height={350} maskId={assetMask("frond6")} opacity={0.88} width={300} x={400} y={550} />
            </g>
          </g>
          <g className="first-light__phone-edge first-light__phone-edge--right">
            <g transform="translate(1600 0) scale(-1 1)">
              <g transform="rotate(-3 440 900)">
                <Silhouette fill={foliageFill} height={385} maskId={assetMask("frond1")} opacity={0.9} width={330} x={440} y={515} />
              </g>
            </g>
            <g transform="rotate(2 1200 900)">
              <Silhouette fill={foliageFill} height={373.3} maskId={assetMask("frond7")} opacity={0.86} width={320} x={880} y={526.7} />
            </g>
          </g>
        </g>
      </svg>
    </SvgArtworkFrame>
  );
}
