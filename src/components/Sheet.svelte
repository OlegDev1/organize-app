<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { answer, ui } from '../lib/ui.svelte.ts'
</script>

{#if ui.ask}
  {@const a = ui.ask}
  <div class="backdrop" transition:fade={{ duration: 150 }} onclick={() => answer(false)} aria-hidden="true"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label={a.title} transition:fly={{ y: 40, duration: 220 }}>
    <h2>{a.title}</h2>
    <p>{a.text}</p>
    <!-- The safe choice is the big one. -->
    <button class="btn primary" onclick={() => answer(false)}>{a.cancel}</button>
    <button class="btn {a.danger ? 'ghost danger-text' : 'ghost'}" onclick={() => answer(true)}>{a.ok}</button>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgb(10 10 8 / 0.45);
  }

  .sheet {
    position: fixed;
    z-index: 41;
    left: 50%;
    bottom: 0;
    width: min(560px, 100%);
    transform: translateX(-50%);
    background: var(--card);
    border-radius: 28px 28px 0 0;
    padding: 26px 20px calc(env(safe-area-inset-bottom) + 20px);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  h2 {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  p {
    font-size: 17px;
    color: var(--muted);
    margin-bottom: 10px;
  }

  .danger-text {
    color: var(--late);
  }

  @media (min-width: 600px) {
    .sheet {
      bottom: 50%;
      transform: translate(-50%, 50%);
      border-radius: 28px;
      width: 440px;
    }
  }
</style>
