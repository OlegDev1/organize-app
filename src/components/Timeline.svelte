<script lang="ts">
  import { Check } from '@lucide/svelte'
  import { hm } from '../lib/time.ts'
  import type { Row } from '../lib/today.ts'

  interface Props {
    rows: Row[]
    now: number
  }
  let { rows, now }: Props = $props()

  // What waits for him now is highlighted; otherwise the next thing ahead.
  const nextId = $derived(
    (rows.find((r) => r.pending) ?? rows.find((r) => r.done == null && !r.missed && r.time >= now))?.id,
  )
</script>

<ol class="card">
  {#each rows as r (r.id)}
    {@const past = r.done == null && !r.pending && (r.missed || r.time < now)}
    <li class:past class:next={r.id === nextId} class:done={r.done != null}>
      <span class="time num">{r.prefix ? r.prefix + ' ' : ''}{hm(r.time)}</span>
      <span class="label">{r.label}{#if r.tomorrow}<em>&nbsp;· завтра</em>{/if}</span>
      <span class="state num">
        {#if r.done != null}<Check size={16} strokeWidth={2.6} />{hm(r.done)}
        {:else if r.missed}нет отметки{/if}
      </span>
    </li>
  {/each}
</ol>

<style>
  ol {
    list-style: none;
    margin: 0;
    padding: 6px;
  }

  li {
    display: grid;
    grid-template-columns: 76px 1fr auto;
    align-items: center;
    gap: 8px;
    min-height: 50px;
    padding: 0 14px;
    border-radius: 16px;
    transition: background-color 0.3s ease, opacity 0.3s ease;
  }

  .time {
    font-size: 16px;
    font-weight: 600;
  }

  .label {
    font-size: 16px;
  }

  em {
    font-style: normal;
    color: var(--muted);
  }

  .state {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    font-weight: 600;
    color: var(--accent);
  }

  .past {
    opacity: 0.45;
  }

  .past .state {
    color: var(--muted);
    font-weight: 500;
    font-size: 13px;
  }

  .done .time,
  .done .label {
    color: var(--muted);
  }

  .next {
    background: var(--accent-soft);
  }

  .next .time,
  .next .label {
    color: var(--accent);
    font-weight: 600;
  }
</style>
