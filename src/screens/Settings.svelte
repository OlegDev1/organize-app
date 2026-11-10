<script lang="ts">
  import { ChevronLeft } from '@lucide/svelte'
  import { db, getPlan, parseData } from '../lib/db.svelte.ts'
  import type { Theme } from '../lib/model.ts'
  import { clockOf, keyOf, parseClock, parseKey, shortDay, signed, parseOffsets } from '../lib/time.ts'
  import { activeCycle } from '../lib/today.ts'
  import { ask, toast, ui } from '../lib/ui.svelte.ts'
  import { isNative } from '../lib/native.svelte.ts'

  const s = $derived(db.settings)
  const weekdays = [1, 2, 3, 4, 5, 6, 0]
  const names = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

  // Fields that need parsing are edited as text and saved on change.
  let readyText = $state(clockOf(db.settings.readyBy.find((x) => x != null) ?? 730))
  let targetText = $state(clockOf(db.settings.targetBed))
  let phoneText = $state(db.settings.phoneOffsets.map(signed).join(', '))
  let macText = $state(db.settings.macOffsets.map(signed).join(', '))
  let restartText = $state('')
  let dayEarliestText = $state(clockOf(db.settings.dayDoseEarliest))
  let fastUntilText = $state(clockOf(db.settings.fastUntil))

  function toggleDay(d: number) {
    const ready = parseClock(readyText) ?? 730
    s.readyBy[d] = s.readyBy[d] == null ? ready : null
  }

  function saveReady() {
    const m = parseClock(readyText)
    if (m == null) return
    s.readyBy = s.readyBy.map((x) => (x == null ? null : m))
  }

  function saveTarget() {
    const m = parseClock(targetText)
    if (m == null) return
    // Bedtimes before noon belong to the night after midnight.
    s.targetBed = m < 12 * 60 ? m + 1440 : m
  }

  function saveOffsets(which: 'phoneOffsets' | 'macOffsets', text: string) {
    const list = parseOffsets(text)
    if (list) s[which] = list
    else toast('Не понял список. Пример: −15, −5, 0, 10, 15')
  }

  const number = (v: unknown, min: number, max: number, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback
  }

  async function restart() {
    const m = parseClock(restartText)
    if (m == null) return
    const bed = m < 12 * 60 ? m + 1440 : m
    const ok = await ask({
      title: 'Перезапустить план?',
      text: `Сегодня отбой в ${clockOf(bed)}, дальше план снова идёт шагами к цели ${clockOf(s.targetBed)}. Это не поблажка, а новый старт.`,
      ok: 'Перезапустить',
      cancel: 'Отмена',
      danger: true,
    })
    if (!ok) return
    s.planStart = activeCycle(getPlan(), db, Date.now())
    s.startBed = bed
    restartText = ''
    toast('План перезапущен')
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `rezhim-${keyOf(Date.now())}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importData(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    const data = parseData(await file.text())
    if (!data) return toast('Это не файл «Режима»')
    if (await ask({ title: 'Заменить данные?', text: 'Всё на этом устройстве заменится данными из файла.', ok: 'Заменить', cancel: 'Отмена', danger: true }))
      Object.assign(db, data)
  }

  const themes: { id: Theme; label: string }[] = [
    { id: 'auto', label: 'Авто' },
    { id: 'light', label: 'Светлая' },
    { id: 'dark', label: 'Тёмная' },
  ]
</script>

<header>
  <button class="back" onclick={() => (ui.settings = false)}><ChevronLeft size={24} /> Готово</button>
  <h1>Настройки</h1>
</header>

<h2 class="section">Лекарства</h2>
<div class="card form">
  <label>Дневная доза<input class="field" bind:value={s.dayName} placeholder="Название" /></label>
  <label>Ночная доза<input class="field" bind:value={s.nightName} placeholder="Название" /></label>
  <label
    >Дневная не раньше
    <input class="field num" type="time" bind:value={dayEarliestText}
      onchange={() => {
        const m = parseClock(dayEarliestText)
        if (m != null) s.dayDoseEarliest = m
      }} />
  </label>
  <p class="hint">Дневная — не раньше этого времени. Между любыми двумя дозами — не меньше 8 ч. Названия хранятся только на этом устройстве.</p>
</div>

<h2 class="section">Сон</h2>
<div class="card form">
  <label
    >Длина сна
    <select class="field" value={s.sleepMin} onchange={(e) => (s.sleepMin = Number(e.currentTarget.value))}>
      {#each [480, 510, 540, 570] as m (m)}<option value={m}>{m / 60} ч</option>{/each}
    </select>
  </label>
  <div class="two">
    <label
      >Ночная доза до отбоя, мин
      <input class="field num" type="number" inputmode="numeric" value={s.doseBefore}
        onchange={(e) => (s.doseBefore = number(e.currentTarget.value, 0, 240, s.doseBefore))} />
    </label>
    <label
      >Готовиться ко сну за, мин
      <input class="field num" type="number" inputmode="numeric" value={s.windDownBefore}
        onchange={(e) => (s.windDownBefore = number(e.currentTarget.value, 0, 180, s.windDownBefore))} />
    </label>
  </div>
  <label>Цель отбоя<input class="field num" type="time" bind:value={targetText} onchange={saveTarget} /></label>
  <div class="two">
    <label
      >Быстрый шаг, мин за ночь
      <select class="field" value={s.fastStep} onchange={(e) => (s.fastStep = Number(e.currentTarget.value))}>
        {#each [60, 90, 120] as m (m)}<option value={m}>{m}</option>{/each}
      </select>
    </label>
    <label
      >Быстро — до
      <input class="field num" type="time" bind:value={fastUntilText}
        onchange={() => {
          const m = parseClock(fastUntilText)
          if (m != null) s.fastUntil = m < 12 * 60 ? m + 1440 : m
        }} />
    </label>
  </div>
  <div class="two">
    <label
      >Задержаться там, ночей
      <input class="field num" type="number" inputmode="numeric" value={s.holdNights}
        onchange={(e) => (s.holdNights = number(e.currentTarget.value, 1, 7, s.holdNights))} />
    </label>
    <label
      >Потом шаг, мин за ночь
      <select class="field" value={s.slowStep} onchange={(e) => (s.slowStep = Number(e.currentTarget.value))}>
        {#each [15, 30, 60] as m (m)}<option value={m}>{m}</option>{/each}
      </select>
    </label>
  </div>
  <label
    >Опоздание, которое не считается, мин
    <input class="field num" type="number" inputmode="numeric" value={s.bedTolerance}
      onchange={(e) => (s.bedTolerance = number(e.currentTarget.value, 0, 60, s.bedTolerance))} />
  </label>
  <p class="hint">
    План считается от того, когда ты реально лёг («Лёг»). Лёг позже плана — следующие ночи идут от этого времени: быстрым шагом до
    {clockOf(s.fastUntil)}, там {s.holdNights} ноч., потом по {s.slowStep} мин до цели. Лёг раньше — план не ускоряется.
  </p>
</div>

<h2 class="section">Напоминания</h2>
<div class="card form">
  <label class="check"
    ><input type="checkbox" bind:checked={s.doseNotify} />Уведомления о дозах: когда уже можно и когда давно пора</label>
  <div class="two">
    <label
      >Дневная «давно пора» через, ч
      <input class="field num" type="number" inputmode="numeric" value={s.doseLateMin / 60}
        onchange={(e) => (s.doseLateMin = number(e.currentTarget.value, 1, 10, s.doseLateMin / 60) * 60)} />
    </label>
    <label
      >После отбоя напоминать каждые, мин
      <input class="field num" type="number" inputmode="numeric" value={s.bedNagMin}
        onchange={(e) => (s.bedNagMin = number(e.currentTarget.value, 0, 120, s.bedNagMin))} />
    </label>
  </div>
  <p class="hint">Раньше чем через 8 ч после прошлой дозы приложение о дозе не напоминает никогда. 0 мин — не напоминать после отбоя.</p>
</div>

<h2 class="section">Учёба</h2>
<div class="card form">
  <div class="days">
    {#each weekdays as d (d)}
      <button class:on={s.readyBy[d] != null} onclick={() => toggleDay(d)}>{names[d]}</button>
    {/each}
  </div>
  <div class="two">
    <label>Быть готовым к<input class="field num" type="time" bind:value={readyText} onchange={saveReady} /></label>
    <label
      >Сборы, мин
      <input class="field num" type="number" inputmode="numeric" value={s.prepMin}
        onchange={(e) => (s.prepMin = number(e.currentTarget.value, 5, 180, s.prepMin))} />
    </label>
  </div>
  <p class="hint">В эти дни подъём не позже, чем нужно, чтобы последний будильник прозвенел до начала сборов.</p>
</div>

<h2 class="section">Будильники</h2>
<div class="card form">
  <label
    >Телефон, мин от подъёма
    <input class="field num" bind:value={phoneText} onchange={() => saveOffsets('phoneOffsets', phoneText)} />
  </label>
  <label
    >Мак, мин от подъёма
    <input class="field num" bind:value={macText} onchange={() => saveOffsets('macOffsets', macText)} />
  </label>
  <div class="two">
    <label
      >Звонок, мин
      <input class="field num" type="number" inputmode="numeric" value={s.ringMin}
        onchange={(e) => (s.ringMin = number(e.currentTarget.value, 1, 15, s.ringMin))} />
    </label>
    <label
      >Тишина, мин
      <input class="field num" type="number" inputmode="numeric" value={s.pauseMin}
        onchange={(e) => (s.pauseMin = number(e.currentTarget.value, 0, 15, s.pauseMin))} />
    </label>
  </div>
</div>

<h2 class="section">Тема</h2>
<div class="seg">
  {#each themes as t (t.id)}
    <button class:on={s.theme === t.id} onclick={() => (s.theme = t.id)}>{t.label}</button>
  {/each}
</div>
<p class="hint pad">Авто: светлая днём, тёмная с 20:00 до 08:00 и пока спишь.</p>

{#if !isNative}
  <h2 class="section">Приложение для Android</h2>
  <div class="card form">
    <p class="hint">Настоящие будильники, которые сами двигаются с планом, и живое уведомление «до отбоя». Открой ссылку на телефоне.</p>
    <a class="btn primary" href="https://github.com/OlegDev1/organize-app/releases/download/android/rezhim.apk">Скачать APK</a>
    <p class="hint">Данные не переносятся сами: «Сохранить в файл» здесь → «Загрузить из файла» в приложении.</p>
  </div>
{/if}

<h2 class="section">Данные</h2>
<div class="card form">
  <div class="two">
    <button class="btn ghost small" onclick={exportData}>Сохранить в файл</button>
    <label class="btn ghost small file">Загрузить из файла<input type="file" accept="application/json,.json" onchange={importData} /></label>
  </div>
  <p class="hint">Всё хранится только на этом устройстве. Иногда сохраняй копию.</p>
</div>

<details>
  <summary>Перезапуск плана</summary>
  <div class="card form">
    <p class="hint">
      Только если план совсем сорвался. Выбери, во сколько ляжешь сегодня, — дальше план снова пойдёт шагами к цели.
    </p>
    <label>Лечь сегодня в<input class="field num" type="time" bind:value={restartText} /></label>
    <button class="btn ghost" disabled={parseClock(restartText) == null} onclick={restart}>Перезапустить план</button>
  </div>
</details>

<style>
  header {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 56px;
  }

  .back {
    display: flex;
    align-items: center;
    gap: 2px;
    color: var(--accent);
    font-weight: 600;
    font-size: 16px;
    padding: 8px 8px 8px 0;
    margin-left: -6px;
  }

  h1 {
    font-size: 20px;
    font-weight: 600;
    margin-left: auto;
    margin-right: 4px;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--muted);
  }

  label .field {
    color: var(--text);
    font-weight: 500;
  }

  label.check {
    flex-direction: row;
    align-items: center;
    gap: 12px;
    color: var(--text);
    line-height: 1.35;
  }

  label.check input {
    flex: none;
    width: 22px;
    height: 22px;
    accent-color: var(--accent);
  }

  .two {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    align-items: end;
  }

  .hint {
    font-size: 13px;
    color: var(--muted);
  }

  .pad {
    margin: 8px 6px 0;
  }

  .days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }

  .days button,
  .seg button {
    height: 44px;
    border-radius: 12px;
    border: 1.5px solid var(--line);
    font-weight: 600;
    color: var(--muted);
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .days button.on,
  .seg button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }

  .seg {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  a.btn {
    text-decoration: none;
  }

  .file {
    color: var(--text);
    font-size: 16px;
    font-weight: 600;
    flex-direction: row;
    width: 100%;
  }

  .file input {
    display: none;
  }

  .btn.small {
    width: 100%;
  }

  .btn:disabled {
    opacity: 0.45;
  }

  details {
    margin-top: 28px;
  }

  summary {
    font-size: 14px;
    font-weight: 500;
    color: var(--muted);
    padding: 6px;
    margin-bottom: 10px;
    cursor: pointer;
  }
</style>
