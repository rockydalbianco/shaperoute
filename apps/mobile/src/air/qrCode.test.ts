import { qrCodeOf, utf8 } from "./qrCode";

const picture = (modules: boolean[][]) =>
  modules.map((row) => row.map((dark) => (dark ? "#" : ".")).join(""));

describe("qrCodeOf", () => {
  it("draws «HELLO WORLD» module by module as the phone's reader read it", () => {
    // Read back by macOS's own QR reader (CIDetector) on 2026-11-23, as
    // were this encoder's codes of an invented task, versions 12 and 14.
    expect(picture(qrCodeOf("HELLO WORLD", "M")!.modules)).toEqual([
      "#######.##..#.#######",
      "#.....#....#..#.....#",
      "#.###.#..#.#..#.###.#",
      "#.###.#.#..#..#.###.#",
      "#.###.#.###.#.#.###.#",
      "#.....#.#..#..#.....#",
      "#######.#.#.#.#######",
      "........#..##........",
      "#...#.######.#####..#",
      "...#....#.###....####",
      "..######..##.##.#..#.",
      "#####...##...#.......",
      "#####.#.#.#.#.##..##.",
      "........#.#.####.#.##",
      "#######.###.#.#.##.#.",
      "#.....#..#.###.##..##",
      "#.###.#.##.#.##...##.",
      "#.###.#..#..#...##.##",
      "#.###.#..###...###...",
      "#.....#....#.#.......",
      "#######.#########.#.#",
    ]);
  });

  it("takes the smallest version the text fits", () => {
    expect(qrCodeOf("HELLO WORLD")?.version).toBe(1);
    // 14 bytes is version 1's most at M, 15 needs version 2.
    expect(qrCodeOf("x".repeat(14), "M")?.version).toBe(1);
    expect(qrCodeOf("x".repeat(15), "M")?.version).toBe(2);
    const big = qrCodeOf("x".repeat(360), "M")!;
    expect(big.version).toBe(14);
    expect(big.size).toBe(14 * 4 + 17);
  });

  it("has its three finders and its timing lines", () => {
    const { modules, size } = qrCodeOf("x".repeat(200))!;
    const finder = [
      "#######",
      "#.....#",
      "#.###.#",
      "#.###.#",
      "#.###.#",
      "#.....#",
      "#######",
    ];
    const at = (x0: number, y0: number) =>
      modules.slice(y0, y0 + 7).map((row) => picture([row.slice(x0, x0 + 7)])[0]);
    expect(at(0, 0)).toEqual(finder);
    expect(at(size - 7, 0)).toEqual(finder);
    expect(at(0, size - 7)).toEqual(finder);
    for (let i = 8; i < size - 8; i += 1) {
      expect(modules[6][i]).toBe(i % 2 === 0);
      expect(modules[i][6]).toBe(i % 2 === 0);
    }
  });

  it("has nothing for a text no version holds", () => {
    expect(qrCodeOf("x".repeat(2400), "M")).toBeNull();
  });
});

describe("utf8", () => {
  it("writes a character as many bytes as UTF-8 does", () => {
    expect(utf8("A")).toEqual([0x41]);
    expect(utf8("à")).toEqual([0xc3, 0xa0]);
    expect(utf8("✓")).toEqual([0xe2, 0x9c, 0x93]);
    expect(utf8("🪂")).toEqual([0xf0, 0x9f, 0xaa, 0x82]);
  });
});

// Drawn by Apple's own QR generator (Core Image's CIQRCodeGenerator) on
// 2026-11-23, module by module, for the same text and error correction.
const REFERENCE: readonly [string, "M" | "L", readonly string[]][] = [
  [
    "hello world",
    "M",
    [
      "#######..#.##.#######",
      "#.....#...#...#.....#",
      "#.###.#.####..#.###.#",
      "#.###.#.###.#.#.###.#",
      "#.###.#.#.#.#.#.###.#",
      "#.....#.#..#..#.....#",
      "#######.#.#.#.#######",
      "........#.#..........",
      "#.#####..#.#..#####..",
      ".##.##.#.#.########.#",
      "#.#.####.##.###..###.",
      "#.#..#...#.###..###..",
      "...#.#####..###.....#",
      "........#.#.#...##..#",
      "#######....#..#...##.",
      "#.....#.#....#.#.####",
      "#.###.#.#..#..##....#",
      "#.###.#.##..######...",
      "#.###.#.##..#..#..#..",
      "#.....#..##.##..###..",
      "#######.##.##.#.#..#.",
    ],
  ],
  [
    "hello world",
    "L",
    [
      "#######..#.##.#######",
      "#.....#..###..#.....#",
      "#.###.#.##.##.#.###.#",
      "#.###.#..#.#..#.###.#",
      "#.###.#...#.#.#.###.#",
      "#.....#.....#.#.....#",
      "#######.#.#.#.#######",
      "........##.##........",
      "###.########.##...#..",
      "...#.#.####...###..##",
      "###.####.#..##.######",
      ".#..#..#.##.....#..#.",
      "###.#.##..#.##.##....",
      "........#..#.#..#.###",
      "#######.#..#...##.###",
      "#.....#.#####..#....#",
      "#.###.#.#.##....#....",
      "#.###.#..###..###.##.",
      "#.###.#.##..#.#.#.#.#",
      "#.....#.#.##....#..#.",
      "#######.##.##..#...##",
    ],
  ],
  [
    "Boa Città",
    "L",
    [
      "#######.#####.#######",
      "#.....#.##.##.#.....#",
      "#.###.#..###..#.###.#",
      "#.###.#..#.##.#.###.#",
      "#.###.#.#...#.#.###.#",
      "#.....#.#.#...#.....#",
      "#######.#.#.#.#######",
      "........####.........",
      "###..##.#########..##",
      "..#.#..#..#..#.####.#",
      ".######.#.#..##.#...#",
      ".####..##.#.###..#..#",
      "#.###.##.##..##.##.##",
      "........#.##...##....",
      "#######..#.##...#.#.#",
      "#.....#.####..##....#",
      "#.###.#...####.#.#.#.",
      "#.###.#..#......#....",
      "#.###.#.###..##.#####",
      "#.....#.###.#..###...",
      "#######.##...######.#",
    ],
  ],
];

describe("against a reference encoder", () => {
  it.each(REFERENCE)(
    "draws «%s» at %s as Apple's generator does",
    (text, ecc, rows) => {
      expect(picture(qrCodeOf(text, ecc)!.modules)).toEqual(rows);
    },
  );
});
