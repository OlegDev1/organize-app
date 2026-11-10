<script lang="ts">
  import Hero from '../components/Hero.svelte'
  import PhoneAlarms from '../components/PhoneAlarms.svelte'
  import Timeline from '../components/Timeline.svelte'
  import { rateSleep } from '../lib/actions.ts'
  import { clock } from '../lib/clock.svelte.ts'
  import { db, getPlan } from '../lib/db.svelte.ts'
  import { isNative } from '../lib/native.svelte.ts'
  import { HOUR, shiftKey } from '../lib/time.ts'
  import { computeToday, phoneAlarms } from '../lib/today.ts'

  const today = $derived(computeToday(getPlan(), db, clock.now))
  const alarms = $derived(phoneAlarms(getPlan(), today.cycle))

  // Stop point: the whole screen turns red, not only the card.
  $effect(() => {
    document.documentElement.classList.toggle('alert', today.hero.alert === true)
    return () => document.documentElement.classList.remove('alert')
  })
  // In the Android app alarms move by themselves; on the web he moves the phone's alarms by hand.
  const changed = $derived(!isNative && alarms.some((a) => a.was != null) && db.alarmsAck !== today.cycle)

  // «Как спал?» for the night that just ended, until the afternoon.
  const toRate = $derived.by(() => {
    const s = db.sleeps.find((x) => x.night === shiftKey(today.cycle, -1))
    return s && s.wake != null && !s.rating && clock.now < s.wake + 8 * HOUR ? s : undefined
  })
  const ratings = [
    { v: 1, label: 'Плохо' },
    { v: 2, label: 'Нормально' },
    { v: 3, label: 'Хорошо' },
  ] as const
</script>

<div class="stack">
  <Hero hero={today.hero} now={clock.now} />
  {#if toRate}
    {@const id = toRate.id}
    <div class="card rate">
      <p>Как спал?</p>
      <div class="three">
        {#each ratings as r (r.v)}<button onclick={() => rateSleep(id, r.v)}>{r.label}</button>{/each}
      </div>
    </div>
  {/if}
  {#if changed && !today.asleep}
    <PhoneAlarms {alarms} onack={() => (db.alarmsAck = today.cycle)} />
  {/if}
</div>

<h2 class="section">Сегодня</h2>
<Timeline rows={today.rows} now={clock.now} />

<style>
  .rate p {
    font-size: 17px;
    font-weight: 600;
    margin-bottom: 12px;
  }

  .three {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .three button {
    min-height: 52px;
    border-radius: 14px;
    border: 1.5px solid var(--line);
    font-weight: 600;
    transition: transform 0.12s ease;
  }

  .three button:active {
    transform: scale(0.97);
    background: var(--accent-soft);
  }
</style>
