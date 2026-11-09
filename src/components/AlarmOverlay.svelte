<script lang="ts">
  import { Monitor, Volume2, VolumeX } from '@lucide/svelte'
  import { fade } from 'svelte/transition'
  import { alarm, disarm, dismiss, enableSound } from '../lib/alarm.svelte.ts'
  import { clock } from '../lib/clock.svelte.ts'
  import { db } from '../lib/db.svelte.ts'
  import { SOUNDS } from '../lib/series.ts'
  import { countdown, hm, MIN } from '../lib/time.ts'
  import { ask } from '../lib/ui.svelte.ts'

  const a = $derived(alarm.active)
  const firstRing = $derived(db.armed ? db.armed.wake + Math.min(...db.settings.macOffsets) * MIN : 0)

  async function turnOff() {
    if (await ask({ title: 'Выключить будильник?', text: 'Утром он не зазвонит.', ok: 'Выключить', cancel: 'Оставить', danger: true }))
      disarm()
  }
</script>

<div class="overlay" class:ringing={a?.ringing} transition:fade={{ duration: 200 }}>
  {#if a}
    <p class="what">{a.kind === 'series' ? 'Вставай' : a.label}</p>
    <p class="clock num">{hm(clock.now)}</p>
    <p class="state num">
      {#if a.ringing}{SOUNDS[a.sound]}{:else if a.next}Тишина · следующий через {countdown(a.next - clock.now)}{/if}
    </p>
    <button class="stop" onclick={dismiss}>{a.kind === 'series' ? 'Я встал' : 'Стоп'}</button>
  {:else if db.armed}
    <p class="what dim">Будильник ждёт</p>
    <p class="clock num dim">{hm(clock.now)}</p>
    <p class="state num">
      Подъём в {hm(db.armed.wake)} · первый сигнал в {hm(firstRing)}<br />через {countdown(firstRing - clock.now)}
    </p>
    <div class="checks">
      {#if alarm.audio}
        <span class="ok"><Volume2 size={18} /> Звук включён</span>
      {:else}
        <button class="warn" onclick={enableSound}><VolumeX size={18} /> Нажми, чтобы включить звук</button>
      {/if}
      <span class:ok={alarm.wakeLock}><Monitor size={18} /> {alarm.wakeLock ? 'Экран не гаснет' : 'Экран может погаснуть'}</span>
    </div>
    <button class="off" onclick={turnOff}>Выключить будильник</button>
  {/if}
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 35;
    background: #0b0b0a;
    color: #ece7dc;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 24px;
    text-align: center;
  }

  :global(body:has(.overlay)) {
    overflow: hidden;
  }

  .ringing {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    50% {
      background: #1f2b25;
    }
  }

  .what {
    font-size: 24px;
    font-weight: 600;
    color: #86b8a2;
  }

  .clock {
    font-size: clamp(96px, 26vw, 240px);
    font-weight: 600;
    letter-spacing: -0.05em;
    line-height: 1;
  }

  .dim {
    color: #4d4a43;
  }

  .what.dim {
    color: #6e695f;
  }

  .state {
    font-size: 18px;
    color: #8d877b;
    min-height: 28px;
  }

  .stop {
    margin-top: 28px;
    width: min(520px, 100%);
    min-height: 120px;
    border-radius: 32px;
    background: #86b8a2;
    color: #0e1f18;
    font-size: 34px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .stop:active {
    transform: scale(0.98);
  }

  .checks {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    margin-top: 18px;
  }

  .checks span,
  .checks button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 999px;
    border: 1px solid #2b2924;
    color: #6e695f;
    font-size: 15px;
  }

  .checks .ok {
    color: #86b8a2;
  }

  .checks .warn {
    color: #1a1206;
    background: #e0a84e;
    border-color: #e0a84e;
    font-weight: 600;
    font-size: 17px;
    padding: 14px 20px;
  }

  .off {
    margin-top: 36px;
    color: #5e594f;
    font-size: 15px;
    padding: 12px;
  }
</style>
