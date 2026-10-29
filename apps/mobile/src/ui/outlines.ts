/**
 * The figures the empty states draw behind their words (TASK-339,
 * ADR-0293), in the catalog's form: from 0 to 1, y downwards, closed. The
 * heart is the one figure the catalog keeps as a formula and not as
 * points: the same curve the engine draws, in 72 points, starting at the
 * notch and going round by the right lobe, as a run would.
 */
export const HEART: readonly (readonly [number, number])[] = heart(72);

function heart(count: number): (readonly [number, number])[] {
  const raw: [number, number][] = [];
  for (let i = 0; i < count; i += 1) {
    const t = (2 * Math.PI * i) / count;
    raw.push([
      16 * Math.sin(t) ** 3,
      -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
    ]);
  }
  const xs = raw.map(([x]) => x);
  const ys = raw.map(([, y]) => y);
  const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
  const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY);
  const points = raw.map(
    ([x, y]) => [round((x - minX) / span), round((y - minY) / span)] as const,
  );
  return [...points, points[0]];
}

function round(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}
