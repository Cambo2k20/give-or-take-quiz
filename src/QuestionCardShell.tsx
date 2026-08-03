import type { ReactNode, Ref } from "react";
import { CATEGORY_BY_ID } from "../lib/categories";
import type { Question } from "../lib/types";
import { CATEGORY_ARTWORK } from "./categoryArtwork";
import { CategoryIcon } from "./CategoryIcon";
import { subtypeLabel } from "./questionText";

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
          <CategoryIcon
            category={question.category}
            className="question-card-category-icon"
          />
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
