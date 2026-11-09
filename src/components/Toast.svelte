<script lang="ts">
  import { fly } from 'svelte/transition'
  import { ui } from '../lib/ui.svelte.ts'

  function undo() {
    ui.toast?.undo?.()
    ui.toast = null
  }
</script>

{#if ui.toast}
  {#key ui.toast.id}
    <div class="toast" role="status" transition:fly={{ y: 20, duration: 200 }}>
      <span>{ui.toast.text}</span>
      {#if ui.toast.undo}<button onclick={undo}>Отменить</button>{/if}
    </div>
  {/key}
{/if}

<style>
  .toast {
    position: fixed;
    z-index: 30;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(var(--nav-h) + env(safe-area-inset-bottom) + 14px);
    width: min(528px, calc(100% - 32px));
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 54px;
    padding: 8px 8px 8px 18px;
    border-radius: 18px;
    background: var(--text);
    color: var(--bg);
    font-size: 16px;
    font-weight: 500;
  }

  button {
    padding: 0 14px;
    height: 40px;
    border-radius: 12px;
    font-weight: 600;
    color: var(--accent-soft);
  }

  @media (min-width: 900px) {
    .toast {
      bottom: 24px;
    }
  }
</style>
