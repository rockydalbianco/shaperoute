import { File, Paths } from "expo-file-system";

/**
 * A list kept in a file of the app's documents, written so that a write cut
 * short loses nothing that was there (TASK-252). Writing a file empties it
 * first: with the phone full, or the app closed in between, the list would
 * be gone. So the new list goes first to a copy beside the file, then to
 * the file; reading, a file that is empty or broken gives way to the copy.
 */

/** Added to the file's name for its copy. */
export const COPY_SUFFIX = ".copy";

export type KeptList<T> = {
  /** The list in the file, in its order; empty when there is none or
   * neither the file nor its copy can be read. */
  load(): T[];
  /** Writes the list; false when the phone refuses (full, no access): the
   * list of before is then still read. */
  save(list: T[]): boolean;
};

function read<T>(
  fileOf: () => File,
  isItem: (value: unknown) => value is T,
): T[] | null {
  try {
    const file = fileOf();
    if (!file.exists) {
      return null;
    }
    const data: unknown = JSON.parse(file.textSync());
    return Array.isArray(data) ? data.filter(isItem) : null;
  } catch {
    return null;
  }
}

function write(file: File, text: string): void {
  file.create({ overwrite: true });
  file.write(text);
}

/** The list in the file `name` of the documents; what is not an item for
 * `isItem` is left out when reading. */
export function keptList<T>(
  name: string,
  isItem: (value: unknown) => value is T,
): KeptList<T> {
  const file = () => new File(Paths.document, name);
  const copy = () => new File(Paths.document, `${name}${COPY_SUFFIX}`);
  return {
    load() {
      return read(file, isItem) ?? read(copy, isItem) ?? [];
    },
    save(list) {
      try {
        if (list.length === 0) {
          // The copy first: stopped in between, the file still has the
          // whole list of before, and no copy brings an older one back.
          const beside = copy();
          if (beside.exists) {
            beside.delete();
          }
          const main = file();
          if (main.exists) {
            main.delete();
          }
          return true;
        }
        const text = JSON.stringify(list);
        write(copy(), text);
        write(file(), text);
        return true;
      } catch {
        return false;
      }
    },
  };
}
