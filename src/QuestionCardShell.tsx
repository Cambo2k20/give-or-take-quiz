import type { CSSProperties, ReactNode, Ref } from "react";
import { CATEGORY_BY_ID } from "../lib/categories";
import type { Question } from "../lib/types";
import { CATEGORY_ARTWORK } from "./categoryArtwork";
import { CategoryIcon } from "./CategoryIcon";
import { pickQuestionArt } from "./questionArt";
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
  answered?: boolean;
  children: ReactNode;
};

export function QuestionCardShell({
  question,
  progressLabel,
  headingRef,
  answered = false,
  children,
}: QuestionCardShellProps) {
  const category = CATEGORY_BY_ID[question.category];
  const artwork = CATEGORY_ARTWORK[question.category];
  const variant = questionArtworkVariant(question.id);
  const PrimaryArtwork = artwork.icons[variant];
  const SecondaryArtwork = artwork.icons[(variant + 1) % artwork.icons.length];
  const illustratedArt = pickQuestionArt(question);
  const progressParts = progressLabel.match(/^(Question)\s+(.+)$/i);

  return (
    <article
      className={`question-card theme-${question.category}${answered ? " is-answered" : ""}`}
      data-artwork-variant={variant}
      data-category={question.category}
    >
      <div
        className={`question-card-artwork is-variant-${variant}`}
        aria-hidden="true"
        key={question.id}
      >
        {illustratedArt ? (
          <>
            <span
              className="question-card-artwork-mask question-card-artwork-primary"
              style={
                {
                  "--art-url": `url(${illustratedArt.primary})`,
                } as CSSProperties
              }
            />
            <span
              className="question-card-artwork-mask question-card-artwork-secondary"
              style={
                {
                  "--art-url": `url(${illustratedArt.secondary})`,
                } as CSSProperties
              }
            />
          </>
        ) : (
          <>
            <PrimaryArtwork
              className="question-card-artwork-primary"
              weight="thin"
            />
            <SecondaryArtwork
              className="question-card-artwork-secondary"
              weight="light"
            />
          </>
        )}
      </div>

      <header className="question-card-header">
        <span className="question-card-category">
          <span className="question-card-category-icon-shell">
            <CategoryIcon
              category={question.category}
              className="question-card-category-icon"
            />
          </span>
          <span className="question-card-category-copy">
            <span className="question-card-category-name">{category.label}</span>
            <span className="question-tag">{subtypeLabel(question)}</span>
          </span>
        </span>
        <span className="question-card-counter" aria-label={progressLabel}>
          {progressParts ? (
            <>
              <span className="question-card-counter-label">
                {progressParts[1]}
              </span>
              <span className="question-card-counter-value">
                {progressParts[2]}
              </span>
            </>
          ) : (
            progressLabel
          )}
        </span>
      </header>

      <h1 ref={headingRef} tabIndex={-1}>
        {question.prompt}
      </h1>
      {children}
    </article>
  );
}
