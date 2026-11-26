/**
 * A QR code of our own (TASK-479 part D4, ADR-0388): the text in byte
 * mode, error correction M (or L), the smallest version it fits, the mask
 * with the lowest penalty, as ISO/IEC 18004 says. No library: the app
 * draws the modules it gets here (`QrView`). After Project Nayuki's QR
 * code generator (MIT), cut down to what MuW needs.
 */

export type Ecc = "L" | "M";

export type QrCode = {
  version: number;
  size: number;
  /** Row by row, true for a dark module. */
  modules: boolean[][];
};

// Index 0 is unused: versions run from 1 to 40.
const ECC_CODEWORDS_PER_BLOCK: Readonly<Record<Ecc, readonly number[]>> = {
  L: [
    -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28,
    28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  M: [
    -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26,
    26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
  ],
};

const ERROR_CORRECTION_BLOCKS: Readonly<Record<Ecc, readonly number[]>> = {
  L: [
    -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12,
    12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25,
  ],
  M: [
    -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18,
    20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
  ],
};

const FORMAT_BITS: Readonly<Record<Ecc, number>> = { L: 1, M: 0 };

const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

/** The text's bytes in UTF-8. */
export function utf8(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return bytes;
}

function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) {
      result -= 36;
    }
  }
  return result;
}

function dataCodewords(version: number, ecc: Ecc): number {
  return (
    Math.floor(rawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ecc][version] * ERROR_CORRECTION_BLOCKS[ecc][version]
  );
}

function rsMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < result.length; j += 1) {
      result[j] = rsMultiply(result[j], root);
      if (j + 1 < result.length) {
        result[j] ^= result[j + 1];
      }
    }
    root = rsMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data: readonly number[], divisor: readonly number[]): number[] {
  const result = divisor.map(() => 0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() ?? 0);
    result.push(0);
    divisor.forEach((coefficient, i) => {
      result[i] ^= rsMultiply(coefficient, factor);
    });
  }
  return result;
}

const bit = (value: number, i: number): boolean => ((value >>> i) & 1) !== 0;

/** The codewords with their error correction, blocks interleaved. */
function withErrorCorrection(
  data: readonly number[],
  version: number,
  ecc: Ecc,
): number[] {
  const blocks = ERROR_CORRECTION_BLOCKS[ecc][version];
  const eccLength = ECC_CODEWORDS_PER_BLOCK[ecc][version];
  const raw = Math.floor(rawDataModules(version) / 8);
  const shortBlocks = blocks - (raw % blocks);
  const shortLength = Math.floor(raw / blocks);
  const divisor = rsDivisor(eccLength);
  const all: number[][] = [];
  for (let i = 0, k = 0; i < blocks; i += 1) {
    const block = data.slice(
      k,
      k + shortLength - eccLength + (i < shortBlocks ? 0 : 1),
    );
    k += block.length;
    const correction = rsRemainder(block, divisor);
    if (i < shortBlocks) {
      block.push(0);
    }
    all.push([...block, ...correction]);
  }
  const result: number[] = [];
  for (let i = 0; i < all[0].length; i += 1) {
    all.forEach((block, j) => {
      if (i !== shortLength - eccLength || j >= shortBlocks) {
        result.push(block[i]);
      }
    });
  }
  return result;
}

function alignmentPositions(version: number): number[] {
  if (version === 1) {
    return [];
  }
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let position = size - 7; result.length < count; position -= step) {
    result.splice(1, 0, position);
  }
  return result;
}

class Matrix {
  readonly size: number;
  readonly modules: boolean[][];
  readonly fixed: boolean[][];

