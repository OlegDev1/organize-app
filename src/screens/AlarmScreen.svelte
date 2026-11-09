<script lang="ts">
  import { Play, Plus, Trash2 } from '@lucide/svelte'
  import { arm, macWake, nextOccurrence } from '../lib/alarm.svelte.ts'
  import { clock } from '../lib/clock.svelte.ts'
  import { db, getPlan, uid } from '../lib/db.svelte.ts'
  import { SOUNDS } from '../lib/series.ts'
  import { preview } from '../lib/sound.ts'
  import { at, dayLabel, hm, keyOf, MIN, parseClock, shiftKey, signed } from '../lib/time.ts'
  import { removeById } from '../lib/actions.ts'
  import { isNative, native, openSettings, refreshStatus, testAlarm } from '../lib/native.svelte.ts'
  import { activeCycle } from '../lib/today.ts'
  import { Check } from '@lucide/svelte'

  const w = $derived(macWake(clock.now))
  const bed = $derived(getPlan().night(w.night).bed)
  const series = $derived(
    [...db.settings.macOffsets].sort((a, b) => a - b).map((o, i) => ({ o, time: w.wake + o * MIN, sound: i % SOUNDS.length })),
  )

  let editing = $state(false)
  let wakeText = $state('')

  function startEdit() {
    wakeText = hm(w.wake)
    editing = true
  }

  function saveWake() {
    const m = parseClock(wakeText)
    if (m == null) return
    db.wakeOverride = { night: w.night, at: at(shiftKey(w.night, 1), m).getTime() }
    editing = false
  }

  // Android app: the phone rings by itself.
  const phoneWake = $derived(getPlan().night(activeCycle(getPlan(), db, clock.now)).wake)
  const phoneSeries = $derived([...db.settings.phoneOffsets].sort((a, b) => a - b).map((o) => ({ o, time: phoneWake + o * MIN })))
  const perms = $derived(
    native.status
      ? [
          { id: 'notifications' as const, label: 'Уведомления', ok: native.status.notifications },
          { id: 'exact' as const, label: 'Точное время будильников', ok: native.status.exact },
          { id: 'fullScreen' as const, label: 'Будильник на весь экран', ok: native.status.fullScreen },
          ...(native.status.sdk >= 36
            ? [{ id: 'notifications' as const, label: 'Живое уведомление в строке состояния', ok: native.status.promoted }]
            : []),
        ]
      : [],
  )

  // Own alarms.
  let newTime = $state('')
  let newLabel = $state('')
  let newDaily = $state(false)

  function addAlarm() {
    const m = parseClock(newTime)
    if (m == null) return
    const now = Date.now()
    const today = keyOf(now)
    const date = at(today, m).getTime() > now ? today : shiftKey(today, 1)
    db.alarms.push({ id: uid(), min: m, label: newLabel.trim(), daily: newDaily, on: true, date })
    newTime = ''
    newLabel = ''
  }

  function toggle(id: string) {
    const a = db.alarms.find((x) => x.id === id)
    if (!a) return
    a.on = !a.on
    // A one-off alarm switched back on rings at its next time.
    if (a.on && !a.daily) {
      const today = keyOf(Date.now())
      a.date = at(today, a.min).getTime() > Date.now() ? today : shiftKey(today, 1)
    }
  }
</script>

