import { gif } from "./gifWriter.testing";
import { MY_IMAGE, MY_IMAGE_GIF, MY_IMAGE_PHOTO, removeMyImage } from "./myImage";
import { actorName, prepareActorCall } from "./videoActor";
import { characterModel } from "./videoCharacter";

// The app's mockFolder, in memory: what the phone keeps of the runner's image.
const mockFolder = new Map<string, Uint8Array>();

jest.mock("expo-file-system", () => {
  class File {
    uri: string;
    constructor(directory: { uri: string } | string, name?: string) {
      this.uri = typeof directory === "string" ? directory : `${directory.uri}${name}`;
    }
    get exists() {
      return mockFolder.has(this.uri);
    }
    async bytes() {
      const bytes = mockFolder.get(this.uri);
      if (bytes === undefined) {
        throw new Error("no such file");
      }
      return bytes;
    }
    create() {}
    write(bytes: Uint8Array) {
      mockFolder.set(this.uri, bytes);
    }
    delete() {
      mockFolder.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///app/" } } };
});

jest.mock("./videoCharacter", () => ({
  ...jest.requireActual<typeof import("./videoCharacter")>("./videoCharacter"),
  characterModel: jest.fn(),
}));

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

/** Every way out of the app to the network, watched. */
function watchNetwork() {
  const fetch = jest.fn(async () => {
    throw new Error("no network in this test");
  });
  const open = jest.fn();
  const saved = { fetch: global.fetch, XMLHttpRequest: global.XMLHttpRequest };
  global.fetch = fetch as unknown as typeof global.fetch;
  global.XMLHttpRequest = class {
    open = open;
    send = jest.fn();
    setRequestHeader = jest.fn();
  } as unknown as typeof global.XMLHttpRequest;
  return {
    fetch,
    open,
    restore: () => {
      global.fetch = saved.fetch;
      global.XMLHttpRequest = saved.XMLHttpRequest;
    },
  };
}

/** The image read again from the mockFolder: as a new image would be. */
function reread() {
  removeMyImage({
    uriOf: () => null,
    bytesOf: async () => new Uint8Array(0),
    write: () => {},
    remove: () => {},
    shrink: async () => new Uint8Array(0),
  });
}

beforeEach(() => {
  mockFolder.clear();
  removeMyImage();
});

describe("prepareActorCall", () => {
  it("makes the runner's photo ready from the app's mockFolder, with nothing to or from the network", async () => {
    mockFolder.set(`file:///app/${MY_IMAGE_PHOTO}`, JPEG);
    reread();
    const network = watchNetwork();
    try {
      const call = await prepareActorCall(MY_IMAGE);
      expect(call).toBe(
        'window.muwVideo.prepareImage({"frames":[{"src":"data:image/jpeg;base64,/9j/4AECAwQ="}],"frameMs":[0]}); true;',
      );
      expect(call).not.toMatch(/https?:/);
      expect(network.fetch).not.toHaveBeenCalled();
      expect(network.open).not.toHaveBeenCalled();
    } finally {
      network.restore();
    }
  });

  it("makes a GIF ready as its frames", async () => {
    mockFolder.set(
      `file:///app/${MY_IMAGE_GIF}`,
      gif(1, 1, [{ indices: [0] }, { indices: [1] }]),
    );
    const call = await prepareActorCall(MY_IMAGE);
    expect(call).toMatch(/^window\.muwVideo\.prepareImage\(/);
    const spec = JSON.parse(
      call!.slice("window.muwVideo.prepareImage(".length, -"); true;".length),
    );
    expect(spec.frames).toHaveLength(2);
    expect(spec.frameMs).toEqual([100, 100]);
  });

  it("is null with no image, a broken GIF or an empty file: the video goes out without it", async () => {
    expect(await prepareActorCall(MY_IMAGE)).toBeNull();
    mockFolder.set(
      `file:///app/${MY_IMAGE_GIF}`,
      gif(1, 1, [{ indices: [0] }]).subarray(0, 20),
    );
    reread();
    expect(await prepareActorCall(MY_IMAGE)).toBeNull();
    mockFolder.clear();
    mockFolder.set(`file:///app/${MY_IMAGE_PHOTO}`, new Uint8Array(0));
    reread();
    expect(await prepareActorCall(MY_IMAGE)).toBeNull();
  });

  it("makes an animal ready from its model, and is null when the model does not read", async () => {
    jest.mocked(characterModel).mockResolvedValueOnce(Uint8Array.from([1, 2, 3]));
    expect(await prepareActorCall("fox")).toBe(
      'window.muwVideo.prepareCharacter({"model":"AQID"}); true;',
    );
    jest.mocked(characterModel).mockRejectedValueOnce(new Error("no model"));
    expect(await prepareActorCall("fox")).toBeNull();
  });
});

describe("actorName", () => {
  it("names the runner's image, an animal and none", () => {
    expect(actorName(MY_IMAGE)).toBe("My image");
    expect(actorName("fox")).toBe("Fox");
    expect(actorName(null)).toBe("No animal");
  });
});
