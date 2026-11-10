<script lang="ts">
  import { goToBed, notAsleep, takeDose, wakeUp } from '../lib/actions.ts'
  import { db } from '../lib/db.svelte.ts'
  import { countdown } from '../lib/time.ts'
  import type { Action, Hero } from '../lib/today.ts'

  interface Props {
    hero: Hero
    now: number
  }
  let { hero, now }: Props = $props()

  const left = $derived(hero.target - now)
  const progress = $derived(
    hero.over ? 1 : Math.min(1, Math.max(0, (now - hero.from) / Math.max(1, hero.target - hero.from))),
  )

  const buttons: Record<Action, { label: string; run: () => unknown; name?: () => string }> = {
    wake: { label: 'Я встал', run: wakeUp },
    day: { label: 'Принял дневную', run: () => takeDose('day'), name: () => db.settings.dayName },
    night: { label: 'Принял ночную', run: () => takeDose('night'), name: () => db.settings.nightName },
    bed: { label: 'Лёг', run: goToBed },
    notAsleep: { label: 'Ещё не сплю', run: notAsleep },
  }
</script>

<section class="hero card tone-{hero.tone}" class:alert={hero.alert}>
  {#if hero.chip}<p class="chip">{hero.chip}</p>{/if}
  <p class="label">{hero.label}</p>
  <p class="digits num">{hero.over ? '+' : ''}{countdown(hero.over ? now - hero.target : left)}</p>
  <p class="sub">{hero.sub}</p>
  <div class="bar"><i style:transform="scaleX({progress})"></i></div>

  {#if hero.primary}
    {@const b = buttons[hero.primary]}
    <button class="btn primary big" onclick={b.run}>
      <span>{b.label}</span>
      {#if b.name?.()}<small>{b.name()}</small>{/if}
    </button>
  {/if}
  {#if hero.secondary}
    <button class="btn ghost" onclick={buttons[hero.secondary].run}>{buttons[hero.secondary].label}</button>
  {/if}
</section>

<style>
  .hero {
    padding: 22px 22px 22px;
    display: flex;
    flex-direction: column;
  }

  .chip {
    align-self: flex-start;
    font-size: 14px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 999px;
    margin-bottom: 14px;
    background: var(--accent-soft);
    color: var(--accent);
  }

  .label {
    font-size: 17px;
    font-weight: 500;
    color: var(--muted);
  }

  .digits {
    font-size: clamp(56px, 18.5vw, 96px);
    font-weight: 600;
    letter-spacing: -0.045em;
    line-height: 1;
    margin: 8px 0 10px -3px;
    transition: color 0.4s ease;
  }

  .sub {
    font-size: 16px;
    color: var(--muted);
  }

  .bar {
    height: 6px;
    border-radius: 3px;
    background: var(--line);
    margin: 18px 0 4px;
    overflow: hidden;
  }

  .bar i {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: var(--accent);
    transform-origin: left;
    transition: transform 1s linear, background-color 0.4s ease;
  }

  .btn {
    margin-top: 14px;
  }

  .btn + .btn {
    margin-top: 10px;
  }

  .big {
    min-height: 72px;
    flex-direction: column;
    gap: 0;
    font-size: 20px;
  }

  .big small {
    font-size: 13px;
    font-weight: 500;
    opacity: 0.8;
  }

  .tone-warn .digits,
  .tone-warn .chip {
    color: var(--warn);
  }
  .tone-warn .chip {
    background: var(--warn-soft);
  }
  .tone-warn .bar i {
    background: var(--warn);
  }

  .tone-late .digits,
  .tone-late .chip {
    color: var(--late);
  }
  .tone-late .chip {
    background: var(--late-soft);
  }
  .tone-late .bar i {
    background: var(--late);
  }
  .tone-late .btn.primary {
    background: var(--late);
    color: #fff;
  }

  /* Stop point (up after bedtime, day dose long overdue): the card itself is red. */
  .alert {
    background: var(--late);
    border-color: transparent;
    color: #fff;
  }
  .alert .label,
  .alert .sub,
  .alert .digits {
    color: #fff;
  }
  .alert .chip {
    background: rgb(255 255 255 / 0.18);
    color: #fff;
  }
  .alert .bar {
    background: rgb(255 255 255 / 0.25);
  }
  .alert .bar i {
    background: #fff;
  }
  .alert .btn.primary {
    background: #fff;
    color: var(--late);
  }
  .alert .btn.ghost {
    border-color: rgb(255 255 255 / 0.5);
    color: #fff;
  }

  .tone-night .bar i {
    background: var(--muted);
  }
</style>
