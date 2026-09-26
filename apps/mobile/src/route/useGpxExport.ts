import type { RouteResult } from "@shaperoute/shared-types";
import { useCallback, useState } from "react";

import { requestGpx } from "../api/gpx";
import { shareGpx } from "./shareGpx";
import type { AnyRouteRequest, RouteProblem } from "./useRouteRequest";

export type ExportState =
  | { status: "idle" }
  | { status: "preparing"; result: RouteResult }
  | { status: "failed"; result: RouteResult; problem: RouteProblem };

/**
 * «Export GPX»: the API writes the file, the phone shares it. The state
 * names the route it is about, so a new route leaves an old failure behind.
 */
export function useGpxExport(baseUrl: string | null): {
  state: ExportState;
  exportGpx: (request: AnyRouteRequest, result: RouteResult) => void;
} {
  const [state, setState] = useState<ExportState>({ status: "idle" });

  const exportGpx = useCallback(
    (request: AnyRouteRequest, result: RouteResult) => {
      const fail = (problem: RouteProblem) =>
        setState({ status: "failed", result, problem });
      if (!baseUrl) {
        fail({ kind: "no_api_url" });
        return;
      }
      setState({ status: "preparing", result });
      void (async () => {
        const gpx = await requestGpx(baseUrl, { request, result });
        if (gpx.kind !== "gpx") {
          fail(gpx);
          return;
        }
        try {
          const shared = await shareGpx(gpx.text, gpx.fileName);
          if (shared === "no_sharing") {
            fail({ kind: "no_sharing" });
            return;
          }
        } catch {
          fail({ kind: "share_failed" });
          return;
        }
        setState({ status: "idle" });
      })();
    },
    [baseUrl],
  );

  return { state, exportGpx };
}
