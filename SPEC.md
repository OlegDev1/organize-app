# Rezhim: spec (v4, from scratch)

Written on 2026-11-09 from the user's own answers.

The previous version was deleted: it was confusing, ugly, had the wrong logic and ignored the user's requests.
- Start from zero.
- Don't recreate the old app.
- Don't bring back old features that are not listed here.

## Goal
Help the user get his sleep schedule back:
- go to bed earlier step by step until the target;
- take two daily doses on time and never twice;
- wake up with the phone's alarms;
- keep notes for the doctor.

The user procrastinates. One glance at the app must show how much time is left.

## Scope
In:
1. Sleep plan: when to go to bed each night, plus wake-up times for the phone's alarms.
2. Meds: two doses a day.
3. Notes for the doctor.
4. Statistics, below the main screen.

Out (don't build):
- tasks or to-dos;
- departures;
- the "lenience budget";
- an in-browser alarm that rings;
- calendar export;
- custom sounds.

## Sleep plan
- The plan starts from the user's real bedtime, not from a fixed table.
  - The user can set the starting point in the app: a date and that night's bedtime.
- The starting state on 2026-11-09:
  - he went to bed at 07:00 this morning;
  - tonight (the night after 2026-11-09) he goes to bed at 04:00.
- Then 1 hour earlier each night: 04:00 → 03:00 → 02:00 → 01:00.
  - The target bedtime is 01:00. After that it stays at 01:00.
- Bedtimes after midnight belong to the previous evening's date.
  - Example: going to bed at 04:00 on Nov 10 is "the night of Nov 9".
  - Pick a day boundary that works with bedtimes as late as 07:00.
- Wake time: open question (Q1).

## Meds
- Two doses a day: "day" and "night".
  - The user types the medication names in the app. They are stored on the device and migrated from the old data.
- Night dose: 1 hour before bedtime.
  - Tonight it is at 03:00 (bedtime 04:00).
  - At the target it is at 00:00 (bedtime 01:00).
- Day dose: flexible, usually 12:00–14:00.
- There must be at least 8 hours between any two doses.
- Never twice. Warn and ask to confirm if:
  - he marks a dose less than 8 hours after the last one;
  - or that dose is already marked for this day.
- Marking a dose takes one tap. The time is set to now and can be edited.

## Main screen
- Big countdowns:
  - time left until bedtime;
  - time left until the next dose (which dose, and at what time).
- Below, on scroll: statistics (what exactly: Q3).
- Understandable in 2 seconds. Few buttons, no clutter.

## Alarms
- Wake-ups use the phone's own alarms.
- The app shows the list of alarms to set for the next days.
- The user can also ask Claude in the mobile app to set them.

## Doctor notes
- Quick note with the date and time added automatically.
- A list of all notes.
- A "Copy all" button: plain text with dates.

## Data and migration
- localStorage only. The new state goes under a new key (e.g. `rezhim-v4`). Never delete the old keys.
- On first load, read the old data from the same origin:
  - `rezhim-v1` with `v: 3` (last version):
    `{ v: 3, doses: [{ id, t, kind: 'day' | 'night' }], notes: [{ id, t, text }], marks: { 'YYYY-MM-DD': { wake?, ready?, bed? } }, settings: { meds: { day, night }, ... }, ... }`
  - `rezhim-v1` without `v` (v2): `doses`, `notes` and `meds: { day, night }` sit at the top level.
  - `rezhim-v2-backup`: a copy of the v2 data.
  - `t` and the `marks` values are epoch ms.
- What to keep:
  - the dose log;
  - the notes;
  - the medication names;
  - `marks.bed` and `marks.wake` (real sleep times, useful for statistics).
- Drop everything else (tasks, leniences, alarm settings).
- Validate the old data, and skip broken entries without crashing.

## Design
- The old design was ugly and hard to understand. Before building the UI:
  1. Propose the screen structure in a short list (which screens, what is on each). The user confirms.
  2. Find 3–5 visual references: real sleep or meds apps, or well-known design examples. Show each with a link and one line on why it fits. The user picks a direction.
  3. Only then build the screens.
- Mobile first (360 px wide). It must also look fine on the Mac.

## Order of work
1. Read CLAUDE.md and this file. Ask the open questions below, plus anything else that is unclear, as one numbered list.
2. Agree on the screen structure.
3. Agree on the design direction (references).
4. Build the logic and the screens.
5. Add the data migration.
6. Deploy, do a quick check, then report to the user in Russian.

## Open questions (ask first)
1. Wake time: bedtime + 8 h (12:00 → 11:00 → 10:00 → 09:00)? Or something else?
2. If he goes to bed later than planned, what next night? The actual bedtime − 1 h, or stick to the schedule?
3. Which statistics? (E.g. actual vs planned bedtime over the last 7 days, doses on time, streak.)
4. Reminders for doses and bedtime: phone alarms too, or a notification while the app is open?
5. Does data need to move between the phone and the Mac (copy/paste export like before), or not?
6. A wind-down reminder before bed (e.g. 30 min: teeth, phone away), or not?
7. Look: dark theme? Any apps he likes the look of?

## Decisions
(Add the user's answers here.)
