# Rezhim: spec (v4, from scratch)

Written on 2026-11-09 from the user's answers in chat and his earlier notes.

The previous version was deleted: it was confusing, ugly, had the wrong logic and ignored the user's requests.
- Start from zero, with no migration of old data.
- Don't recreate the old app.
- Don't bring back features that are not listed here.

## Goal and core principle
- Help the user get his sleep schedule back:
  - go to bed earlier step by step until the target;
  - take two daily doses on time and never twice;
  - wake up on time with phone alarms plus a Mac alarm series;
  - keep notes for the doctor.
- The user can't start things until they are urgent (see USER.md). The app creates urgency early:
  - one clear next action;
  - a live countdown with seconds;
  - big action buttons;
  - nothing extra.

## Scope
In:
1. Sleep plan: bedtime and wake time for each night.
2. "Be ready by": a fixed daily deadline.
3. Meds: two doses a day, with a history.
4. Alarms:
   - a list of phone alarms to set;
   - an alarm series that rings from a Chrome tab on the Mac.
5. Notes for the doctor.
6. Statistics.

Out (don't build):
- departures;
- calendar export;
- server push;
- accounts and sync.

Unclear, to confirm first: tasks / everyday to-dos (C3) and the lenience budget (C2).

## Confirm first: conflicts between today's chat and the earlier notes
Ask these first. Default = today's chat (the latest), unless the user says otherwise.

- **C1. Step and target.**
  - Today's chat:
    - tonight's bedtime 04:00;
    - then 1 hour earlier per night: 04:00 → 03:00 → 02:00 → 01:00;
    - target bedtime 01:00;
    - night dose 1 h before bedtime (target 00:00);
    - day dose usually 12:00–14:00.
  - Earlier notes:
    - first night at 02:30;
    - then 30 min earlier per night;
    - target: sleep 00:00, wake 08:00, night dose 23:00, day dose 12:00;
    - "dose times move 30 min per day, never abruptly".
  - Which one? (The step for the plan and for the dose times can differ: ask.)
- **C2. Lenience budget** (the earlier notes, described below).
  - Today the user said the old logic was wrong and confusing.
  - Options:
    - (a) build it as described;
    - (b) a simpler version;
    - (c) skip it: the plan never moves by itself, plus one "restart from my real bedtime" button.
- **C3. Everyday tasks.**
  - The earlier notes want help with daily tasks too, in a "what to do now" flow.
  - Today he did not pick tasks.
  - Default: no tasks in v4. The "next action" covers only sleep, doses, getting ready and alarms.
- **C4. Mac alarm.**
  - Today he picked phone alarms. The earlier notes call the Mac alarm series important.
  - Default: build both.

## Sleep plan
- The starting point is set in the app on first launch:
  - the last bedtime;
  - the time of the last night dose;
  - the first planned night.
  - Example: on Mon 9 Nov he went to bed at about 07:30 and took the night dose then.
- Then each night moves earlier by the step (C1) until the target, and stays there.
- Bedtimes after midnight belong to the previous evening's date.
  - Example: going to bed at 04:00 on Nov 10 is "the night of Nov 9".
  - Pick a day boundary that works with bedtimes as late as 07:30.
- The plan is strict.
  - A late night does not move the plan: he still wakes at the planned time.
  - The wake time is the anchor. Sleep pressure fixes the next night.
  - The app says this plainly and kindly, e.g. «Встань по плану — сегодня ночью уснёшь легче».
- Wake time: open question (Q1).

### Lenience budget (only if C2 says so)
The user expects to break the schedule sometimes. He also fears that easy adjustments become an excuse («поблажка»).
- **Budget:** 1 lenience per rolling 7 days. There are two kinds, each costs 1:
  1. **Repeat step:** tomorrow keeps today's times.
  2. **Schedule broke: «Я лёг в HH:MM»:**
     - rebuild the plan from the real bedtime;
     - next night = real bedtime − 2:30, rounded to :00 or :30, never earlier than the target;
     - then the normal step per night.
- **Reason:** every lenience needs a one-tap reason (плохо спал / болел / сбился режим / другое). It is logged.
- **Plan screen:** leniences left, when the next one is available, the history.
- **Budget at 0:** the buttons are disabled, with the text «следующая через N дн.».
- **Emergency restart:**
  - hidden at the bottom of the settings, always available;
  - needs a typed confirmation word;
  - always logged;
  - after it, no lenience for 14 days.
- **Optional hint:** after 2 nights in a row more than 1 h past the planned bedtime, suggest (don't force) the "schedule broke" lenience.

## Be ready by («Быть готовым к»)
- One fixed time: a single setting, now 12:10 (university). No today/tomorrow switch.
- On the main screen, show only the result: when to wake up and when to start getting ready.
- Days without university: a per-weekday toggle.

## Meds
- Two doses a day: "day" and "night". The user types the medication names in the app (stored on the device).
- Two big buttons: day and night.
  - A tap logs the current time.
  - No manual time entry, no «выпил в другое время».
- Night dose: tied to bedtime (C1).
- Day dose: at least 8 h after the last logged night dose (ideally 8–9 h).
  - Show «дневная можно с HH:MM», computed from the logged night dose time.
  - Example: night dose at 07:30 → day dose not before 15:30, default 16:00.
- Never twice. Warn and ask to confirm if:
  - he taps a dose less than 8 hours after the last one;
  - or that dose is already logged for this day.
- History by day on the same page: date, day dose time, night dose time.
  - Pretty, intuitive statistics: on time vs late, at a glance.

## Main screen
- On top: the one next action with a big live countdown (seconds). For example:
  - «До таблетки 0:42:10»;
  - «До сна 2:15:03»;
  - «Начинай собираться через …».
- Then time left until bedtime and until the next dose, both always visible.
- Below, on scroll: statistics (Q3).
- Understandable in 2 seconds. Few buttons, no clutter.

## Alarms
### Phone
- The user sets normal repeating phone alarms himself: 3–4 in the morning.
- The app shows exactly which ones to set.
  - The times change while the plan moves. Show when to update them.
  - Once the target is reached, show a fixed repeating set.

### Mac (Chrome tab)
- This is the fallback when he is too tired to set phone alarms.
- Wake-up series:
  - set the wake time (e.g. 11:20);
  - buttons add alarms before and after it: −30, −20, −10, +10, +15 min;
  - each alarm rings 4 min, then 1 min of silence, then the next one;
  - each alarm has its own sound, so he really wakes up;
  - «Я встал» stops the whole series.
- Needed:
  - Wake Lock;
  - audio unlock with a tap, and a sound test;
  - short instructions:
    - add the site to chrome://settings/performance → "Always keep these sites active";
    - open it in its own window and pin the tab;
    - keep the Mac on the charger with the anti-sleep app running;
    - use the Mac speakers, with the volume up.

### No sync
- He logs doses and notes on the phone and runs the alarms on the Mac. Nothing is synced.
- Keep the plan deterministic from a few settings, so both devices show the same times.
- Give a simple way to copy the settings from the phone to the Mac when they change (e.g. copy/paste text).

## Doctor notes
- A quick note, with the date and time added automatically.
- A list of all notes.
- A "Copy all" button: plain text with dates.

## Design
- The old design was ugly and hard to understand. This time the look matters a lot: beautiful, calm, polished, readable at night.
- Mobile first: a big phone, about 360–430 px wide. It must also look good on the Mac (the alarm screen especially).
- Smooth and fast: light animations, no jank.
- Before building, agree on the structure and the direction (see "Order of work").

## Order of work
1. Read CLAUDE.md, this file and USER.md. Then send **one** message with:
   - the numbered questions: C1–C4 first, then the open questions below, then anything else unclear;
   - the proposed screen structure (which screens, what is on each), as a short list;
   - 3–5 visual references (real sleep or meds apps, or well-known design examples), each with a link and one line on why it fits.
2. After the user's voice answer:
   - write the decisions into "Decisions" below;
   - build everything to the end: logic → screens → meds → alarms → notes → PWA → deploy.
   - Commit and push as you go.
3. One check pass (CLAUDE.md "Checks"), fix, push. Then a short report to the user in Russian:
   - what is done;
   - how to install it on the phone;
   - how to set up the Mac alarm.

## Open questions (after C1–C4)
1. Wake time: bedtime + 8 h, or from «Быть готовым к» minus the prep time? How long does getting ready take?
2. Which days have university (when «Быть готовым к» applies)?
3. Which statistics? (E.g. real vs planned bedtime over 7 days, doses on time, streak.)
4. Reminders for doses and bedtime: phone alarms too, or only the countdown on screen?
5. A wind-down reminder before bed (e.g. 30 min: teeth, phone away), or not?
6. Look: dark theme? Any apps he likes the look of?

## Decisions
(Add the user's answers here.)
