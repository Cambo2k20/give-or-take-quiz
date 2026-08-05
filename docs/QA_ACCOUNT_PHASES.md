# QA account phases

## Phase 2: real identity, scoreless play

An allowlisted QA account may own a normal `public.profiles` identity, including
a display name and built-in avatar. It remains unable to submit competitive
scores, initialise real progression, use social competition, or create and
submit challenges.

The permanent QA marker is derived from the server allowlist. It must never be
inferred from an email address, display name, avatar key, or client storage.

## Phase 3: simulated progression and rank cosmetics

Phase 3 must replace direct rank-badge avatar updates with a validated,
owner-only server RPC:

- ordinary callers may equip only rank badges earned from real progression;
- QA callers may equip only badges unlocked by effective simulated QA rank;
- built-in avatars remain available to either account type;
- invalid and unknown avatar keys are rejected; and
- featured public-profile badge validation uses the same effective-progression
  rule.

Do not add a client-only QA bypass for rank badges or featured badges.
