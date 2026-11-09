<script lang="ts">
  import { ClipboardList, Copy, Trash2 } from '@lucide/svelte'
  import { format } from 'date-fns'
  import { ru } from 'date-fns/locale'
  import { addNote, deleteNote } from '../lib/actions.ts'
  import { clock } from '../lib/clock.svelte.ts'
  import { db, getPlan } from '../lib/db.svelte.ts'
  import { buildReport, REPORT_DAYS } from '../lib/report.ts'
  import { activeCycle } from '../lib/today.ts'
  import { hm, keyOf } from '../lib/time.ts'
  import { toast } from '../lib/ui.svelte.ts'

  let text = $state('')
  let reportDays = $state<number>(14)

  const groups = $derived.by(() => {
    const sorted = [...db.notes].sort((a, b) => b.at - a.at)
    const map = new Map<string, typeof sorted>()
    for (const n of sorted) map.set(keyOf(n.at), [...(map.get(keyOf(n.at)) ?? []), n])
    return [...map.values()]
  })

  function add() {
    if (addNote(text)) text = ''
  }

  async function copy(textToCopy: string, done: string) {
    try {
      await navigator.clipboard.writeText(textToCopy)
      toast(done)
    } catch {
      toast('Не получилось скопировать')
    }
  }

  function copyReport() {
    const plan = getPlan()
    void copy(buildReport(plan, db, activeCycle(plan, db, clock.now), reportDays), 'Отчёт для врача скопирован')
  }

  async function copyAll() {
    const lines = ['Заметки для врача', '']
    for (const g of [...groups].reverse()) {
      lines.push(format(g[0].at, 'd MMMM yyyy, EEEE', { locale: ru }))
      for (const n of [...g].reverse()) lines.push(`${hm(n.at)} — ${n.text}`)
      lines.push('')
    }
    await copy(lines.join('\n').trim(), 'Все заметки скопированы')
  }
</script>

<div class="card compose">
  <textarea
    class="field"
    rows="3"
    placeholder="Что сказать врачу: самочувствие, сон, побочки…"
    bind:value={text}
    onkeydown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && add()}
  ></textarea>
  <button class="btn primary" onclick={add} disabled={!text.trim()}>Добавить</button>
  <p class="hint">Дата и время добавятся сами.</p>
</div>

<h2 class="section">Отчёт для врача</h2>
<div class="card report">
  <p class="hint left">Сон, дозы, промежутки, самочувствие по утрам и заметки за период — одним текстом.</p>
  <div class="seg">
    {#each REPORT_DAYS as d (d)}
      <button class:on={reportDays === d} onclick={() => (reportDays = d)}>{d} дней</button>
    {/each}
  </div>
  <button class="btn ghost" onclick={copyReport}><ClipboardList size={20} /> Скопировать отчёт</button>
</div>

{#if groups.length}
  <div class="bar">
    <h2 class="section">Все заметки · {db.notes.length}</h2>
    <button class="copy" onclick={copyAll}><Copy size={18} /> Скопировать все</button>
  </div>
  <div class="stack">
    {#each groups as g (keyOf(g[0].at))}
      <section class="card day">
        <p class="date">{format(g[0].at, 'd MMMM, EEEE', { locale: ru })}</p>
        {#each g as n (n.id)}
          <div class="note">
            <span class="time num">{hm(n.at)}</span>
            <p>{n.text}</p>
            <button aria-label="Удалить" onclick={() => deleteNote(n.id)}><Trash2 size={17} /></button>
          </div>
        {/each}
      </section>
    {/each}
  </div>
{:else}
  <p class="empty">Пока заметок нет. Пиши коротко, как есть — потом всё скопируешь одним текстом.</p>
{/if}

<style>
  .compose {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  textarea {
    resize: vertical;
    min-height: 96px;
    line-height: 1.45;
  }

  .btn:disabled {
    opacity: 0.45;
  }

  .hint {
    font-size: 13px;
    color: var(--muted);
    text-align: center;
  }

  .report {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .left {
    text-align: left;
  }

  .seg {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .seg button {
    height: 44px;
    border-radius: 12px;
    border: 1.5px solid var(--line);
    font-weight: 600;
    color: var(--muted);
  }

  .seg button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }

  .bar {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .copy {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 15px;
    font-weight: 600;
    color: var(--accent);
    padding: 8px 6px;
  }

  .day {
    padding: 16px 18px 8px;
  }

  .date {
    font-size: 14px;
    font-weight: 600;
    color: var(--muted);
    margin-bottom: 4px;
  }

  .note {
    display: grid;
    grid-template-columns: 50px 1fr 36px;
    align-items: start;
    gap: 6px;
    padding: 10px 0;
    border-top: 1px solid var(--line);
  }

  .note:first-of-type {
    border-top: 0;
  }

  .time {
    font-weight: 600;
    padding-top: 1px;
  }

  .note p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .note button {
    color: var(--faint);
    height: 28px;
    display: grid;
    place-items: center;
  }

  .empty {
    margin: 20px 6px;
    color: var(--muted);
  }
</style>
