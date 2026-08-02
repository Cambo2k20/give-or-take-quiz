import type { ReactNode, Ref } from "react";
import type { Icon } from "@phosphor-icons/react";
import { AtomIcon } from "@phosphor-icons/react/dist/csr/Atom";
import { BirdIcon } from "@phosphor-icons/react/dist/csr/Bird";
import { BoneIcon } from "@phosphor-icons/react/dist/csr/Bone";
import { BuildingsIcon } from "@phosphor-icons/react/dist/csr/Buildings";
import { ButterflyIcon } from "@phosphor-icons/react/dist/csr/Butterfly";
import { ChartBarIcon } from "@phosphor-icons/react/dist/csr/ChartBar";
import { CircuitryIcon } from "@phosphor-icons/react/dist/csr/Circuitry";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { CpuIcon } from "@phosphor-icons/react/dist/csr/Cpu";
import { DiceFiveIcon } from "@phosphor-icons/react/dist/csr/DiceFive";
import { FilmReelIcon } from "@phosphor-icons/react/dist/csr/FilmReel";
import { FilmStripIcon } from "@phosphor-icons/react/dist/csr/FilmStrip";
import { FlaskIcon } from "@phosphor-icons/react/dist/csr/Flask";
import { FootprintsIcon } from "@phosphor-icons/react/dist/csr/Footprints";
import { GameControllerIcon } from "@phosphor-icons/react/dist/csr/GameController";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/dist/csr/GlobeHemisphereWest";
import { HourglassIcon } from "@phosphor-icons/react/dist/csr/Hourglass";
import { MapTrifoldIcon } from "@phosphor-icons/react/dist/csr/MapTrifold";
import { MicroscopeIcon } from "@phosphor-icons/react/dist/csr/Microscope";
import { MountainsIcon } from "@phosphor-icons/react/dist/csr/Mountains";
import { PawPrintIcon } from "@phosphor-icons/react/dist/csr/PawPrint";
import { PlanetIcon } from "@phosphor-icons/react/dist/csr/Planet";
import { PopcornIcon } from "@phosphor-icons/react/dist/csr/Popcorn";
import { RobotIcon } from "@phosphor-icons/react/dist/csr/Robot";
import { RocketLaunchIcon } from "@phosphor-icons/react/dist/csr/RocketLaunch";
import { ScrollIcon } from "@phosphor-icons/react/dist/csr/Scroll";
import { ShootingStarIcon } from "@phosphor-icons/react/dist/csr/ShootingStar";
import { SkullIcon } from "@phosphor-icons/react/dist/csr/Skull";
import { TrophyIcon } from "@phosphor-icons/react/dist/csr/Trophy";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/csr/UsersThree";
import {
  CATEGORY_BY_ID,
  type QuestionCategory,
} from "../lib/categories";
import type { Question } from "../lib/types";
import { subtypeLabel } from "./questionText";

type CategoryArtworkDefinition = {
  variant: readonly [Icon, Icon, Icon];
  icons: readonly [Icon, Icon, Icon];
};

const CATEGORY_ARTWORK = {
  population: {
    variant: [UsersThreeIcon, BuildingsIcon, ChartBarIcon],
    icons: [UsersThreeIcon, BuildingsIcon, ChartBarIcon],
  },
  history: {
    variant: [ClockCounterClockwiseIcon, HourglassIcon, ScrollIcon],
    icons: [ClockCounterClockwiseIcon, HourglassIcon, ScrollIcon],
  },
  geography: {
    variant: [GlobeHemisphereWestIcon, MountainsIcon, MapTrifoldIcon],
    icons: [GlobeHemisphereWestIcon, MountainsIcon, MapTrifoldIcon],
  },
  science: {
    variant: [AtomIcon, FlaskIcon, MicroscopeIcon],
    icons: [AtomIcon, FlaskIcon, MicroscopeIcon],
  },
  animals: {
    variant: [PawPrintIcon, BirdIcon, ButterflyIcon],
    icons: [PawPrintIcon, BirdIcon, ButterflyIcon],
  },
  space: {
    variant: [PlanetIcon, RocketLaunchIcon, ShootingStarIcon],
    icons: [PlanetIcon, RocketLaunchIcon, ShootingStarIcon],
  },
  technology: {
    variant: [CpuIcon, CircuitryIcon, RobotIcon],
    icons: [CpuIcon, CircuitryIcon, RobotIcon],
  },
  movies: {
    variant: [FilmReelIcon, FilmStripIcon, PopcornIcon],
    icons: [FilmReelIcon, FilmStripIcon, PopcornIcon],
  },
  dinosaurs: {
    variant: [BoneIcon, FootprintsIcon, SkullIcon],
    icons: [BoneIcon, FootprintsIcon, SkullIcon],
  },
  games: {
    variant: [GameControllerIcon, DiceFiveIcon, TrophyIcon],
    icons: [GameControllerIcon, DiceFiveIcon, TrophyIcon],
  },
} as const satisfies Record<QuestionCategory, CategoryArtworkDefinition>;

/** Stable across browsers and renders; changing question order never changes art. */
export function questionArtworkVariant(questionId: string): 0 | 1 | 2 {
  let hash = 0x811c9dc5;
  for (let index = 0; index < questionId.length; index += 1) {
    hash = Math.imul(hash ^ questionId.charCodeAt(index), 0x01000193);
  }
  return (hash >>> 0) % 3 as 0 | 1 | 2;
}

type QuestionCardShellProps = {
  question: Question;
  progressLabel: string;
  headingRef: Ref<HTMLHeadingElement>;
  children: ReactNode;
};

export function QuestionCardShell({
  question,
  progressLabel,
  headingRef,
  children,
}: QuestionCardShellProps) {
  const category = CATEGORY_BY_ID[question.category];
  const artwork = CATEGORY_ARTWORK[question.category];
  const variant = questionArtworkVariant(question.id);
  const PrimaryArtwork = artwork.icons[variant];
  const SecondaryArtwork = artwork.icons[(variant + 1) % artwork.icons.length];
  const HeaderCategoryIcon = artwork.icons[0];

  return (
    <article
      className={`question-card theme-${question.category}`}
      data-artwork-variant={variant}
      data-category={question.category}
    >
      <div
        className={`question-card-artwork is-variant-${variant}`}
        aria-hidden="true"
        key={question.id}
      >
        <PrimaryArtwork
          className="question-card-artwork-primary"
          weight="thin"
        />
        <SecondaryArtwork
          className="question-card-artwork-secondary"
          weight="light"
        />
      </div>

      <header className="question-card-header">
        <span className="question-card-category">
          <HeaderCategoryIcon weight="regular" aria-hidden="true" />
          <span>{category.label}</span>
        </span>
        <span className="question-card-counter">{progressLabel}</span>
      </header>

      <span className="question-tag">{subtypeLabel(question)}</span>
      <h1 ref={headingRef} tabIndex={-1}>
        {question.prompt}
      </h1>
      {children}
    </article>
  );
}
