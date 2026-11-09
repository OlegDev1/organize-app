<script lang="ts">
  import type { NightStat } from '../lib/stats.ts'
  import { clockOf, parseKey } from '../lib/time.ts'

  interface Props {
    nights: NightStat[]
  }
  let { nights }: Props = $props()

  // Time runs down: 22:00 at the top, 14:00 next day at the bottom.
  const W = 340
  const H = 220
  const left = 46
  const top = 8
  const bottom = 24
  const from = 22 * 60
  const to = 38 * 60
  const ticks = [24 * 60, 28 * 60, 32 * 60, 36 * 60]

  const colW = $derived((W - left) / nights.length)
  const x = (i: number) => left + colW * i + colW / 2
  const y = (m: number) => top + ((Math.min(to, Math.max(from, m)) - from) / (to - from)) * (H - top - bottom)
  const planPath = $derived(nights.map((n, i) => `${i ? 'L' : 'M'}${x(i)},${y(n.planBed)}`).join(' '))
</script>

<svg viewBox="0 0 {W} {H}" role="img" aria-label="Отбой и подъём по ночам">
  {#each ticks as t (t)}
    <line x1={left} x2={W} y1={y(t)} y2={y(t)} class="grid" />
    <text x={left - 8} y={y(t) + 4} class="axis" text-anchor="end">{clockOf(t)}</text>
  {/each}

  <path d={planPath} class="plan" />

  {#each nights as n, i (n.key)}
    {#if n.bed != null && n.wake != null}
      <rect
        x={x(i) - colW * 0.3}
        width={colW * 0.6}
        y={y(n.bed)}
        height={Math.max(4, y(n.wake) - y(n.bed))}
        rx={Math.min(6, colW * 0.3)}
        class:late={!n.onPlan}
        class="bar"
      />
    {:else if n.bed != null || n.wake != null}
      <circle cx={x(i)} cy={y((n.bed ?? n.wake)!)} r="3.5" class:late={n.bed != null && !n.onPlan} class="dot" />
    {/if}
    <circle cx={x(i)} cy={y(n.planBed)} r="2.5" class="plandot" />
    {#if i % 2 === nights.length % 2}
      <text x={x(i)} y={H - 6} class="axis" text-anchor="middle">{parseKey(n.key).getDate()}</text>
    {/if}
  {/each}
</svg>

<style>
  svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .grid {
    stroke: var(--line);
    stroke-width: 1;
  }

  .axis {
    fill: var(--muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .plan {
    fill: none;
    stroke: var(--faint);
    stroke-width: 1.5;
    stroke-dasharray: 3 4;
  }

  .plandot {
    fill: var(--faint);
  }

  .bar,
  .dot {
    fill: var(--accent);
  }

  .late {
    fill: var(--warn);
  }
</style>