  constructor(
    readonly version: number,
    readonly ecc: Ecc,
  ) {
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () =>
      new Array<boolean>(this.size).fill(false),
    );
    this.fixed = Array.from({ length: this.size }, () =>
      new Array<boolean>(this.size).fill(false),
    );
  }

  set(x: number, y: number, dark: boolean): void {
    this.modules[y][x] = dark;
    this.fixed[y][x] = true;
  }

  drawPatterns(): void {
    for (let i = 0; i < this.size; i += 1) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }
    this.finder(3, 3);
    this.finder(this.size - 4, 3);
    this.finder(3, this.size - 4);
    const positions = alignmentPositions(this.version);
    const n = positions.length;
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        if (!(
          (i === 0 && j === 0) ||
          (i === 0 && j === n - 1) ||
          (i === n - 1 && j === 0)
        )) {
          this.alignment(positions[i], positions[j]);
        }
      }
    }
    this.drawFormat(0);
    this.drawVersion();
  }

  finder(x: number, y: number): void {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.set(xx, yy, distance !== 2 && distance !== 4);
        }
      }
    }
  }

  alignment(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        this.set(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  drawFormat(mask: number): void {
    const data = (FORMAT_BITS[this.ecc] << 3) | mask;
    let rest = data;
    for (let i = 0; i < 10; i += 1) {
      rest = (rest << 1) ^ ((rest >>> 9) * 0x537);
    }
    const bits = ((data << 10) | rest) ^ 0x5412;
    for (let i = 0; i <= 5; i += 1) {
      this.set(8, i, bit(bits, i));
    }
    this.set(8, 7, bit(bits, 6));
    this.set(8, 8, bit(bits, 7));
    this.set(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i += 1) {
      this.set(14 - i, 8, bit(bits, i));
    }
    for (let i = 0; i < 8; i += 1) {
      this.set(this.size - 1 - i, 8, bit(bits, i));
    }
    for (let i = 8; i < 15; i += 1) {
      this.set(8, this.size - 15 + i, bit(bits, i));
    }
    this.set(8, this.size - 8, true);
  }

  drawVersion(): void {
    if (this.version < 7) {
      return;
    }
    let rest = this.version;
    for (let i = 0; i < 12; i += 1) {
      rest = (rest << 1) ^ ((rest >>> 11) * 0x1f25);
    }
    const bits = (this.version << 12) | rest;
    for (let i = 0; i < 18; i += 1) {
      const dark = bit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.set(a, b, dark);
      this.set(b, a, dark);
    }
  }

  drawCodewords(data: readonly number[]): void {
    let i = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) {
        right = 5;
      }
      for (let vertical = 0; vertical < this.size; vertical += 1) {
        for (let j = 0; j < 2; j += 1) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vertical : vertical;
          if (!this.fixed[y][x] && i < data.length * 8) {
            this.modules[y][x] = bit(data[i >>> 3], 7 - (i & 7));
            i += 1;
          }
        }
      }
    }
  }

  applyMask(mask: number): void {
    for (let y = 0; y < this.size; y += 1) {
      for (let x = 0; x < this.size; x += 1) {
        let invert: boolean;
        switch (mask) {
          case 0:
            invert = (x + y) % 2 === 0;
            break;
          case 1:
            invert = y % 2 === 0;
            break;
          case 2:
            invert = x % 3 === 0;
            break;
          case 3:
            invert = (x + y) % 3 === 0;
            break;
          case 4:
            invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
            break;
          case 5:
            invert = ((x * y) % 2) + ((x * y) % 3) === 0;
            break;
          case 6:
            invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
            break;
          default:
            invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
        }
        if (!this.fixed[y][x] && invert) {
          this.modules[y][x] = !this.modules[y][x];
        }
      }
    }
  }

  private addHistory(length: number, history: number[]): void {
    let run = length;
    if (history[0] === 0) {
      run += this.size;
    }
    history.pop();
    history.unshift(run);
  }

  private countPatterns(history: readonly number[]): number {
    const n = history[1];
    const core =
      n > 0 &&
      history[2] === n &&
      history[3] === n * 3 &&
      history[4] === n &&
      history[5] === n;
    return (
      (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0) +
      (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0)
    );
  }

  private terminate(dark: boolean, length: number, history: number[]): number {
    let run = length;
    if (dark) {
      this.addHistory(run, history);
      run = 0;
    }
    run += this.size;
    this.addHistory(run, history);
    return this.countPatterns(history);
  }

  penalty(): number {
    let result = 0;
    const at = (x: number, y: number, rows: boolean) =>
      rows ? this.modules[y][x] : this.modules[x][y];
    for (const rows of [true, false]) {
      for (let y = 0; y < this.size; y += 1) {
        let dark = false;
        let run = 0;
        const history = [0, 0, 0, 0, 0, 0, 0];
        for (let x = 0; x < this.size; x += 1) {
          if (at(x, y, rows) === dark) {
            run += 1;
            if (run === 5) {
              result += PENALTY_N1;
            } else if (run > 5) {
              result += 1;
            }
          } else {
            this.addHistory(run, history);
            if (!dark) {
              result += this.countPatterns(history) * PENALTY_N3;
            }
            dark = at(x, y, rows);
            run = 1;
          }
        }
        result += this.terminate(dark, run, history) * PENALTY_N3;
      }
    }
    for (let y = 0; y < this.size - 1; y += 1) {
      for (let x = 0; x < this.size - 1; x += 1) {
        const c = this.modules[y][x];
        if (
          c === this.modules[y][x + 1] &&
          c === this.modules[y + 1][x] &&
          c === this.modules[y + 1][x + 1]
        ) {
          result += PENALTY_N2;
        }
      }
    }
    const dark = this.modules.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
    const total = this.size * this.size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    return result + k * PENALTY_N4;
  }
}

/** The QR code of `text`; null when it is too long for any version. */
export function qrCodeOf(text: string, ecc: Ecc = "M"): QrCode | null {
  const bytes = utf8(text);
  let version = 0;
  for (let v = 1; v <= 40; v += 1) {
    const bits = 4 + (v < 10 ? 8 : 16) + bytes.length * 8;
    if (bits <= dataCodewords(v, ecc) * 8) {
      version = v;
      break;
    }
  }
  if (version === 0) {
    return null;
  }
  const bits: number[] = [];
  const append = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i -= 1) {
      bits.push((value >>> i) & 1);
    }
  };
  append(0b0100, 4);
  append(bytes.length, version < 10 ? 8 : 16);
  for (const byte of bytes) {
    append(byte, 8);
  }
  const capacity = dataCodewords(version, ecc) * 8;
  append(0, Math.min(4, capacity - bits.length));
  append(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) {
    append(pad, 8);
  }
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    data.push(bits.slice(i, i + 8).reduce((byte, one) => (byte << 1) | one, 0));
  }
  const matrix = new Matrix(version, ecc);
  matrix.drawPatterns();
  matrix.drawCodewords(withErrorCorrection(data, version, ecc));
  let best = 0;
  let lowest = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    matrix.applyMask(mask);
    matrix.drawFormat(mask);
    const penalty = matrix.penalty();
    if (penalty < lowest) {
      lowest = penalty;
      best = mask;
    }
    matrix.applyMask(mask);
  }
  matrix.applyMask(best);
  matrix.drawFormat(best);
  return { version, size: matrix.size, modules: matrix.modules };
}