{#if isNative}
  <section class="card wake">
    <p class="label">Подъём</p>
    <p class="time num">{hm(phoneWake)}</p>
    <p class="sub">Будильники ставятся сами и двигаются вместе с планом.</p>
    <ul class="series">
      {#each phoneSeries as a (a.o)}
        <li><span class="num t">{hm(a.time)}</span><span class="o num">{signed(a.o)}</span><span class="snd">{a.o === 0 ? 'подъём' : ''}</span><span></span></li>
      {/each}
    </ul>
    <p class="sub small">
      Каждый звонит {db.settings.ringMin} мин, потом {db.settings.pauseMin} мин тишины, у каждого свой звук. После последнего — по
      кругу ещё час. «Я встал» выключает все и отмечает подъём.
    </p>
    <button class="btn ghost" onclick={testAlarm}>Проверить: зазвонит через 10 с</button>
  </section>

  <h2 class="section">Разрешения</h2>
  <div class="card perms">
    {#each perms as p (p.label)}
      <div class="perm">
        <span>{p.label}</span>
        {#if p.ok}<span class="ok"><Check size={18} strokeWidth={2.6} /></span>
        {:else}<button class="btn primary small" onclick={() => openSettings(p.id)}>Разрешить</button>{/if}
      </div>
    {/each}
    <button class="recheck" onclick={refreshStatus}>Проверить ещё раз</button>
  </div>
{:else}
<section class="card wake">
  <p class="label">Подъём на Маке</p>
  {#if editing}
    <div class="edit">
      <input class="field num" type="time" bind:value={wakeText} />
      <button class="btn primary small" onclick={saveWake}>Сохранить</button>
    </div>
  {:else}
    <p class="time num">{hm(w.wake)}</p>
    <p class="sub">
      {#if w.manual}Изменено вручную · по плану {hm(w.planned)}{:else}По плану · отбой {hm(bed)}{/if}
    </p>
    <div class="links">
      <button onclick={startEdit}>Изменить на один раз</button>
      {#if w.manual}<button onclick={() => (db.wakeOverride = null)}>Вернуть план</button>{/if}
    </div>
  {/if}

  <ul class="series">
    {#each series as s (s.o)}
      <li>
        <span class="num t">{hm(s.time)}</span>
        <span class="o num">{signed(s.o)}</span>
        <span class="snd">{SOUNDS[s.sound]}</span>
        <button aria-label="Послушать {SOUNDS[s.sound]}" onclick={() => preview(s.sound)}><Play size={16} /></button>
      </li>
    {/each}
  </ul>
  <p class="sub small">
    Каждый звонит {db.settings.ringMin} мин, потом {db.settings.pauseMin} мин тишины. После последнего — по кругу, пока
    не нажмёшь «Я встал».
  </p>

  <button class="btn primary big" onclick={arm}>Запустить будильник</button>
</section>

<h2 class="section">Перед сном на Маке</h2>
<ol class="card check">
  <li>Включи приложение против сна.</li>
  <li>
    Chrome → Настройки → Производительность → Экономия памяти: добавь <b>olegdev1.github.io</b> в «Всегда оставлять эти
    сайты активными».
  </li>
  <li>Звук Мака включён и громко. Вкладка с будильником открыта и на переднем плане.</li>
  <li>Нажми «Запустить» — экран не будет гаснуть, пока будильник ждёт.</li>
</ol>
<p class="hint">
  Мак не знает, что ты отмечал на телефоне. Если брал поблажку — повтори её тут во вкладке «Сон» или измени время
  выше.
</p>
{/if}

<h2 class="section">Свои будильники</h2>
<div class="card own">
  <div class="add">
    <input class="field num" type="time" bind:value={newTime} aria-label="Время" />
    <input class="field" placeholder="Название" bind:value={newLabel} />
  </div>
  <label class="daily"><input type="checkbox" bind:checked={newDaily} /> Каждый день</label>
  <button class="btn ghost" onclick={addAlarm} disabled={parseClock(newTime) == null}><Plus size={20} /> Добавить</button>

  {#each [...db.alarms].sort((a, b) => a.min - b.min) as a (a.id)}
    <div class="alarm" class:off={!a.on}>
      <div>
        <p class="num at">{hm(at(a.date, a.min))}</p>
        <p class="sub">
          {a.label || 'Будильник'} · {a.daily ? 'каждый день' : a.on ? dayLabel(nextOccurrence(a, clock.now)) : 'выключен'}
        </p>
      </div>
      <button class="switch" class:on={a.on} role="switch" aria-checked={a.on} aria-label="Включён" onclick={() => toggle(a.id)}
        ><i></i></button
      >
      <button class="del" aria-label="Удалить" onclick={() => removeById(db.alarms, a.id)}><Trash2 size={18} /></button>
    </div>
  {/each}
  <p class="sub small">{isNative ? 'Звонят как будильник: 3 раза по ' + db.settings.ringMin + ' мин.' : 'Звонят, только пока сайт открыт на Маке.'}</p>
</div>

<style>
  .wake {
    display: flex;
    flex-direction: column;
  }

  .label {
    font-size: 17px;
    font-weight: 500;
    color: var(--muted);
  }

  .time {
    font-size: clamp(64px, 20vw, 104px);
    font-weight: 600;
    letter-spacing: -0.045em;
    line-height: 1.05;
    margin-left: -3px;
  }

  .sub {
    color: var(--muted);
    font-size: 15px;
  }

  .small {
    font-size: 13px;
    margin-top: 10px;
  }

  .links {
    display: flex;
    gap: 18px;
    margin: 8px 0 4px;
  }

  .links button {
    color: var(--accent);
    font-weight: 600;
    font-size: 15px;
    padding: 6px 0;
  }

  .edit {
    display: flex;
    gap: 10px;
    margin: 10px 0;
  }

  .edit .field {
    font-size: 24px;
    font-weight: 600;
  }

  .series {
    list-style: none;
    margin: 14px 0 0;
    padding: 0;
  }

  .series li {
    display: grid;
    grid-template-columns: 64px 44px 1fr 40px;
    align-items: center;
    min-height: 44px;
    border-top: 1px solid var(--line);
  }

  .series .t {
    font-weight: 600;
    font-size: 17px;
  }

  .series .o,
  .series .snd {
    color: var(--muted);
  }

  .series button {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    color: var(--accent);
  }

  .big {
    margin-top: 18px;
    min-height: 72px;
    font-size: 20px;
  }

  .check {
    margin: 0;
    padding: 18px 20px 18px 40px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .check b {
    font-weight: 600;
  }

  .hint {
    font-size: 14px;
    color: var(--muted);
    margin: 12px 6px 0;
  }

  .own {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .add {
    display: grid;
    grid-template-columns: 130px 1fr;
    gap: 10px;
  }

  .daily {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
  }

  .daily input {
    width: 22px;
    height: 22px;
    accent-color: var(--accent);
  }

  .btn:disabled {
    opacity: 0.45;
  }

  .alarm {
    display: grid;
    grid-template-columns: 1fr auto 40px;
    align-items: center;
    gap: 10px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
  }

  .alarm .at {
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  .alarm.off .at {
    color: var(--faint);
  }

  .switch {
    width: 52px;
    height: 32px;
    border-radius: 16px;
    background: var(--line);
    position: relative;
    transition: background-color 0.2s ease;
  }

  .switch i {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.2s ease;
  }

  .switch.on {
    background: var(--accent);
  }

  .switch.on i {
    transform: translateX(20px);
  }

  .perms {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 20px 14px;
  }

  .perm {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 52px;
    border-bottom: 1px solid var(--line);
  }

  .ok {
    color: var(--accent);
    display: grid;
  }

  .recheck {
    align-self: flex-start;
    margin-top: 8px;
    color: var(--accent);
    font-weight: 600;
    font-size: 15px;
    padding: 6px 0;
  }

  .del {
    color: var(--faint);
    height: 40px;
    display: grid;
    place-items: center;
  }
</style>
