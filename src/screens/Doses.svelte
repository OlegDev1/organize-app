<script lang="ts">
  import { Check } from '@lucide/svelte'
  import DoseChart from '../components/DoseChart.svelte'
  import { deleteDose, takeDose } from '../lib/actions.ts'
  import { clock } from '../lib/clock.svelte.ts'
  import { db, getPlan } from '../lib/db.svelte.ts'
  import type { DoseKind } from '../lib/model.ts'
  import { doseStats } from '../lib/stats.ts'
  import { countdown, dayLabel, duration, hm, HOUR, MIN, parseKey, shiftKey } from '../lib/time.ts'
  import { activeCycle, dayDoseFrom, doseOf, MIN_GAP } from '../lib/today.ts'

  const plan = $derived(getPlan())
  const now = $derived(clock.now)
  const cycle = $derived(activeCycle(plan, db, now))
  const dayFrom = $derived(dayDoseFrom(plan, db, cycle))
  const nightAt = $derived(plan.night(cycle).nightDose)
  const taken = $derived({ day: doseOf(db, cycle, 'day'), night: doseOf(db, cycle, 'night') })
  const stats = $derived(doseStats(db, cycle))

  function status(kind: DoseKind): { text: string; ready: boolean } {
    const t = taken[kind]
    if (t) return { text: `Принята в ${hm(t.at)}`, ready: false }
    if (kind === 'day') {
      if (now < dayFrom) return { text: `Можно через ${countdown(dayFrom - now)} · с ${hm(dayFrom)}`, ready: false }
      return { text: `Можно: прошло ${duration(now - dayFrom + MIN_GAP)} после ночной`, ready: true }
    }
    if (now < nightAt) return { text: `По плану в ${hm(nightAt)} · через ${countdown(nightAt - now)}`, ready: false }
    return { text: `Пора: по плану была в ${hm(nightAt)}`, ready: true }
  }

  const cards: { kind: DoseKind; title: string }[] = [
    { kind: 'day', title: 'Дневная доза' },
    { kind: 'night', title: 'Ночная доза' },
  ]

  // Days with any dose, newest first.
  const history = $derived(
    [...new Set(db.doses.map((d) => d.cycle))]
      .sort()
      .reverse()
      .slice(0, 60)
      .map((key) => ({
        key,
        day: doseOf(db, key, 'day'),
        night: doseOf(db, key, 'night'),
        before: doseOf(db, shiftKey(key, -1), 'night'),
      })),
  )
</script>

<div class="stack">
  {#each cards as c (c.kind)}
    {@const st = status(c.kind)}
    {@const name = c.kind === 'day' ? db.settings.dayName : db.settings.nightName}
    <section class="card dose" class:done={taken[c.kind]}>
      <div class="head">
        <div>
          <p class="title">{c.title}</p>
          {#if name}<p class="name">{name}</p>{/if}
        </div>
        {#if taken[c.kind]}<span class="ok"><Check size={22} strokeWidth={2.6} /></span>{/if}
      </div>
      <p class="status num" class:ready={st.ready}>{st.text}</p>
      {#if taken[c.kind]}
        <button class="again" onclick={() => takeDose(c.kind)}>Отметить ещё раз</button>
      {:else}
        <button class="btn {st.ready ? 'primary' : 'ghost'}" onclick={() => takeDose(c.kind)}>Принял</button>
      {/if}
    </section>
  {/each}
</div>

<h2 class="section">Статистика за 7 дней</h2>
<div class="tiles">
  <div class="tile"><p class="k">Дней с обеими дозами</p><p class="v num">{stats.both}<small> / 7</small></p></div>
  <div class="tile"><p class="k">Ночная → дневная</p><p class="v num">{@render hours(stats.avgGap)}</p></div>
  <div class="tile"><p class="k">Не меньше 8 ч</p><p class="v num">{stats.gapOk}<small> / {stats.gapCount}</small></p></div>
  <div class="tile"><p class="k">Дней подряд</p><p class="v num">{stats.streak}</p></div>
</div>
{#snippet hours(ms: number | undefined)}
  {#if ms == null}—{:else}{Math.floor(ms / HOUR)}<small> ч </small>{Math.round((ms % HOUR) / MIN)}<small> мин</small>{/if}
{/snippet}
<div class="card chart"><DoseChart days={stats.days} /></div>

<h2 class="section">История</h2>
{#if history.length}
  <div class="card history">
    {#each history as h (h.key)}
      <div class="row">
        <span class="date">{dayLabel(parseKey(h.key))}</span>
        <button class="t num" disabled={!h.day} onclick={() => h.day && deleteDose(h.day.id)}>
          <small>днём</small>{h.day ? hm(h.day.at) : '—'}
        </button>
        <button class="t num" disabled={!h.night} onclick={() => h.night && deleteDose(h.night.id)}>
          <small>ночью</small>{h.night ? hm(h.night.at) : '—'}
        </button>
        {#if h.day && h.before}
          {@const gap = h.day.at - h.before.at}
          <span class="gap num" class:short={gap < MIN_GAP}>после ночной {duration(gap)}</span>
        {/if}
      </div>
    {/each}
    <p class="hint">Нажми на время, чтобы удалить ошибочную отметку.</p>
  </div>
{:else}
  <p class="empty">Здесь появятся дни с отметками доз.</p>
{/if}

<style>
  .dose {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .title {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .name {
    font-size: 15px;
    color: var(--muted);
  }

  .ok {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--accent-soft);
    color: var(--accent);
  }

  .status {
    font-size: 16px;
    color: var(--muted);
  }

  .status.ready {
    color: var(--accent);
    font-weight: 600;
  }

  .done .status {
    color: var(--accent);
    font-weight: 600;
  }

  .again {
    align-self: flex-start;
    font-size: 14px;
    color: var(--muted);
    text-decoration: underline;
    text-underline-offset: 3px;
    padding: 4px 0;
  }

  .chart {
    margin-top: 10px;
    padding: 16px 14px 16px 8px;
  }

  .history {
    padding: 4px 16px 14px;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 70px 70px;
    align-items: center;
    gap: 4px 8px;
    padding: 10px 0;
    border-bottom: 1px solid var(--line);
  }

  .date {
    display: block;
    font-weight: 500;
  }

  .date::first-letter {
    text-transform: uppercase;
  }

  .t {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.2;
  }

  .t small {
    font-size: 11px;
    font-weight: 500;
    color: var(--muted);
  }

  .t:disabled {
    color: var(--faint);
    cursor: default;
  }

  .gap {
    grid-column: 1 / -1;
    font-size: 13px;
    color: var(--muted);
  }

  .gap.short {
    color: var(--late);
  }

  .hint,
  .empty {
    font-size: 14px;
    color: var(--muted);
    margin-top: 10px;
  }

  .empty {
    margin: 0 6px;
  }
</style>
