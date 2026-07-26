Below is the document text only—I have not opened or changed any files.

# Adding questions to category banks

This guide covers questions used in normal category and Mixed rounds. Daily questions follow a separate process and belong in `data/daily-sets.json`.

## Source of truth

Category questions originate in the project’s Postgres database.

Do not edit `lib/questions.generated.ts` manually. It is generated from the database and will be overwritten the next time the question generator runs.

The normal workflow is:

```text
Research → Add database record → Generate TypeScript → Validate → Test
```

## 1. Choose the category

Use one of the existing category identifiers:

- `population`
- `history`
- `geography`
- `science`
- `animals`
- `space`
- `technology`
- `movies`

Mixed mode draws from these categories automatically. It does not have its own question records.

Before adding several questions, check the existing distribution. Prefer categories with smaller banks unless the new questions are especially strong.

## 2. Research the answer

Every question needs a reliable source.

Prefer:

- Government and intergovernmental organisations
- Universities and museums
- Scientific organisations
- Official company or product documentation
- Reputable primary datasets
- Original box-office or industry databases where appropriate

Avoid search-result snippets, unsourced list articles, social posts, and pages that merely repeat another source.

Confirm:

- The source directly supports the answer.
- The source uses the same unit as the question.
- The answer has not changed since the source was published.
- Any relevant date, geography, definition or measurement method is clear.
- The source URL points to the supporting page, not a homepage or search result.

## 3. Write the question

A good question should have one defensible numeric answer.

Keep the prompt:

- Understandable without specialist knowledge
- Specific about place, date and measurement
- Free of clues that reveal the approximate answer
- Short enough to scan during play
- Distinct from existing questions

Avoid ambiguous wording such as:

- “How big is…?” without specifying area, height, length or mass
- “How many people live…?” without specifying the relevant year
- “How much did it make?” without specifying worldwide or domestic gross
- Measurements whose definition varies substantially between sources

Use the project’s established unit and formatting conventions. Copy a comparable existing database record as the structural template.

## 4. Choose the playable range

The slider range should make the question challenging but fair.

The correct answer must fall inside the configured range. The endpoints should:

- Represent plausible guesses
- Avoid making the answer obvious
- Leave useful space on both sides of the answer
- Use the appropriate linear, logarithmic or other supported scale
- Match the question’s unit exactly

Test unusually large, small, negative or fractional values carefully.

## 5. Add the database record

Create the question in the project’s questions table using a comparable existing record as a template.

Ensure that:

- The ID is unique and stable.
- The category is valid.
- The prompt is unique.
- The numeric answer is stored in the expected unit.
- The slider bounds and scale are valid.
- The explanation is concise and useful.
- The source title identifies the publisher clearly.
- The source URL directly supports the answer.

Do not reuse an ID from a removed question. IDs may be referenced by local question-history data.

## 6. Regenerate the bundled question bank

With the required database environment variables configured, run:

```bash
npm run generate:questions
```

This regenerates:

```text
lib/questions.generated.ts
```

Review the generated diff. It should contain the intended questions and no unexpected removals or unrelated data changes.

Never tidy or correct the generated file manually. Correct the database record and regenerate it instead.

## 7. Validate the data

Run:

```bash
npm run validate:data
```

Validation should reject problems such as invalid categories, duplicate identifiers, malformed records, invalid ranges and conflicts with the daily-question bank.

Fix validation failures in the database, regenerate, and run validation again.

## 8. Test the questions in play

Start the development server:

```bash
npm run dev
```

Play the affected category and check:

- The prompt reads naturally.
- The unit and slider labels are correct.
- The answer appears at the expected position.
- The valid range feels fair.
- The verdict and explanation make sense.
- The source link opens the intended supporting page.
- Mobile-width text does not overflow.
- The question also behaves correctly when selected by Mixed mode.

Because selection is random and avoids recently seen questions, temporarily targeted automated coverage may be easier than repeatedly refreshing to find one new question.

## 9. Run the complete checks

Before committing:

```bash
npm run lint
npm test
npm run build
```

All three must pass.

## Final checklist

- [ ] Existing category identifier used
- [ ] Unique, stable question ID
- [ ] Unique and unambiguous prompt
- [ ] Answer verified against a primary or authoritative source
- [ ] Date, geography and measurement definition are explicit
- [ ] Answer and slider use the same unit
- [ ] Answer falls inside the configured range
- [ ] Range is challenging but fair
- [ ] Explanation adds useful context
- [ ] Direct source URL included
- [ ] Generated file updated through the generator
- [ ] Generated diff reviewed
- [ ] Data validation passes
- [ ] Question checked in its category and Mixed mode
- [ ] Lint, tests and production build pass