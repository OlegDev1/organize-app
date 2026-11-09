<script lang="ts">
  import { AlarmClock, Clock, Moon, NotebookPen, Pill, Settings as Gear } from '@lucide/svelte'
  import { fade } from 'svelte/transition'
  import { alarm } from './lib/alarm.svelte.ts'
  import { clock } from './lib/clock.svelte.ts'
  import { db } from './lib/db.svelte.ts'
  import { dayLabel } from './lib/time.ts'
  import { openSleep } from './lib/today.ts'
  import { go, ui, type Tab } from './lib/ui.svelte.ts'
  import AlarmOverlay from './components/AlarmOverlay.svelte'
  import Sheet from './components/Sheet.svelte'
  import Toast from './components/Toast.svelte'
  import AlarmScreen from './screens/AlarmScreen.svelte'
  import Doses from './screens/Doses.svelte'
  import Notes from './screens/Notes.svelte'
  import Now from './screens/Now.svelte'
  import Settings from './screens/Settings.svelte'
  import Sleep from './screens/Sleep.svelte'

  const tabs: { id: Tab; label: string; icon: typeof Clock }[] = [
    { id: 'now', label: 'Сейчас', icon: Clock },
    { id: 'sleep', label: 'Сон', icon: Moon },
    { id: 'doses', label: 'Дозы', icon: Pill },
    { id: 'notes', label: 'Заметки', icon: NotebookPen },
    { id: 'alarm', label: 'Будильник', icon: AlarmClock },
  ]

  const overlay = $derived(db.armed != null || alarm.active != null)

  // Light by day, dark in the evening, at night and while asleep.
  const dark = $derived.by(() => {
    const t = db.settings.theme
    if (t !== 'auto') return t === 'dark'
    const h = new Date(clock.now).getHours()
    return h >= 20 || h < 8 || overlay || openSleep(db, clock.now) != null
  })

  $effect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141310' : '#f4f1ea')
  })
</script>

<div class="app">
  {#if ui.settings}
    <div in:fade={{ duration: 160 }}><Settings /></div>
  {:else}
    <header>
      <p class="date">{dayLabel(clock.now)}</p>
      <button class="gear" aria-label="Настройки" onclick={() => (ui.settings = true)}><Gear size={22} /></button>
    </header>

    {#key ui.tab}
      <main in:fade={{ duration: 160 }}>
        {#if ui.tab === 'now'}<Now />
        {:else if ui.tab === 'sleep'}<Sleep />
        {:else if ui.tab === 'doses'}<Doses />
        {:else if ui.tab === 'notes'}<Notes />
        {:else}<AlarmScreen />{/if}
      </main>
    {/key}

    <nav>
      {#each tabs as t (t.id)}
        <button class:on={ui.tab === t.id} onclick={() => go(t.id)} aria-current={ui.tab === t.id ? 'page' : undefined}>
          <t.icon size={23} strokeWidth={ui.tab === t.id ? 2.2 : 1.8} />
          <span>{t.label}</span>
        </button>
      {/each}
    </nav>
  {/if}
</div>

{#if overlay}<AlarmOverlay />{/if}
<Sheet />
<Toast />

<style>
  .app {
    max-width: 560px;
    margin: 0 auto;
    padding: calc(env(safe-area-inset-top) + 10px) 16px calc(var(--nav-h) + env(safe-area-inset-bottom) + 28px);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 48px;
    padding: 0 4px;
  }

  .date {
    font-size: 15px;
    font-weight: 500;
    color: var(--muted);
  }

  .date::first-letter {
    text-transform: uppercase;
  }

  .gear {
    width: 44px;
    height: 44px;
    margin-right: -10px;
    display: grid;
    place-items: center;
    color: var(--muted);
    border-radius: 50%;
  }

  nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    display: flex;
    justify-content: center;
    padding: 6px 8px calc(env(safe-area-inset-bottom) + 6px);
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-top: 1px solid var(--line);
    transition: background-color 0.5s ease;
  }

  nav button {
    flex: 1;
    max-width: 112px;
    height: 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    color: var(--faint);
    font-size: 11.5px;
    font-weight: 500;
    border-radius: 16px;
    transition: color 0.2s ease;
  }

  nav button.on {
    color: var(--accent);
  }

  /* Mac: navigation on top. */
  @media (min-width: 900px) {
    .app {
      padding-bottom: 48px;
      padding-top: 84px;
    }

    nav {
      top: 0;
      bottom: auto;
      border-top: 0;
      border-bottom: 1px solid var(--line);
      padding: 10px;
    }

    nav button {
      flex-direction: row;
      gap: 8px;
      height: 44px;
      max-width: none;
      flex: 0 0 auto;
      padding: 0 16px;
      font-size: 15px;
    }

    nav button.on {
      background: var(--accent-soft);
    }
  }
</style>
