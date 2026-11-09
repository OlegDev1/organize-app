<script lang="ts">
  import { BellRing } from '@lucide/svelte'
  import { hm } from '../lib/time.ts'
  import type { PhoneAlarm } from '../lib/today.ts'

  interface Props {
    alarms: PhoneAlarm[]
    /** Shown when something changed and he hasn't confirmed it yet. */
    onack?: () => void
  }
  let { alarms, onack }: Props = $props()
</script>

<div class="card">
  {#if onack}
    <p class="head"><BellRing size={20} /> Переставь будильники на телефоне</p>
  {/if}
  <ul>
    {#each alarms as a (a.id)}
      <li class:changed={a.was != null}>
        <span class="time num">{hm(a.time)}</span>
        <span class="label">{a.label}</span>
        {#if a.was != null}<s class="num">{hm(a.was)}</s>{/if}
      </li>
    {/each}
  </ul>
  {#if onack}
    <button class="btn primary" onclick={onack}>Переставил</button>
  {/if}
</div>

<style>
  .head {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 17px;
    font-weight: 600;
    color: var(--warn);
    margin: 2px 0 8px;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    display: grid;
    grid-template-columns: 64px 1fr auto;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    border-bottom: 1px solid var(--line);
  }

  li:last-child {
    border-bottom: 0;
  }

  .time {
    font-size: 17px;
    font-weight: 600;
  }

  .label {
    color: var(--muted);
  }

  .changed .time {
    color: var(--warn);
  }

  s {
    font-size: 14px;
    color: var(--faint);
  }

  .btn {
    margin-top: 14px;
  }
</style>
