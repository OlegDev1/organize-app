<script lang="ts">
  import PhoneAlarms from '../components/PhoneAlarms.svelte'
  import SleepChart from '../components/SleepChart.svelte'
  import { useGrace } from '../lib/actions.ts'
  import { clock } from '../lib/clock.svelte.ts'
  import { db, getPlan } from '../lib/db.svelte.ts'
  import { graceInfo } from '../lib/plan.ts'
  import { sleepStats } from '../lib/stats.ts'
  import { clockOf, duration, HOUR, hm, MIN, parseKey, shiftKey, weekdayShort } from '../lib/time.ts'
  import { activeCycle, phoneAlarms } from '../lib/today.ts'
  import { isNative } from '../lib/native.svelte.ts'

  const plan = $derived(getPlan())
  const cycle = $derived(activeCycle(plan, db, clock.now))
  const tonight = $derived(plan.night(cycle))
  const alarms = $derived(phoneAlarms(plan, cycle))
  const grace = $derived(graceInfo(plan, cycle, clock.now))
  const stats = $derived(sleepStats(plan, db, shiftKey(cycle, -1)))

  const upcoming = $derived(Array.from({ length: 7 }, (_, i) => plan.night(shiftKey(cycle, i))))
  const targetFrom = $derived.by(() => {
    for (let i = 0; i < 30; i++) {
      const n = plan.night(shiftKey(cycle, i))
      if (plan.bedMinutes(n.index) === plan.s.targetBed) return n
    }
    return undefined
  })

  const dayName = (key: string) => {
    const d = parseKey(key)
    return `${weekdayShort(d)} ${d.getDate()}`
  }
</script>

<section class="card tonight">
  <p class="title">Сегодня ночью{tonight.grace ? ' · поблажка' : ''}</p>
  <div class="grid">
    <div><span>Ночная доза</span><b class="num">{hm(tonight.nightDose)}</b></div>
    <div><span>Готовиться</span><b class="num">{hm(tonight.windDown)}</b></div>
    <div class="main"><span>Отбой</span><b class="num">{hm(tonight.bed)}</b></div>
    <div class="main"><span>Подъём</span><b class="num">{hm(tonight.wake)}</b></div>
  </div>
  <p class="note">
    Сон {duration(tonight.wake - tonight.bed)}{#if tonight.uni}.
      Учёба: собираться в {hm(tonight.uni.getReady)}, готов к {hm(tonight.uni.readyBy)}{/if}
  </p>
</section>

<h2 class="section">{isNative ? 'Будильники и напоминания · ставятся сами' : 'Будильники на телефоне'}</h2>
<PhoneAlarms {alarms} />

<h2 class="section">План</h2>
<div class="card plan">
  {#each upcoming as n, i (n.key)}
    <div class="night" class:today={i === 0}>
      <span class="day">{i === 0 ? 'сегодня' : dayName(n.key)}</span>
      <span class="num bed">{hm(n.bed)}</span>
      <span class="num wake">→ {hm(n.wake)}</span>
      {#if n.grace}<span class="tag">поблажка</span>{/if}
    </div>
  {/each}
  <p class="note">
    {#if targetFrom}Цель {clockOf(plan.s.targetBed)}{targetFrom.key === cycle ? ' уже сегодня' : ` — с ${dayName(targetFrom.key)}`}.{/if}
    Поздно лёг — план не сдвигается, встаёшь по плану.
  </p>
</div>

<div class="card grace">
  <div>
    <p class="title">Поблажка</p>
    <p class="note">
      {#if grace.state === 'used'}Взята сегодня: повторяются вчерашние времена.
      {:else if grace.state === 'available'}Раз в 7 дней: повторить вчерашние времена.
      {:else}{grace.reason}{/if}
    </p>
  </div>
  {#if grace.state === 'available'}
    <button class="btn ghost small" onclick={() => useGrace(cycle)}>Взять</button>
  {/if}
</div>

<h2 class="section">Статистика сна</h2>
<div class="tiles">
  <div class="tile"><p class="k">Отбой, среднее</p><p class="v num">{stats.avgBed != null ? clockOf(stats.avgBed) : '—'}</p></div>
  <div class="tile"><p class="k">Сон, среднее</p><p class="v num">
      {#if stats.avgSlept == null}—{:else}{Math.floor(stats.avgSlept / HOUR)}<small> ч </small>{Math.round(
          (stats.avgSlept % HOUR) / MIN,
        )}<small> мин</small>{/if}
    </p></div>
  <div class="tile"><p class="k">По плану, из 7</p><p class="v num">{stats.onPlan}<small> / {stats.logged || 7}</small></p></div>
  <div class="tile"><p class="k">Ночей подряд</p><p class="v num">{stats.streak}</p></div>
</div>
<div class="card chart">
  <SleepChart nights={stats.nights} />
  <p class="note">Столбик — от «Ложусь» до «Встал». Пунктир — отбой по плану. Жёлтый — позже плана больше чем на 15 мин.</p>
</div>

<style>
  .title {
    font-size: 17px;
    font-weight: 600;
  }

  .tonight .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px 12px;
    margin: 16px 0 14px;
  }

  .grid div {
    display: flex;
    flex-direction: column;
  }

  .grid span {
    font-size: 14px;
    color: var(--muted);
  }

  .grid b {
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  .grid .main b {
    font-size: 38px;
    color: var(--accent);
  }

  .note {
    font-size: 14px;
    color: var(--muted);
  }

  .plan {
    padding: 8px 20px 16px;
  }

  .night {
    display: grid;
    grid-template-columns: 1fr 64px 76px auto;
    align-items: center;
    min-height: 44px;
    border-bottom: 1px solid var(--line);
  }

  .night .day {
    color: var(--muted);
  }

  .night.today .day,
  .night.today .bed {
    color: var(--accent);
    font-weight: 600;
  }

  .bed {
    font-size: 17px;
    font-weight: 600;
  }

  .wake {
    color: var(--muted);
  }

  .tag {
    font-size: 12px;
    font-weight: 600;
    color: var(--warn);
    background: var(--warn-soft);
    padding: 2px 8px;
    border-radius: 999px;
  }

  .plan .note {
    margin-top: 12px;
  }

  .grace {
    margin-top: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .grace .btn {
    flex: none;
  }

  .chart {
    margin-top: 10px;
    padding: 16px 14px 16px 8px;
  }

  .chart .note {
    margin: 10px 0 0 10px;
  }
</style>
