import { appendFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DAILY_RUNWAY_FLOOR_DAYS, dailyRunway } from "../lib/daily";

/**
 * Reports how much daily schedule is left, so the nightly workflow can raise an
 * issue while there is still time to do something about it.
 *
 * Exits 0 even with an empty runway, deliberately. The workflow that calls this
 * also retires expired dailies and republishes the offline bank; failing here
 * would take that down too, and running short three weeks out is no reason to
 * stop shipping today's puzzle. The issue is the alarm, not the exit code.
 *
 * The issue body is written here rather than assembled in the workflow's shell:
 * it is markdown full of backticks and interpolated values, which is a quoting
 * hazard inside a heredoc and perfectly ordinary in a template literal.
 */

const { days, lastCoveredDate } = dailyRunway();
const short = days < DAILY_RUNWAY_FLOOR_DAYS;

const summary =
  days === 0
    ? "No daily set is scheduled for today — players have no puzzle."
    : `${days} day(s) of dailies remain, through ${lastCoveredDate}.`;

console.log(summary);
if (short) {
  console.log(
    `That is below the ${DAILY_RUNWAY_FLOOR_DAYS}-day floor; schedule more sets.`,
  );
}

const bodyPath = join(process.env.RUNNER_TEMP ?? tmpdir(), "daily-runway.md");

writeFileSync(
  bodyPath,
  `${summary}

The last covered date is \`${lastCoveredDate ?? "none"}\`. Opening the app on a
day past that shows no puzzle at all.

To extend the schedule: reserve and schedule questions in Question Lab, export
them into \`data/daily-sets.json\`, then

\`\`\`bash
npm run validate:data && npm run build:daily-sql
npx supabase db query --linked -f supabase/seed-daily.sql
\`\`\`

This issue is rewritten each night by
\`.github/workflows/retire-expired-dailies.yml\`, and closes itself once the
runway is back above ${DAILY_RUNWAY_FLOOR_DAYS} days.
`,
  "utf8",
);

// Consumed by .github/workflows/retire-expired-dailies.yml.
const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  appendFileSync(
    githubOutput,
    [
      `short=${short}`,
      `days=${days}`,
      `summary=${summary}`,
      `body-file=${bodyPath}`,
      "",
    ].join("\n"),
    "utf8",
  );
}
