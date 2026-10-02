/**
 * The heart the launch animation draws (TASK-179): the 10 km heart of Milano
 * of the seed catalogue (`catalog/seed/milano.json`), the one of the demo
 * video. A real route of the Route Engine, simplified to 8 m and fitted in a
 * box `HEART_BOX.width` wide, y down; it starts and ends at the notch.
 */
export const HEART_BOX = { width: 1000, height: 887 } as const;

// prettier-ignore
export const HEART_POINTS: readonly (readonly [number, number])[] = [
  [514, 237], [518, 229], [530, 229], [545, 220], [545, 170], [552, 163],
  [545, 158], [568, 123], [577, 119], [599, 122], [606, 130], [612, 127],
  [615, 117], [637, 108], [776, 0], [807, 39], [809, 34], [815, 37],
  [829, 62], [868, 49], [897, 29], [900, 32], [954, 17], [958, 19],
  [974, 90], [970, 94], [985, 178], [1000, 326], [970, 325], [970, 334],
  [985, 334], [981, 358], [942, 343], [936, 348], [946, 426], [922, 430],
  [918, 435], [933, 507], [849, 526], [859, 569], [811, 581], [813, 617],
  [822, 655], [807, 585], [705, 610], [696, 617], [708, 684], [647, 699],
  [643, 747], [614, 745], [606, 833], [538, 833], [540, 882], [534, 887],
  [530, 865], [505, 859], [503, 847], [508, 834], [425, 803], [427, 796],
  [421, 794], [425, 769], [347, 757], [333, 713], [336, 670], [330, 669],
  [332, 639], [297, 634], [293, 637], [274, 610], [231, 604], [237, 553],
  [129, 480], [55, 417], [0, 358], [45, 231], [69, 177], [80, 170],
  [113, 86], [140, 82], [184, 102], [191, 57], [219, 56], [245, 45],
  [256, 57], [275, 44], [288, 51], [376, 38], [380, 47], [413, 50],
  [443, 64], [435, 80], [487, 113], [476, 129], [496, 145], [499, 213],
  [494, 225], [516, 229], [514, 237],
];

/** One short piece of the line, as a thin turned View (no SVG in the app). */
export type Stroke = {
  /** Its two ends, in points of the drawing. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length: number;
  /** Degrees, clockwise from pointing right. */
  angle: number;
  /** When the pen reaches its first end and its second, 0 to 1 along the line. */
  from: number;
  to: number;
};

/** The longest a stroke may be, as a share of the whole line: a longer one
 * would appear all at once, and the line would jump instead of being drawn. */
const LONGEST_STROKE = 1 / 110;

/**
 * The heart as strokes for a drawing `width` points wide, in the order the pen
 * draws them, each with its moment along the line (by length: the pen moves at
 * one speed). Long stretches are cut into short strokes.
 */
export function heartStrokes(width: number): Stroke[] {
  const scale = width / HEART_BOX.width;
  const points = HEART_POINTS.map(([x, y]) => [x * scale, y * scale] as const);
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
    );
  }
  const strokes: Stroke[] = [];
  let done = 0;
  for (let i = 1; i < points.length; i += 1) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const length = Math.hypot(bx - ax, by - ay);
    if (length === 0) {
      continue;
    }
    const pieces = Math.ceil(length / (total * LONGEST_STROKE));
    const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
    for (let p = 0; p < pieces; p += 1) {
      const start = p / pieces;
      const end = (p + 1) / pieces;
      strokes.push({
        x1: ax + (bx - ax) * start,
        y1: ay + (by - ay) * start,
        x2: ax + (bx - ax) * end,
        y2: ay + (by - ay) * end,
        length: length / pieces,
        angle,
        from: (done + length * start) / total,
        to: (done + length * end) / total,
      });
    }
    done += length;
  }
  if (strokes.length > 0) {
    // Exactly the end: the sum of the lengths may fall a hair short of it.
    strokes[strokes.length - 1].to = 1;
  }
  return strokes;
}

/** The height of the heart drawn `width` points wide. */
export function heartHeight(width: number): number {
  return (width * HEART_BOX.height) / HEART_BOX.width;
}
