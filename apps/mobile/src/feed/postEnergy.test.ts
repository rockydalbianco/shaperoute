import { postEnergy } from "./postEnergy";
import type { SamplePost } from "./sampleFeed";

const RUN: SamplePost = {
  id: "run",
  user: "Ada_runs",
  title: "Sunday heart",
  city: "Trento",
  shape: "heart",
  route_m: 4900,
  minutes: 27,
  score: 0,
  line: [],
};

test("a run's energy is the run screen's, from its distance", () => {
  // 4.9 km × 70 kg × 1.036 kcal.
  expect(postEnergy(RUN)).toBe("355 kcal");
  expect(postEnergy({ ...RUN, activity: "running" })).toBe("355 kcal");
});

test("a ride, a paddle or a run with no metres has none", () => {
  expect(postEnergy({ ...RUN, activity: "cycling" })).toBeNull();
  expect(postEnergy({ ...RUN, activity: "paddling" })).toBeNull();
  expect(postEnergy({ ...RUN, route_m: 0 })).toBeNull();
});
