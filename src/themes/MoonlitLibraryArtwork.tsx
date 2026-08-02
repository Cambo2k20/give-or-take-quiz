import type { CSSProperties } from "react";
import type { BackgroundThemeId } from "../../lib/themes";
import type {
  ThemeArtworkProps,
  ThemeArtworkStyle,
} from "./ThemeArtwork";
import "./moonlit-library.css";

export const themeId = "moonlit-library" satisfies BackgroundThemeId;

type SceneStyle = CSSProperties & {
  [name: `--moonlit-${string}`]: string | number;
};

type ShelfItem =
  | { kind: "gap"; width: string }
  | {
      gilt: boolean;
      height: string;
      kind: "book";
      tilt: string | null;
      tone: number;
      width: string;
    };

type Bookcase = {
  position: "back" | "left" | "right";
  shelves: ShelfItem[][];
};

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function buildBookcase(
  position: Bookcase["position"],
  shelfCount: number,
  booksPerShelf: number,
  seed: number,
): Bookcase {
  const random = mulberry32(seed);
  const shelves = Array.from({ length: shelfCount }, () =>
    Array.from({ length: booksPerShelf }, (): ShelfItem => {
      if (random() < 0.07) {
        return {
          kind: "gap",
          width: `${(6 + random() * 16).toFixed(2)}px`,
        };
      }

      const gilt = random() < 0.38;
      const width = `${(9 + random() * 20).toFixed(2)}px`;
      const height = `${(58 + random() * 38).toFixed(2)}%`;
      const tone = Math.floor(random() * 12) + 1;
      const tilt =
        random() < 0.05
          ? `rotate(${(4 + random() * 7).toFixed(1)}deg)`
          : null;

      return { gilt, height, kind: "book", tilt, tone, width };
    }),
  );

  return { position, shelves };
}

const BOOKCASES = [
  buildBookcase("back", 5, 15, 1337),
  buildBookcase("left", 7, 11, 2248),
  buildBookcase("right", 7, 11, 3159),
];

function buildDust() {
  const random = mulberry32(24601);
  return Array.from({ length: 58 }, () => {
    const left = random() * 100;
    const top = random() * 100;
    const size = 1 + random() * 2.4;
    const inBeam = left > 42 && left < 88;
    const duration = 18 + random() * 28;
    const delay = -random() * 45;
    const dx = random() * 70 - 35;
    const rise = -(70 + random() * 170);
    const opacity = inBeam
      ? 0.45 + random() * 0.5
      : 0.08 + random() * 0.16;

    return {
      left: `${left.toFixed(2)}%`,
      size: `${size.toFixed(2)}px`,
      style: {
        "--moonlit-delay": `${delay.toFixed(1)}s`,
        "--moonlit-duration": `${duration.toFixed(1)}s`,
        "--moonlit-dx": `${dx.toFixed(0)}px`,
        "--moonlit-opacity": opacity.toFixed(2),
        "--moonlit-rise": `${rise.toFixed(0)}px`,
      } satisfies SceneStyle,
      top: `${top.toFixed(2)}%`,
    };
  });
}

const DUST = buildDust();

const LEAVES = [
  {
    delay: "-6s",
    duration: "34s",
    dx: "26vw",
    dy: "-48vh",
    left: "18%",
    top: "62%",
  },
  {
    delay: "-24s",
    duration: "46s",
    dx: "-20vw",
    dy: "34vh",
    left: "72%",
    top: "34%",
  },
  {
    delay: "-41s",
    duration: "58s",
    dx: "14vw",
    dy: "-62vh",
    left: "52%",
    top: "78%",
  },
] as const;

function BookcaseArtwork({ bookcase }: { bookcase: Bookcase }) {
  return (
    <div
      className={`moonlit-library__bookcase moonlit-library__bookcase--${bookcase.position}`}
    >
      {bookcase.shelves.map((shelf, shelfIndex) => (
        <div className="moonlit-library__shelf" key={shelfIndex}>
          <div className="moonlit-library__shelf-books">
            {shelf.map((item, itemIndex) => {
              if (item.kind === "gap") {
                return (
                  <span
                    className="moonlit-library__book-gap"
                    key={itemIndex}
                    style={{ width: item.width }}
                  />
                );
              }

              return (
                <span
                  className={[
                    "moonlit-library__book",
                    `moonlit-library__book--tone-${item.tone}`,
                    item.gilt ? "is-gilt" : "",
                    item.tilt ? "is-tilted" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={itemIndex}
                  style={{
                    height: item.height,
                    transform: item.tilt ?? undefined,
                    width: item.width,
                  }}
                />
              );
            })}
          </div>
          <div className="moonlit-library__shelf-board" />
        </div>
      ))}
    </div>
  );
}

export default function MoonlitLibraryArtwork({
  locked = false,
  tokens,
  variant,
}: ThemeArtworkProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        "moonlit-library",
        `moonlit-library--${variant}`,
        locked ? "is-locked" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={tokens as ThemeArtworkStyle}
    >
      <div className="moonlit-library__aisle">
        {BOOKCASES.map((bookcase) => (
          <BookcaseArtwork bookcase={bookcase} key={bookcase.position} />
        ))}
      </div>
      <span className="moonlit-library__veil" />
      <span className="moonlit-library__beam moonlit-library__beam--wide" />
      <span className="moonlit-library__beam moonlit-library__beam--thin" />
      <span className="moonlit-library__floorpool" />
      <div className="moonlit-library__dust">
        {DUST.map((particle, index) => (
          <span
            key={index}
            style={{
              ...particle.style,
              height: particle.size,
              left: particle.left,
              top: particle.top,
              width: particle.size,
            }}
          />
        ))}
      </div>
      <div className="moonlit-library__pages">
        {LEAVES.map((leaf) => (
          <span
            className="moonlit-library__leaf"
            key={leaf.delay}
            style={
              {
                "--moonlit-delay": leaf.delay,
                "--moonlit-duration": leaf.duration,
                "--moonlit-dx": leaf.dx,
                "--moonlit-dy": leaf.dy,
                left: leaf.left,
                top: leaf.top,
              } as SceneStyle
            }
          />
        ))}
      </div>
      <span className="moonlit-library__vignette" />
      {locked && <span className="moonlit-library__lock">Locked</span>}
    </div>
  );
}
