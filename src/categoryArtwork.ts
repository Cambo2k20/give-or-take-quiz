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
import type { QuestionCategory } from "../lib/categories";

/**
 * The icons that stand for each subject, shared by the question card and
 * every place a subject is named outside a round.
 *
 * The first icon is the subject's signature: it is what the card header, the
 * mode chooser and the progress screens all show, so a subject looks the same
 * before, during and after play. The other two only vary the large background
 * artwork on a card, keyed off the question id.
 */

type CategoryArtworkDefinition = {
  variant: readonly [Icon, Icon, Icon];
  icons: readonly [Icon, Icon, Icon];
};

export const CATEGORY_ARTWORK = {
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

/** The single icon that represents a subject wherever it is named. */
export function categoryIcon(category: QuestionCategory): Icon {
  return CATEGORY_ARTWORK[category].icons[0];
}
