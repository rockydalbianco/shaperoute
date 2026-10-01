import done from "@shaperoute/shared-types/fixtures/themed-route-job-done.json";
import failed from "@shaperoute/shared-types/fixtures/themed-route-job-failed.json";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useThemedRoute } from "./useThemedRoute";

const request = { text: "luoghi famosi a Milano", centre: null, city: null };
const running = { job_id: "f00d", status: "running", result: null, error: null };

test("follows the job until the route is done", async () => {
  const fetchFn = jest
    .fn()
    .mockResolvedValueOnce(Response.json(running, { status: 202 }))
    .mockResolvedValueOnce(Response.json(running))
    .mockResolvedValueOnce(Response.json(done));
  const { result } = await renderHook(() =>
    useThemedRoute("http://api", { fetchFn, pollMs: 1 }),
  );
  await act(async () => result.current.ask(request));
  expect(result.current.state.status).not.toBe("idle");
  await waitFor(() => expect(result.current.state.status).toBe("done"));
  expect(fetchFn).toHaveBeenCalledTimes(3);
  expect(fetchFn.mock.calls[2][0]).toBe("http://api/themed-route-jobs/f00d");
});

test("a failed job says why, in the API's words", async () => {
  const fetchFn = jest.fn().mockResolvedValue(Response.json(failed, { status: 202 }));
  const { result } = await renderHook(() =>
    useThemedRoute("http://api", { fetchFn, pollMs: 1 }),
  );
  await act(async () => result.current.ask(request));
  await waitFor(() => expect(result.current.state.status).toBe("failed"));
  const state = result.current.state;
  expect(state.status === "failed" && state.message).toMatch(/Not enough verified/);
});

test("no API, or an API that does not answer, is said too", async () => {
  const { result } = await renderHook(() => useThemedRoute(null));
  await act(async () => result.current.ask(request));
  expect(result.current.state.status).toBe("failed");
  await act(async () => result.current.close());
  expect(result.current.state.status).toBe("idle");
});
