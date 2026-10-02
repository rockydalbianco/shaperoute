/**
 * A keychain in memory, for the tests (TASK-115): what expo-secure-store
 * keeps on the phone. Used as
 * `jest.mock("expo-secure-store", () => jest.requireActual("…/testing").memorySecureStore())`.
 */
export function memorySecureStore() {
  const kept = new Map<string, string>();
  return {
    kept,
    getItem: jest.fn((key: string) => kept.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      kept.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      kept.delete(key);
    }),
  };
}

export type MemorySecureStore = ReturnType<typeof memorySecureStore>;

/** A fetch that answers each call with the next of `answers`, in order. */
export function answers(
  ...list: (
    { status: number; body?: unknown; headers?: Record<string, string> } | Error
  )[]
) {
  return jest.fn(async (_url: string, _init?: RequestInit) => {
    const next = list.shift();
    if (next === undefined) {
      throw new Error("No answer left for this request");
    }
    if (next instanceof Error) {
      throw next;
    }
    return next.body === undefined
      ? new Response(null, { status: next.status, headers: next.headers })
      : Response.json(next.body, { status: next.status, headers: next.headers });
  });
}

export function apiError(code: string, message = "…") {
  return { error: { code, message, suggested_distance_m: null, reason: null } };
}

/** A fetch that holds its answer until `answer` is called: for what shows while waiting. */
export function held() {
  let answer: (response: Response) => void = () => {};
  const fetchFn = jest.fn(
    (_url: string, _init?: RequestInit) =>
      new Promise<Response>((resolve) => {
        answer = resolve;
      }),
  );
  return {
    fetchFn,
    answer: (status: number, body?: unknown) =>
      answer(
        body === undefined
          ? new Response(null, { status })
          : Response.json(body, { status }),
      ),
  };
}
