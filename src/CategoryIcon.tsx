import type { CSSProperties } from "react";
import type { GameMode } from "../lib/types";
import animalsIcon from "./assets/category-icons/animals.png";
import dinosaursIcon from "./assets/category-icons/dinosaurs.png";
import gamesIcon from "./assets/category-icons/games.png";
import geographyIcon from "./assets/category-icons/geography.png";
import historyIcon from "./assets/category-icons/history.png";
import mixedIcon from "./assets/category-icons/mixed.png";
import moviesIcon from "./assets/category-icons/movies.png";
import populationIcon from "./assets/category-icons/population.png";
import scienceIcon from "./assets/category-icons/science.png";
import spaceIcon from "./assets/category-icons/space.png";
import technologyIcon from "./assets/category-icons/technology.png";

const CATEGORY_ICON_URLS: Record<GameMode, string> = {
  animals: animalsIcon,
  dinosaurs: dinosaursIcon,
  games: gamesIcon,
  geography: geographyIcon,
  history: historyIcon,
  mixed: mixedIcon,
  movies: moviesIcon,
  population: populationIcon,
  science: scienceIcon,
  space: spaceIcon,
  technology: technologyIcon,
};

type CategoryIconProps = {
  category: GameMode;
  className?: string;
};

export function CategoryIcon({ category, className }: CategoryIconProps) {
  return (
    <span
      className={`category-icon${className ? ` ${className}` : ""}`}
      style={
        {
          "--category-icon-url": `url(${CATEGORY_ICON_URLS[category]})`,
        } as CSSProperties
      }
      aria-hidden="true"
    />
  );
}
