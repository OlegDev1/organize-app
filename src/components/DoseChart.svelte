<script lang="ts">
  import type { DoseDay } from '../lib/stats.ts'
  import { clockOf, parseKey } from '../lib/time.ts'

  interface Props {
    days: DoseDay[]
  }
  let { days }: Props = $props()

  // Day of the cycle from 06:00 to 08:00 next morning, top to bottom.
  const W = 340
  const H = 220
  const left = 46
  const top = 8
  const bottom = 24
  const from = 6 * 60
  const to = 32 * 60
  const ticks = [12 * 60, 18 * 60, 24 * 60, 30 * 60]

  const colW = $derived((W - left) / days.length)
  const x = (i: number) => left + colW * i + colW / 2
  const y = (m: number) => top + ((Math.min(to, Math.max(from, m)) - from) / (to - from)) * (H - top - bottom)
</script>

<svg viewBox="0 0 {W} {H}" role="img" aria-label="Время доз по дням">
  {#each ticks as t (t)}
    <line x1={left} x2={W} y1={y(t)} y2={y(t)} class="grid" />
    <text x={left - 8} y={y(t) + 4} class="axis" text-anchor="end">{clockOf(t)}</text>
  {/each}
  {#each days as d, i (d.key)}
    {#if d.day != null && d.night != null}
      <line x1={x(i)} x2={x(i)} y1={y(d.day)} y2={y(d.night)} class="link" />
    {/if}
    {#if d.day != null}<circle cx={x(i)} cy={y(d.day)} r="5" class="day" />{/if}
    {#if d.night != null}<circle cx={x(i)} cy={y(d.night)} r="5" class="night" />{/if}
    {#if i % 2 === days.length % 2}
      <text x={x(i)} y={H - 6} class="axis" text-anchor="middle">{parseKey(d.key).getDate()}</text>
    {/if}
  {/each}
</svg>
<p class="legend"><i class="day"></i> дневная <i class="night"></i> ночная</p>

<style>
  svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .grid {
    stroke: var(--line);
  }

  .axis {
    fill: var(--muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .link {
    stroke: var(--line);
    stroke-width: 2;
  }

  circle.day {
    fill: var(--warn);
  }

  circle.night {
    fill: var(--accent);
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--muted);
    margin-top: 8px;
  }

  .legend i {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
  }

  .legend i.night {
    margin-left: 10px;
    background: var(--accent);
  }

  .legend i.day {
    background: var(--warn);
  }
</style>
