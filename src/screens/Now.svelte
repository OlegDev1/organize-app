<script lang="ts">
  import Hero from '../components/Hero.svelte'
  import PhoneAlarms from '../components/PhoneAlarms.svelte'
  import Timeline from '../components/Timeline.svelte'
  import { clock } from '../lib/clock.svelte.ts'
  import { db, getPlan } from '../lib/db.svelte.ts'
  import { computeToday, phoneAlarms } from '../lib/today.ts'

  const today = $derived(computeToday(getPlan(), db, clock.now))
  const alarms = $derived(phoneAlarms(getPlan(), today.cycle))
  const changed = $derived(alarms.some((a) => a.was != null) && db.alarmsAck !== today.cycle)
</script>

<div class="stack">
  <Hero hero={today.hero} now={clock.now} />
  {#if changed && !today.asleep}
    <PhoneAlarms {alarms} onack={() => (db.alarmsAck = today.cycle)} />
  {/if}
</div>

<h2 class="section">Сегодня</h2>
<Timeline rows={today.rows} now={clock.now} />
