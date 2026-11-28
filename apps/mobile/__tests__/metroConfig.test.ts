/**
 * Metro with inline requires (TASK-500, ADR-0404), and the modules that must
 * still run when the app opens: with inline requires a module runs the first
 * time one of its names is used, so these are imported for their effect from
 * index.ts (src/startupModules.ts).
 */
import { RUN_LOCATION_TASK } from "../src/navigation/runPosition";

jest.mock("expo", () => ({ registerRootComponent: jest.fn() }));
// The app itself, out of the way: only index.ts's own imports load.
jest.mock("../src/intro/Root", () => ({ Root: () => null }));
jest.mock("expo-location", () => ({
  Accuracy: { BestForNavigation: 6 },
  ActivityType: { Fitness: 3 },
  isBackgroundLocationAvailableAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));
jest.mock("expo-task-manager", () => ({
  defineTask: jest.fn(),
  isAvailableAsync: jest.fn(),
}));
jest.mock("../src/settings/sport", () => ({
  ...jest.requireActual("../src/settings/sport"),
  subscribeSport: jest.fn(() => () => {}),
}));

// Expo's own config, as a stand-in: the real one does not load under jest's
// React Native environment. That Metro builds with this file is checked by
// `npx expo export` (TASK-500 part 0).
jest.mock("expo/metro-config", () => ({
  getDefaultConfig: jest.fn((projectRoot: string) => ({
    projectRoot,
    resolver: { assetExts: ["png", "zip", "m4a"] },
    transformer: { babelTransformerPath: "expo-babel-transformer" },
  })),
}));

type TransformOptions = { transform: Record<string, unknown> };
type MetroConfig = {
  projectRoot: string;
  resolver: { assetExts: string[] };
  transformer: {
    babelTransformerPath: string;
    getTransformOptions: (...args: unknown[]) => Promise<TransformOptions>;
  };
};

function metroConfig(): MetroConfig {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../metro.config.js") as MetroConfig;
}

describe("metro.config.js", () => {
  it("turns on inline requires, and nothing else of the transform", async () => {
    const options = await metroConfig().transformer.getTransformOptions(
      ["./index.ts"],
      { dev: false, hot: false, platform: "ios" },
      async () => [],
    );
    expect(options.transform).toEqual({
      experimentalImportSupport: false,
      inlineRequires: true,
    });
  });

  it("starts from Expo's config of the app's folder and keeps the rest", () => {
    const config = metroConfig();
    expect(config.projectRoot).toMatch(/apps\/mobile$/);
    expect(config.resolver.assetExts).toEqual(["png", "zip", "m4a"]);
    expect(config.transformer.babelTransformerPath).toBe("expo-babel-transformer");
  });
});

describe("index.ts", () => {
  // index.ts in a registry of its own: what it loads, and nothing the tests
  // above loaded.
  let defineTask: jest.Mock;
  let subscribeSport: jest.Mock;
  beforeAll(() => {
    jest.isolateModules(() => {
      /* eslint-disable @typescript-eslint/no-require-imports */
      require("../index");
      defineTask = require("expo-task-manager").defineTask as jest.Mock;
      subscribeSport = require("../src/settings/sport").subscribeSport as jest.Mock;
      /* eslint-enable @typescript-eslint/no-require-imports */
    });
  });

  it("defines the run's background task when the app opens", () => {
    expect(defineTask).toHaveBeenCalledWith(RUN_LOCATION_TASK, expect.any(Function));
  });

  it("follows the sport chosen from the app's start, for the gym's sheet", () => {
    // gym/gymIntro.ts is the only module that subscribes when it loads.
    expect(subscribeSport).toHaveBeenCalledTimes(1);
  });
});
