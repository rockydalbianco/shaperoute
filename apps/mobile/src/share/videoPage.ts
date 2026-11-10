import { MAPLIBRE_JS_SRI, MAPLIBRE_JS_URL } from "../map/mapPage";

/**
 * The page of the hidden WebView that makes a run's video (TASK-295,
 * ADR-0254): it draws each picture of a `VideoScene` on a canvas and
 * encodes it as H.264 with WebCodecs, which every iPhone the app runs on
 * has (iOS 16.4 and later). Nothing native and nothing new in the app: the
 * WebView is the one the map and the engine use.
 *
 * Under the pictures there is the map of the run (TASK-351, ADR-0303): the
 * same MapLibre GL JS as the map page, pinned, draws it once, at the size
 * of a phone's screen times three, and the page keeps its picture. Asked
 * before the scene with `window.muwVideo.prepareMap(map)`, it answers
 * `map` with whether the picture is there; without it the app sends the
 * scene on the yellow of the post, so the video always comes out.
 *
 * On «3D» (part D) the map leans on its hills: the page zooms it so the
 * line fills the drawing's box as the flat one does, takes the picture,
 * then tries the camera's turn on a dry run and measures what a picture
 * costs. Under the budget it keeps the map alive and draws it again for
 * every picture, the camera turning, the line laid on the hills each time
 * (mode `orbit`); over it, or when the time runs out, the one picture is
 * zoomed slowly instead (mode `still`). The video comes out either way.
 * When the scene opens with the drawing (TASK-408, part C2), the map's
 * description says `flat`: the page first takes its picture from straight
 * above, where the scene's flat line lies, then leans it on its hills.
 *
 * The app talks to it with `window.muwVideo.make(scene)`
 * (injectJavaScript); it answers with `ReactNativeWebView.postMessage`, one
 * JSON message each (`VideoPageMessage`). The pictures leave it encoded, in
 * base64, and the app puts them in an MP4 file (mp4.ts).
 */

/** The times a step took, in milliseconds, for the measures of TASK-351. */
export type PageTimes = Record<string, number>;

/** How the page draws the map under the pictures: the one picture of a
 * flat map; the one picture of the leaning map, zoomed slowly; the
 * leaning map drawn again for every picture, the camera turning; or, with
 * «Camera behind» (TASK-408, part C2b), the camera following the animal. */
export type MapMode = "flat" | "still" | "orbit" | "chase";

/** What the page says to the app. */
export type VideoPageMessage =
  /** Loaded; `codec` is null when this WebView cannot encode the video. */
  | { type: "ready"; codec: string | null }
  /** Still waiting for the map's tiles: a word, so the app does not give up. */
  | { type: "waiting"; ms: number }
  /** The map's picture is there (`ok`), or not and why; `mode` how the
   * map will be drawn, when it is there. */
  | {
      type: "map";
      ok: boolean;
      why: string | null;
      ms: PageTimes;
      mode?: MapMode | null;
    }
  /** How to decode the pictures: the avcC record, in base64. */
  | { type: "config"; avcC: string }
  /** Encoded pictures, in order: `time` in microseconds, `data` in base64. */
  | { type: "chunks"; list: { key: boolean; time: number; data: string }[] }
  /** Pictures given to the encoder so far. */
  | { type: "progress"; frames: number }
  /** All the pictures given; `mode` how the map was drawn under them. */
  | { type: "done"; frames: number; ms: PageTimes; mode?: MapMode }
  /** The animal is ready to be drawn (`ok`), or not and why: the video then
   * comes without it, the pen's tip on the line as before (TASK-408). */
  | { type: "character"; ok: boolean; why: string | null; ms: number }
  /** In the preview (TASK-408, part C2c): the second shown. */
  | { type: "time"; seconds: number }
  | { type: "failed"; error: string };

/**
 * three.js, for the animal of the video (TASK-408, ADR-0339): the last
 * release with a build for a plain script, pinned, and checked against its
 * hash as MapLibre is. The page loads it only when an animal is asked; on a
 * phone with no network it does not come, and the video is made without
 * the animal.
 */
export const THREE_VERSION = "0.159.0";
export const THREE_JS_URL = `https://unpkg.com/three@${THREE_VERSION}/build/three.min.js`;
export const THREE_JS_SRI =
  "sha384-Lwojr+0fOVR25P8bdL6E0T2dv0q0ZT4Yy2Ia1dGOz6b5jLSzWZkdqlw0cKTQYKzT";

/**
 * H.264 Baseline only, at level 4 and up (1080 × 1920 needs it): Baseline
 * has no B-frames, so each picture shows in the order it is decoded and the
 * file needs no composition times. Main and High would allow them.
 */
export const VIDEO_CODECS = ["avc1.42e028", "avc1.42e02a", "avc1.420028"] as const;

/** Bits a second: a video of flat yellow and black lines needs far fewer. */
const BITRATE = 6_000_000;
/** Pictures waiting in the encoder before the page waits for it. */
const QUEUE = 3;
/** Encoded pictures in one message to the app. */
const BATCH = 10;
/** While the map's tiles come, a word to the app this often. */
const WAITING_EVERY_MS = 4000;
/** The map is drawn from a timer this often while its tiles come, and the
 * picture is taken once it has been whole for this many beats: the WebView
 * is kept out of sight, and iOS may then stop the page's animation frames,
 * which MapLibre draws on (TASK-351, the fix of 2026-11-03). */
const PULSE_MS = 100;
const PULSES_STILL = 3;
/** The dark under the words: as opaque as this at the bottom edge, along a
 * smoothstep from clear at the top (tools/ui_scrim.py), unless the scene's
 * op says how opaque (the light veil of «Day», TASK-351 part C). */
const SCRIM_PEAK = 0.82;
/** On «3D», the bearings the dry run draws the map at, from one end of the
 * turn to the other: once for the tiles of every bearing to come, once to
 * measure what a picture costs. */
const DRY_RUN_STEPS = 12;
/** The dry run's passes, and how long it waits for the tiles between them. */
const DRY_RUN_PASSES = 2;
const DRY_RUN_TILES_MS = 2000;
/** How long the animal may take to be ready, three.js and its model. */
const CHARACTER_WAIT_MS = 10_000;
/** The square the animal is drawn in, in pixels, before it is laid on the
 * picture; how far around it the camera sees, in lengths of the animal; and
 * how far back along the line its heading is taken, in lengths. */
const CHARACTER_PX = 512;
const CHARACTER_VIEW = 1.2;
const CHARACTER_LOOK_BACK = 0.6;
/** How far ahead of the line's tip the animal's middle is, in lengths: the
 * line comes out from under its hind legs. */
const CHARACTER_AHEAD = 0.25;
/** The runner's own image in place of the animal (TASK-417, ADR-0345): its
 * width, as a share of the animal's length; how far it leans into the way
 * the line goes, at most, in degrees; its ring, as a share of its width;
 * and on «3D», how high it stands on its stick, in widths. */
const IMAGE_SIZE = 0.6;
const IMAGE_LEAN = 12;
const IMAGE_RING = 0.06;
const IMAGE_STICK = 0.55;

/** The app's own font on each phone, then any. */
const FONT = '-apple-system, system-ui, Roboto, "Helvetica Neue", sans-serif';

// Plain ES2017 inside a template string: it runs in the WebView, not in
// Hermes, and is never transformed.
const SCRIPT = String.raw`
(function () {
  "use strict";
  var CODECS = ${JSON.stringify(VIDEO_CODECS)};
  var BITRATE = ${BITRATE};
  var QUEUE = ${QUEUE};
  var BATCH = ${BATCH};
  var WAITING_EVERY_MS = ${WAITING_EVERY_MS};
  var PULSE_MS = ${PULSE_MS};
  var PULSES_STILL = ${PULSES_STILL};
  var SCRIM_PEAK = ${SCRIM_PEAK};
  var DRY_RUN_STEPS = ${DRY_RUN_STEPS};
  var DRY_RUN_PASSES = ${DRY_RUN_PASSES};
  var DRY_RUN_TILES_MS = ${DRY_RUN_TILES_MS};
  var THREE_JS_URL = ${JSON.stringify(THREE_JS_URL)};
  var THREE_JS_SRI = ${JSON.stringify(THREE_JS_SRI)};
  var CHARACTER_WAIT_MS = ${CHARACTER_WAIT_MS};
  var CHARACTER_PX = ${CHARACTER_PX};
  var CHARACTER_VIEW = ${CHARACTER_VIEW};
  var CHARACTER_LOOK_BACK = ${CHARACTER_LOOK_BACK};
  var CHARACTER_AHEAD = ${CHARACTER_AHEAD};
  var IMAGE_SIZE = ${IMAGE_SIZE};
  var IMAGE_LEAN = ${IMAGE_LEAN};
  var IMAGE_RING = ${IMAGE_RING};
  var IMAGE_STICK = ${IMAGE_STICK};
  var FONT = ${JSON.stringify(FONT)};
  var codec = null;
  var started = false;
  // The map's picture, once prepared, and how long its steps took.
  var background = null;
  // On «3D», the map's picture from straight above too, for the opening's
  // drawing (TASK-408, part C2), when the scene asks for it.
  var flatBackground = null;
  var mapTimes = {};
  var preparing = false;
  // How the map is drawn under the pictures: "flat", "still" or "orbit".
  var mode = "flat";
  // On "orbit", the map kept alive for the video, with its box and what it
  // was prepared from; on «3D», the run's line as the map lays it on the
  // hills at rest, in pixels of the video, and the middle of the drawing's
  // box, in pixels, that the still picture is zoomed about.
  var live = null;
  var lineAtRest = null;
  var boxMiddle = null;
  // «Camera behind» (TASK-408, part C2b): the camera on the whole drawing,
  // which the scene's cameras behind the animal are reached from, and the
  // metres run up to each point of the line, by which the scene places
  // things along it (the leaning picture stretches its pixels).
  var restCamera = null;
  var geoRun = null;
  // The animal, once ready (TASK-408): its model, camera and canvas; or
  // the runner's own image (TASK-417): its frames and their times.
  var actor = null;
  var casting = false;

  function post(message) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }

  function messageOf(error) {
    return String((error && error.message) || error);
  }

  function now() {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function bytesOf(source) {
    return source instanceof ArrayBuffer
      ? new Uint8Array(source)
      : new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  }

  function base64(bytes) {
    var text = "";
    for (var i = 0; i < bytes.length; i += 0x8000) {
      text += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(text);
  }

  function configOf(scene, name) {
    return {
      codec: name,
      width: scene.width,
      height: scene.height,
      bitrate: BITRATE,
      framerate: scene.fps,
      latencyMode: "realtime",
      avc: { format: "avc" }
    };
  }

  // The first codec this WebView encodes at the video's size.
  async function findCodec() {
    if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") {
      return null;
    }
    for (var i = 0; i < CODECS.length; i += 1) {
      try {
        var support = await VideoEncoder.isConfigSupported(
          configOf({ width: 1080, height: 1920, fps: 30 }, CODECS[i])
        );
        if (support.supported) {
          return CODECS[i];
        }
      } catch (error) {
        // Not this one.
      }
    }
    return null;
  }

  // How long a path (x0, y0, x1, y1, …) is, in pixels.
  function lengthOf(path) {
    var length = 0;
    for (var i = 2; i < path.length; i += 2) {
      length += Math.hypot(path[i] - path[i - 2], path[i + 1] - path[i - 1]);
    }
    return length;
  }

  // The point upTo pixels along the path; its end past its length.
  function pointAlong(path, upTo) {
    var walked = 0;
    for (var i = 2; i < path.length; i += 2) {
      var step = Math.hypot(path[i] - path[i - 2], path[i + 1] - path[i - 1]);
      if (walked + step >= upTo && step > 0) {
        var share = (upTo - walked) / step;
        return [
          path[i - 2] + (path[i] - path[i - 2]) * share,
          path[i - 1] + (path[i + 1] - path[i - 1]) * share
        ];
      }
      walked += step;
    }
    return [path[path.length - 2], path[path.length - 1]];
  }

  // The run's line as the map lays it now, in pixels of the video.
  function projectLine(map, spec) {
    var out = [];
    for (var i = 0; i < spec.line.length; i += 1) {
      var at = map.project(spec.line[i]);
      out.push(at.x * spec.pixelRatio, at.y * spec.pixelRatio);
    }
    return out;
  }

  // The metres run up to each point of a line of [lon, lat], on a flat
  // plane about its start, as the app measures it (videoChase).
  function metresRun(line) {
    var run = [0];
    if (line.length === 0) {
      return run;
    }
    var k = 111195 * Math.cos((line[0][1] * Math.PI) / 180);
    for (var i = 1; i < line.length; i += 1) {
      run.push(run[i - 1] + Math.hypot((line[i][0] - line[i - 1][0]) * k, (line[i][1] - line[i - 1][1]) * 111195));
    }
    return run;
  }

  // How far along the laid line, in pixels, "share" of the run is: by
  // metres when the camera follows the animal, by pixels otherwise.
  function shareLength(path, share) {
    if (mode !== "chase" || geoRun === null || geoRun.length * 2 !== path.length || geoRun.length < 2) {
      return share * lengthOf(path);
    }
    var target = share * geoRun[geoRun.length - 1];
    var walked = 0;
    for (var i = 1; i < geoRun.length; i += 1) {
      var step = Math.hypot(path[2 * i] - path[2 * i - 2], path[2 * i + 1] - path[2 * i - 1]);
      if (geoRun[i] >= target) {
        var span = geoRun[i] - geoRun[i - 1];
        return walked + (span > 0 ? step * (target - geoRun[i - 1]) / span : 0);
      }
      walked += step;
    }
    return walked;
  }

  // The camera "u" of the way from a to b, the bearing the short way round.
  function blendCamera(a, b, u) {
    var turn = ((((b.bearing - a.bearing) % 360) + 540) % 360) - 180;
    return {
      center: [a.center[0] + (b.center[0] - a.center[0]) * u, a.center[1] + (b.center[1] - a.center[1]) * u],
      zoom: a.zoom + (b.zoom - a.zoom) * u,
      bearing: a.bearing + turn * u,
      pitch: a.pitch + (b.pitch - a.pitch) * u
    };
  }

  // The line zoomed about the box's middle, as the still picture is.
  function zoomedLine(path, zoom, middle) {
    var out = [];
    for (var i = 0; i < path.length; i += 2) {
      out.push(
        middle[0] + (path[i] - middle[0]) * zoom,
        middle[1] + (path[i + 1] - middle[1]) * zoom
      );
    }
    return out;
  }

  // The leaning map zoomed and moved so the line fills the drawing's box
  // as the flat one does: the box less the line's width, in points. Two
  // passes, as the perspective changes with the zoom.
  function fitLeaning(map, spec) {
    if (!spec.line || spec.line.length < 2) {
      return;
    }
    var p = spec.camera.padding;
    var innerWidth = spec.width - p.left - p.right - 2 * spec.pad;
    var innerHeight = spec.height - p.top - p.bottom - 2 * spec.pad;
    for (var pass = 0; pass < 2; pass += 1) {
      var minX = Infinity;
      var minY = Infinity;
      var maxX = -Infinity;
      var maxY = -Infinity;
      for (var i = 0; i < spec.line.length; i += 1) {
        var at = map.project(spec.line[i]);
        minX = Math.min(minX, at.x);
        maxX = Math.max(maxX, at.x);
        minY = Math.min(minY, at.y);
        maxY = Math.max(maxY, at.y);
      }
      var factor = Math.min(
        innerWidth / Math.max(maxX - minX, 1e-6),
        innerHeight / Math.max(maxY - minY, 1e-6)
      );
      var middle = map.unproject([(minX + maxX) / 2, (minY + maxY) / 2]);
      map.jumpTo({
        center: [middle.lng, middle.lat],
        zoom: map.getZoom() + Math.log2(factor)
      });
    }
  }

  // The map drawn once, at the camera the scene asks, and kept as a picture
  // (TASK-351). Every tile in view, or none: a hole is worse than no map.
  // On «3D», then the fit, the dry run of the turn, and the mode.
  function prepareMap(spec) {
    try {
      prepare(spec);
    } catch (error) {
      // Thrown before the map's timers were set, on a description the page
      // cannot read: the video goes on without the map, as without the
      // library.
      post({ type: "map", ok: false, why: messageOf(error), ms: mapTimes, mode: null });
    }
  }

  function prepare(spec) {
    if (preparing || background !== null) {
      return;
    }
    preparing = true;
    var t0 = now();
    var relief = !!spec.terrain;
    // First from straight above, for the opening's drawing, then leaning.
    var flatFirst = relief && !!spec.flat;
    var settled = false;
    var errors = 0;
    var timer = null;
    var beat = null;
    var pulse = null;
    var pulses = 0;
    var still = 0;
    var busy = false;
    var terrainOn = false;
    // (flat →) tiles → (fit →) shot → (dry →) done
    var phase = flatFirst ? "flat" : "tiles";
    var box = null;
    var map = null;
    mode = relief ? "still" : "flat";
    var pad = spec.camera.padding;
    boxMiddle = [
      ((pad.left + spec.width - pad.right) / 2) * spec.pixelRatio,
      ((pad.top + spec.height - pad.bottom) / 2) * spec.pixelRatio
    ];
    function release() {
      try {
        if (map !== null) {
          map.remove();
        }
        if (box !== null && box.parentNode) {
          box.parentNode.removeChild(box);
        }
      } catch (error) {
        // Gone already.
      }
      map = null;
      box = null;
    }
    // The map as it is now, drawn once more right now, so the picture is
    // of the whole map whatever the page's frames did.
    function pictureOf() {
      try {
        map.redraw();
      } catch (error) {
        // The picture is taken as it is.
      }
      var picture = document.createElement("canvas");
      picture.width = spec.width * spec.pixelRatio;
      picture.height = spec.height * spec.pixelRatio;
      picture.getContext("2d").drawImage(map.getCanvas(), 0, 0, picture.width, picture.height);
      return picture;
    }
    function takePicture() {
      var t = now();
      background = pictureOf();
      mapTimes.snapshot = Math.round(now() - t);
      if (relief) {
        lineAtRest = projectLine(map, spec);
      }
    }
    function finish(ok, why) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      clearInterval(beat);
      clearInterval(pulse);
      mapTimes.map = Math.round(now() - t0);
      mapTimes.pulses = pulses;
      try {
        var loads = performance.getEntriesByType("resource").filter(function (entry) {
          return entry.name.indexOf("maplibre") >= 0;
        });
        if (loads.length > 0) {
          mapTimes.lib = Math.round(loads[0].duration);
        }
      } catch (error) {
        // No timing of the library: nothing lost.
      }
      if (ok && background === null) {
        try {
          takePicture();
        } catch (error) {
          ok = false;
          why = messageOf(error);
        }
      }
      if (ok && (mode === "orbit" || mode === "chase")) {
        live = { map: map, box: box, spec: spec };
      } else {
        release();
      }
      post({ type: "map", ok: ok, why: why || null, ms: mapTimes, mode: ok ? mode : null });
    }
    // The camera's turn tried before the video: a pass for the tiles of
    // every bearing to come, then a pass to measure what a picture costs
    // (the map drawn and copied, the line laid on the hills), as the median.
    // With «Camera behind», the scene's cameras along the run instead.
    function dryRun() {
      var cameras = spec.chase ? spec.chase.cameras : null;
      var steps = cameras !== null ? cameras.length : DRY_RUN_STEPS;
      return new Promise(function (resolve, reject) {
        var scratch = document.createElement("canvas");
        scratch.width = spec.width * spec.pixelRatio;
        scratch.height = spec.height * spec.pixelRatio;
        var g = scratch.getContext("2d");
        var costs = [];
        var pass = 0;
        var k = 0;
        var waited = 0;
        function step() {
          if (settled) {
            resolve(Infinity);
            return;
          }
          if (k >= steps) {
            k = 0;
            pass += 1;
            if (pass >= DRY_RUN_PASSES) {
              map.jumpTo(cameras !== null ? restCamera : { bearing: spec.camera.bearing });
              costs.sort(function (a, b) { return a - b; });
              resolve(Math.round(costs[Math.floor(costs.length / 2)] * 10) / 10);
              return;
            }
            // The tiles of every bearing, before the measure.
            waited = 0;
            setTimeout(tiles, PULSE_MS);
            return;
          }
          var t = now();
          try {
            if (cameras !== null) {
              map.jumpTo(cameras[k]);
            } else {
              var share = DRY_RUN_STEPS > 1 ? k / (DRY_RUN_STEPS - 1) : 0;
              map.jumpTo({ bearing: spec.camera.bearing + spec.turn.from + (spec.turn.to - spec.turn.from) * share });
            }
            map.redraw();
            g.drawImage(map.getCanvas(), 0, 0, scratch.width, scratch.height);
            projectLine(map, spec);
          } catch (error) {
            reject(error);
            return;
          }
          if (pass === DRY_RUN_PASSES - 1) {
            costs.push(now() - t);
          }
          k += 1;
          setTimeout(step, 0);
        }
        function tiles() {
          if (settled) {
            resolve(Infinity);
            return;
          }
          waited += PULSE_MS;
          try {
            map.redraw();
          } catch (error) {
            reject(error);
            return;
          }
          if ((map.loaded() && map.areTilesLoaded()) || waited >= DRY_RUN_TILES_MS) {
            step();
          } else {
            setTimeout(tiles, PULSE_MS);
          }
        }
        step();
      });
    }
    // Every tile in view is there: the next step of the phase. A step
    // draws the map itself, and the map says idle again while it does,
    // from inside redraw: busy keeps that from starting the step again.
    function whole() {
      if (settled || busy) {
        return;
      }
      if (errors > 0) {
        finish(false, "tiles");
        return;
      }
      busy = true;
      try {
        if (phase === "flat") {
          // The picture from straight above, then the map leaning on its
          // hills, and whole once more.
          flatBackground = pictureOf();
          phase = "tiles";
          still = 0;
          map.jumpTo({ pitch: spec.camera.pitch });
          return;
        }
        if (phase === "tiles" && relief) {
          // Drawn again at the fitted camera, and whole once more.
          phase = "fit";
          still = 0;
          fitLeaning(map, spec);
          return;
        }
        phase = "shot";
        takePicture();
        if (relief && (spec.turn || spec.chase)) {
          if (spec.chase) {
            var middle = map.getCenter();
            restCamera = {
              center: [middle.lng, middle.lat],
              zoom: map.getZoom(),
              bearing: map.getBearing(),
              pitch: map.getPitch()
            };
            geoRun = metresRun(spec.line);
          }
          // Busy until the dry run is over.
          phase = "dry";
          dryRun().then(
            function (frameMs) {
              if (settled) {
                return;
              }
              busy = false;
              mapTimes.frame = frameMs;
              mode = frameMs <= spec.budgetMs ? (spec.chase ? "chase" : "orbit") : "still";
              finish(true, null);
            },
            function () {
              // The one picture, zoomed slowly, then.
              busy = false;
              finish(true, null);
            }
          );
          return;
        }
        finish(true, null);
      } catch (error) {
        finish(false, messageOf(error));
      } finally {
        if (phase !== "dry") {
          busy = false;
        }
      }
    }
    function raise() {
      if (relief && !terrainOn) {
        terrainOn = true;
        try {
          map.setTerrain(spec.terrain);
        } catch (error) {
          finish(false, messageOf(error));
        }
      }
    }
    if (typeof maplibregl === "undefined") {
      finish(false, "no library");
      return;
    }
    try {
      box = document.createElement("div");
      box.style.width = spec.width + "px";
      box.style.height = spec.height + "px";
      document.body.appendChild(box);
      map = new maplibregl.Map({
        container: box,
        style: spec.style,
        center: spec.camera.center,
        zoom: spec.camera.zoom,
        bearing: spec.camera.bearing,
        pitch: flatFirst ? 0 : spec.camera.pitch,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
        pixelRatio: spec.pixelRatio,
        // Without it the canvas is empty by the time it is read.
        canvasContextAttributes: { preserveDrawingBuffer: true }
      });
      map.setPadding(spec.camera.padding);
      map.jumpTo({
        center: spec.camera.center,
        zoom: spec.camera.zoom,
        bearing: spec.camera.bearing,
        pitch: flatFirst ? 0 : spec.camera.pitch
      });
    } catch (error) {
      finish(false, messageOf(error));
      return;
    }
    map.on("error", function () {
      errors += 1;
    });
    // The hills once the style is there, then every tile in view.
    map.on("load", raise);
    map.on("idle", whole);
    timer = setTimeout(function () {
      if (background !== null) {
        mode = "still";
        finish(true, null);
      } else {
        finish(false, "timeout");
      }
    }, spec.waitMs);
    beat = setInterval(function () { post({ type: "waiting", ms: Math.round(now() - t0) }); }, WAITING_EVERY_MS);
    // The map drawn from a timer as well, and the picture taken once every
    // tile in view has been there for a few beats: with no animation frames
    // MapLibre would neither ask for its tiles nor say idle.
    pulse = setInterval(function () {
      if (settled || busy) {
        return;
      }
      pulses += 1;
      try {
        map.redraw();
      } catch (error) {
        finish(false, messageOf(error));
        return;
      }
      if (settled) {
        // Whole on that drawing, and done.
        return;
      }
      if (!terrainOn && typeof map.isStyleLoaded === "function" && map.isStyleLoaded()) {
        raise();
      }
      if (map.loaded() && map.areTilesLoaded()) {
        still += 1;
        if (still >= PULSES_STILL) {
          still = 0;
          whole();
        }
      } else {
        still = 0;
      }
    }, PULSE_MS);
  }

  // The map let go after the video, when it was kept for the turn.
  function releaseLive() {
    if (live === null) {
      return;
    }
    try {
      live.map.remove();
      if (live.box.parentNode) {
        live.box.parentNode.removeChild(live.box);
      }
    } catch (error) {
      // Gone already.
    }
    live = null;
  }

  // three.js, from its pinned address and checked against its hash, once.
  function loadThree() {
    return new Promise(function (resolve, reject) {
      if (typeof THREE !== "undefined") {
        resolve();
        return;
      }
      var tag = document.createElement("script");
      tag.integrity = THREE_JS_SRI;
      tag.crossOrigin = "anonymous";
      tag.onload = function () {
        if (typeof THREE !== "undefined") {
          resolve();
        } else {
          reject(new Error("no three"));
        }
      };
      tag.onerror = function () {
        reject(new Error("three did not load"));
      };
      tag.src = THREE_JS_URL;
      (document.head || document.body).appendChild(tag);
    });
  }

  function bytesOfBase64(text) {
    var binary = atob(text);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // A .glb as its JSON and its binary chunk.
  function glbOf(bytes) {
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(0, true) !== 0x46546c67) {
      throw new Error("not a glb");
    }
    var jsonLength = view.getUint32(12, true);
    var json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)));
    var binLength = view.getUint32(20 + jsonLength, true);
    var binStart = 28 + jsonLength;
    return { json: json, bin: bytes.subarray(binStart, binStart + binLength) };
  }

  var COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

  // An accessor's numbers, copied out so they are aligned. The models are
  // written with each attribute on its own (shrink.mjs): no strides.
  function numbersOf(glb, index) {
    var accessor = glb.json.accessors[index];
    var view = glb.json.bufferViews[accessor.bufferView];
    var Type = {
      5120: Int8Array,
      5121: Uint8Array,
      5122: Int16Array,
      5123: Uint16Array,
      5125: Uint32Array,
      5126: Float32Array
    }[accessor.componentType];
    var count = accessor.count * COMPONENTS[accessor.type];
    var start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
    var copy = glb.bin.slice(start, start + count * Type.BYTES_PER_ELEMENT);
    return { array: new Type(copy.buffer), size: COMPONENTS[accessor.type], normalized: !!accessor.normalized };
  }

  function attributeOf(glb, index) {
    var n = numbersOf(glb, index);
    return new THREE.BufferAttribute(n.array, n.size, n.normalized);
  }

  // The animal of a .glb as three.js objects: its nodes, its skinned
  // meshes in their flat colours, and its gallop and rest as clips.
  function modelOf(glb) {
    var json = glb.json;
    var joints = {};
    (json.skins || []).forEach(function (skin) {
      skin.joints.forEach(function (j) { joints[j] = true; });
    });
    var nodes = json.nodes.map(function (node, i) {
      var object = joints[i] ? new THREE.Bone() : new THREE.Object3D();
      object.name = "n" + i;
      if (node.matrix) {
        new THREE.Matrix4().fromArray(node.matrix).decompose(object.position, object.quaternion, object.scale);
      }
      if (node.translation) {
        object.position.fromArray(node.translation);
      }
      if (node.rotation) {
        object.quaternion.fromArray(node.rotation);
      }
      if (node.scale) {
        object.scale.fromArray(node.scale);
      }
      return object;
    });
    json.nodes.forEach(function (node, i) {
      (node.children || []).forEach(function (child) { nodes[i].add(nodes[child]); });
    });
    var root = new THREE.Group();
    json.scenes[json.scene || 0].nodes.forEach(function (i) { root.add(nodes[i]); });
    var materials = (json.materials || []).map(function (material) {
      var factor = (material.pbrMetallicRoughness || {}).baseColorFactor || [1, 1, 1, 1];
      return new THREE.MeshLambertMaterial({
        color: new THREE.Color().setRGB(factor[0], factor[1], factor[2]),
        flatShading: true
      });
    });
    var fallback = new THREE.MeshLambertMaterial({ color: 0x888888, flatShading: true });
    var skinned = [];
    json.nodes.forEach(function (node, i) {
      if (node.mesh === undefined) {
        return;
      }
      json.meshes[node.mesh].primitives.forEach(function (primitive) {
        var a = primitive.attributes;
        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", attributeOf(glb, a.POSITION));
        if (a.NORMAL !== undefined) {
          geometry.setAttribute("normal", attributeOf(glb, a.NORMAL));
        }
        if (primitive.indices !== undefined) {
          geometry.setIndex(attributeOf(glb, primitive.indices));
        }
        var material = primitive.material === undefined ? fallback : materials[primitive.material];
        var mesh;
        if (node.skin !== undefined && a.JOINTS_0 !== undefined) {
          geometry.setAttribute("skinIndex", attributeOf(glb, a.JOINTS_0));
          geometry.setAttribute("skinWeight", attributeOf(glb, a.WEIGHTS_0));
          mesh = new THREE.SkinnedMesh(geometry, material);
          skinned.push({ mesh: mesh, skin: json.skins[node.skin] });
        } else {
          mesh = new THREE.Mesh(geometry, material);
        }
        mesh.frustumCulled = false;
        nodes[i].add(mesh);
      });
    });
    root.updateMatrixWorld(true);
    skinned.forEach(function (one) {
      var bones = one.skin.joints.map(function (j) { return nodes[j]; });
      var inverses = bones.map(function () { return new THREE.Matrix4(); });
      if (one.skin.inverseBindMatrices !== undefined) {
        var m = numbersOf(glb, one.skin.inverseBindMatrices).array;
        inverses = bones.map(function (bone, k) { return new THREE.Matrix4().fromArray(m, k * 16); });
      }
      // Bound with no matrix of its own: glTF ignores the transform of a
      // skinned mesh's node, which the joints already carry. The elephant's
      // mesh sits under turned and scaled nodes (TASK-408 B2); the
      // Quaternius animals', at the origin, draw the same either way.
      one.mesh.bind(new THREE.Skeleton(bones, inverses), new THREE.Matrix4());
    });
    // Once more, so a bound mesh has its node's matrix to undo before its
    // size is measured: without it the elephant measured a few centimetres
    // and was drawn far too big, out of sight.
    root.updateMatrixWorld(true);
    var PATHS = { translation: "position", rotation: "quaternion", scale: "scale" };
    var clips = {};
    (json.animations || []).forEach(function (animation) {
      var tracks = [];
      animation.channels.forEach(function (channel) {
        var path = PATHS[channel.target.path];
        if (!path || channel.target.node === undefined) {
          return;
        }
        var sampler = animation.samplers[channel.sampler];
        var Track = path === "quaternion" ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack;
        tracks.push(new Track(
          "n" + channel.target.node + "." + path,
          numbersOf(glb, sampler.input).array,
          numbersOf(glb, sampler.output).array,
          sampler.interpolation === "STEP" ? THREE.InterpolateDiscrete : THREE.InterpolateLinear
        ));
      });
      clips[animation.name] = new THREE.AnimationClip(animation.name, -1, tracks);
    });
    return { root: root, clips: clips };
  }

  // The animal ready to draw: one length long, its feet on the ground a
  // little ahead of the middle, lit from above, seen from a camera that
  // sees around it.
  function actorOf(model) {
    var box = new THREE.Box3().setFromObject(model.root);
    var size = box.getSize(new THREE.Vector3());
    var scale = 1 / Math.max(size.x, size.z, 1e-6);
    var center = box.getCenter(new THREE.Vector3());
    model.root.scale.setScalar(scale);
    model.root.position.set(
      -center.x * scale,
      -box.min.y * scale,
      CHARACTER_AHEAD - center.z * scale
    );
    var turn = new THREE.Group();
    turn.add(model.root);
    var stage = new THREE.Scene();
    stage.add(turn);
    stage.add(new THREE.HemisphereLight(0xffffff, 0x6b6b6b, 2.2));
    var sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(-1, 3, 2);
    stage.add(sun);
    var camera = new THREE.OrthographicCamera(
      -CHARACTER_VIEW, CHARACTER_VIEW, CHARACTER_VIEW, -CHARACTER_VIEW, 0.1, 20
    );
    var canvas = document.createElement("canvas");
    canvas.width = CHARACTER_PX;
    canvas.height = CHARACTER_PX;
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(1);
    renderer.setSize(CHARACTER_PX, CHARACTER_PX, false);
    renderer.setClearColor(0x000000, 0);
    var mixer = new THREE.AnimationMixer(model.root);
    var clips = {
      run: model.clips.Gallop || null,
      rest: model.clips.Idle || model.clips.Gallop || null
    };
    return {
      canvas: canvas,
      turn: turn,
      stage: stage,
      camera: camera,
      renderer: renderer,
      mixer: mixer,
      actions: {
        run: clips.run ? mixer.clipAction(clips.run) : null,
        rest: clips.rest ? mixer.clipAction(clips.rest) : null
      },
      heading: 0
    };
  }

  // The animal asked by the app, made ready before the video: three.js,
  // then its model. Within its time, or not at all.
  function prepareCharacter(spec) {
    if (casting || actor !== null) {
      return;
    }
    casting = true;
    var t0 = now();
    var settled = false;
    function finish(ok, why) {
      if (settled) {
        return;
      }
      settled = true;
      post({ type: "character", ok: ok, why: why, ms: Math.round(now() - t0) });
    }
    var timer = setTimeout(function () { finish(false, "timeout"); }, CHARACTER_WAIT_MS);
    loadThree().then(function () {
      if (settled) {
        return;
      }
      clearTimeout(timer);
      actor = actorOf(modelOf(glbOf(bytesOfBase64(spec.model))));
      finish(true, null);
    }).catch(function (error) {
      clearTimeout(timer);
      actor = null;
      finish(false, messageOf(error));
    });
  }

  // The animal at upTo pixels along the path, turned along the line as it
  // came there, in its clip at its time, from the camera's height.
  function drawCharacter(g, path, upTo, op) {
    var back = op.size * CHARACTER_LOOK_BACK;
    var here = pointAlong(path, upTo);
    var from = pointAlong(path, Math.max(0, upTo - back));
    var to = pointAlong(path, Math.max(upTo, back));
    var dx = to[0] - from[0];
    var dy = to[1] - from[1];
    var tilt = (op.tilt || 50) * Math.PI / 180;
    if (Math.hypot(dx, dy) > 0.5) {
      // A step down the picture is a step towards the camera, shortened.
      actor.heading = Math.atan2(dx, dy / Math.max(Math.sin(tilt), 0.1));
    }
    actor.turn.rotation.y = actor.heading;
    var action = actor.actions[op.clip] || actor.actions.run;
    actor.mixer.stopAllAction();
    if (action !== null) {
      action.reset();
      action.play();
      actor.mixer.setTime(Math.max(0, op.time));
    }
    actor.camera.position.set(0, Math.sin(tilt) * 5, Math.cos(tilt) * 5);
    actor.camera.lookAt(0, 0, 0);
    actor.renderer.render(actor.stage, actor.camera);
    var side = 2 * CHARACTER_VIEW * op.size;
    g.drawImage(actor.canvas, here[0] - side / 2, here[1] - side / 2, side, side);
  }

  // One frame of the runner's image, ready to draw: a JPEG through an img,
  // a GIF's frame from its pixels through a canvas of its own.
  function imageFrameOf(frame) {
    if (typeof frame.src === "string") {
      return new Promise(function (resolve, reject) {
        var img = document.createElement("img");
        img.onload = function () { resolve(img); };
        img.onerror = function () { reject(new Error("the image did not load")); };
        img.src = frame.src;
      });
    }
    var bytes = bytesOfBase64(frame.rgba || "");
    if (!(frame.width > 0 && frame.height > 0) || bytes.length !== frame.width * frame.height * 4) {
      return Promise.reject(new Error("the frame's pixels are not whole"));
    }
    var canvas = document.createElement("canvas");
    canvas.width = frame.width;
    canvas.height = frame.height;
    var g = canvas.getContext("2d");
    var data = g.createImageData(frame.width, frame.height);
    data.data.set(bytes);
    g.putImageData(data, 0, 0);
    return Promise.resolve(canvas);
  }

  // The runner's own image (TASK-417), made ready before the video in place
  // of an animal: no three.js, nothing from the network, only its frames.
  function prepareImage(spec) {
    if (casting || actor !== null) {
      return;
    }
    casting = true;
    var t0 = now();
    var settled = false;
    function finish(ok, why) {
      if (settled) {
        return;
      }
      settled = true;
      post({ type: "character", ok: ok, why: why, ms: Math.round(now() - t0) });
    }
    var timer = setTimeout(function () { finish(false, "timeout"); }, CHARACTER_WAIT_MS);
    var frames = (spec && spec.frames) || [];
    // Each frame in a promise of its own: a frame that throws as it is read
    // fails the image, not the page.
    Promise.all(frames.map(function (frame) {
      return Promise.resolve(frame).then(imageFrameOf);
    })).then(function (made) {
      if (settled) {
        return;
      }
      clearTimeout(timer);
      if (made.length === 0) {
        finish(false, "no frames");
        return;
      }
      var ms = made.map(function (_, i) { return Math.max(0, (spec.frameMs || [])[i] || 0); });
      actor = {
        image: true,
        frames: made,
        frameMs: ms,
        loop: ms.reduce(function (a, b) { return a + b; }, 0),
        lean: 0
      };
      finish(true, null);
    }).catch(function (error) {
      clearTimeout(timer);
      actor = null;
      finish(false, messageOf(error));
    });
  }

  // The frame of the image at seconds into its clip: a GIF round and round
  // on its own times, a photo still.
  function imageFrameAt(seconds) {
    if (actor.frames.length === 1 || actor.loop <= 0) {
      return actor.frames[0];
    }
    var at = (Math.max(0, seconds) * 1000) % actor.loop;
    for (var i = 0; i < actor.frames.length; i += 1) {
      at -= actor.frameMs[i];
      if (at < 0) {
        return actor.frames[i];
      }
    }
    return actor.frames[actor.frames.length - 1];
  }

  // The runner's image at upTo pixels along the path: round, in a ring of
  // the line's colour, hopping as the scene says, leaning a little into the
  // way the line goes and never upside down. On «3D» it stands on a stick
  // over its round shadow, where the line is on the hills.
  function drawImageActor(g, scene, path, upTo, op, standing) {
    var here = pointAlong(path, upTo);
    var from = pointAlong(path, Math.max(0, upTo - op.size * CHARACTER_LOOK_BACK));
    var dx = here[0] - from[0];
    var dy = here[1] - from[1];
    var far = Math.hypot(dx, dy);
    if (far > 0.5) {
      actor.lean = (dx / far) * IMAGE_LEAN * Math.PI / 180;
    }
    var side = op.size * IMAGE_SIZE;
    var hop = op.hop || 0;
    var ring = scene.colors.line || scene.colors.ink;
    var y = here[1] - hop;
    g.save();
    g.globalAlpha = typeof op.alpha === "number" ? op.alpha : 1;
    if (standing) {
      var stick = side * IMAGE_STICK;
      // The shadow shrinks a little as the image hops up.
      g.fillStyle = "rgba(0, 0, 0, 0.35)";
      g.beginPath();
      g.ellipse(here[0], here[1], side * 0.3 * (1 - hop / side / 2), side * 0.1, 0, 0, 2 * Math.PI);
      g.fill();
      g.strokeStyle = ring;
      g.lineWidth = Math.max(2, side * IMAGE_RING * 0.6);
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(here[0], here[1]);
      g.lineTo(here[0], here[1] - stick - hop);
      g.stroke();
      y = here[1] - stick - hop - side / 2;
    }
    var frame = imageFrameAt(op.time || 0);
    var w = frame.naturalWidth || frame.width || 1;
    var h = frame.naturalHeight || frame.height || 1;
    var fit = side / Math.min(w, h);
    g.translate(here[0], y);
    g.rotate(actor.lean);
    g.beginPath();
    g.arc(0, 0, side / 2, 0, 2 * Math.PI);
    g.closePath();
    g.save();
    g.clip();
    g.drawImage(frame, -w * fit / 2, -h * fit / 2, w * fit, h * fit);
    g.restore();
    g.lineWidth = side * IMAGE_RING;
    g.strokeStyle = ring;
    g.stroke();
    g.restore();
  }

  // The path from its start to upTo pixels along it.
  function stroke(g, path, upTo) {
    g.beginPath();
    g.moveTo(path[0], path[1]);
    var walked = 0;
    for (var i = 2; i < path.length; i += 2) {
      var dx = path[i] - path[i - 2];
      var dy = path[i + 1] - path[i - 1];
      var step = Math.hypot(dx, dy);
      if (walked + step >= upTo) {
        var share = step > 0 ? (upTo - walked) / step : 0;
        g.lineTo(path[i - 2] + dx * share, path[i - 1] + dy * share);
        break;
      }
      g.lineTo(path[i], path[i + 1]);
      walked += step;
    }
    g.stroke();
  }

  // A square with round corners, as a path.
  function roundRect(g, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + radius, y);
    g.lineTo(x + w - radius, y);
    g.arc(x + w - radius, y + radius, radius, -Math.PI / 2, 0);
    g.lineTo(x + w, y + h - radius);
    g.arc(x + w - radius, y + h - radius, radius, 0, Math.PI / 2);
    g.lineTo(x + radius, y + h);
    g.arc(x + radius, y + h - radius, radius, Math.PI / 2, Math.PI);
    g.lineTo(x, y + radius);
    g.arc(x + radius, y + radius, radius, Math.PI, 1.5 * Math.PI);
    g.closePath();
  }

  // A colour as "r, g, b" for an rgba() string.
  function rgbOf(hex) {
    var n = parseInt(hex.slice(1, 7), 16);
    return ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255);
  }

  // Letters spaced by the canvas when it can, else one at a time.
  var spaced = typeof CanvasRenderingContext2D !== "undefined" &&
    "letterSpacing" in CanvasRenderingContext2D.prototype;

  function widthOf(g, text, tracking) {
    var width = g.measureText(text).width;
    return spaced || tracking === 0 ? width : width + tracking * Math.max(0, text.length - 1);
  }

  function write(g, text, x, y, align, tracking) {
    if (spaced || tracking === 0) {
      g.textAlign = align;
      g.fillText(text, x, y);
      return;
    }
    var width = widthOf(g, text, tracking);
    var at = align === "center" ? x - width / 2 : x;
    g.textAlign = "left";
    for (var i = 0; i < text.length; i += 1) {
      g.fillText(text[i], at, y);
      at += g.measureText(text[i]).width + tracking;
    }
  }

  // The words in at most "lines" lines of "width", the last cut with «…».
  function wrap(g, words, width, lines, tracking) {
    var out = [];
    var rest = words.split(" ");
    while (rest.length > 0 && out.length < lines) {
      var line = rest.shift();
      while (rest.length > 0 && widthOf(g, line + " " + rest[0], tracking) <= width) {
        line += " " + rest.shift();
      }
      out.push(line);
    }
    if (rest.length > 0) {
      out[out.length - 1] += " " + rest.join(" ");
    }
    var last = out[out.length - 1];
    if (widthOf(g, last, tracking) > width) {
      while (last.length > 1 && widthOf(g, last + "…", tracking) > width) {
        last = last.slice(0, -1);
      }
      out[out.length - 1] = last.trimEnd() + "…";
    }
    return out;
  }

  function colorOf(scene, role) {
    return scene.colors[role] || scene.colors.ink;
  }

  function draw(g, scene, ops) {
    g.globalAlpha = 1;
    g.fillStyle = scene.colors.paper;
    g.fillRect(0, 0, scene.width, scene.height);
    g.lineCap = "round";
    g.lineJoin = "round";
    if (spaced) {
      g.letterSpacing = "0px";
    }
    // The run's line as the map lays it for this picture, on «3D».
    var laid = lineAtRest;
    for (var i = 0; i < ops.length; i += 1) {
      var op = ops[i];
      if (op.alpha <= 0) {
        continue;
      }
      g.globalAlpha = Math.min(1, op.alpha);
      if (op.k === "map") {
        if (op.flat) {
          // From straight above, when the page has that picture; the
          // leaning one under it stays otherwise.
          if (flatBackground !== null) {
            g.drawImage(flatBackground, 0, 0, scene.width, scene.height);
          }
        } else if (live !== null && mode === "chase") {
          live.map.jumpTo(op.chase ? blendCamera(restCamera, op.chase, op.u || 0) : restCamera);
          live.map.redraw();
          g.drawImage(live.map.getCanvas(), 0, 0, scene.width, scene.height);
          laid = projectLine(live.map, live.spec);
        } else if (live !== null && mode === "orbit") {
          live.map.jumpTo({ bearing: live.spec.camera.bearing + (op.turn || 0) });
          live.map.redraw();
          g.drawImage(live.map.getCanvas(), 0, 0, scene.width, scene.height);
          laid = projectLine(live.map, live.spec);
        } else if (background !== null) {
          var zoom = typeof op.zoom === "number" ? op.zoom : 1;
          if (zoom !== 1 && boxMiddle !== null) {
            g.save();
            g.translate(boxMiddle[0], boxMiddle[1]);
            g.scale(zoom, zoom);
            g.translate(-boxMiddle[0], -boxMiddle[1]);
            g.drawImage(background, 0, 0, scene.width, scene.height);
            g.restore();
            if (laid !== null) {
              laid = zoomedLine(laid, zoom, boxMiddle);
            }
          } else {
            g.drawImage(background, 0, 0, scene.width, scene.height);
          }
        }
      } else if (op.k === "scrim") {
        var shade = g.createLinearGradient(0, op.top, 0, scene.height);
        var rgb = rgbOf(scene.colors.scrim);
        var peak = typeof op.peak === "number" ? op.peak : SCRIM_PEAK;
        for (var s = 0; s <= 8; s += 1) {
          var t = s / 8;
          shade.addColorStop(t, "rgba(" + rgb + ", " + peak * t * t * (3 - 2 * t) + ")");
        }
        g.fillStyle = shade;
        g.fillRect(0, op.top, scene.width, scene.height - op.top);
      } else if (op.k === "rect") {
        roundRect(g, op.x, op.y, op.w, op.h, op.r);
        g.fillStyle = colorOf(scene, op.color);
        g.fill();
      } else if (op.k === "line") {
        var onHills = typeof op.share === "number" && laid !== null;
        var path = onHills ? laid : scene.paths[op.path];
        if (path && path.length >= 4) {
          g.strokeStyle = colorOf(scene, op.color);
          g.lineWidth = op.width;
          stroke(g, path, onHills ? shareLength(path, op.share) : op.upTo);
        }
      } else if (op.k === "dot") {
        var x = op.x;
        var y = op.y;
        if (typeof op.share === "number" && laid !== null && laid.length >= 4) {
          var at = pointAlong(laid, shareLength(laid, op.share));
          x = at[0];
          y = at[1];
        }
        g.beginPath();
        g.arc(x, y, op.r, 0, 2 * Math.PI);
        g.fillStyle = colorOf(scene, op.fill);
        g.fill();
        if (op.ring > 0) {
          // Inside the dot, as a border in the app.
          g.beginPath();
          g.arc(x, y, Math.max(0, op.r - op.ring / 2), 0, 2 * Math.PI);
          g.strokeStyle = colorOf(scene, op.ringColor);
          g.lineWidth = op.ring;
          g.stroke();
        }
      } else if (op.k === "text") {
        g.font = op.weight + " " + op.size + "px " + FONT;
        g.fillStyle = colorOf(scene, op.color);
        g.textBaseline = "middle";
        if (spaced) {
          g.letterSpacing = op.tracking + "px";
        }
        var lines = wrap(g, op.text, op.maxWidth, op.lines, op.tracking);
        for (var j = 0; j < lines.length; j += 1) {
          write(g, lines[j], op.x, op.y + op.size * 1.2 * (j + 0.5), op.align, op.tracking);
        }
        if (spaced) {
          g.letterSpacing = "0px";
        }
      } else if (op.k === "emoji") {
        var ex = op.x;
        var ey = op.y;
        if (typeof op.share === "number" && laid !== null && laid.length >= 4) {
          var on = pointAlong(laid, shareLength(laid, op.share));
          ex = on[0];
          ey = on[1];
        }
        g.font = op.size * op.scale + "px " + FONT;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(op.text, ex, ey);
      } else if (op.k === "character" && actor !== null) {
        var onTheHills = typeof op.share === "number" && laid !== null;
        var track = onTheHills ? laid : scene.paths[op.path];
        if (track && track.length >= 4) {
          var along = onTheHills ? shareLength(track, op.share) : op.upTo;
          if (actor.image) {
            drawImageActor(g, scene, track, along, op, typeof op.share === "number");
          } else {
            drawCharacter(g, track, along, op);
          }
        }
      }
    }
  }

  async function make(scene) {
    var t0 = now();
    var canvas = document.createElement("canvas");
    canvas.width = scene.width;
    canvas.height = scene.height;
    var g = canvas.getContext("2d");
    var pending = [];
    var failure = null;
    var configured = false;
    function send() {
      if (pending.length > 0) {
        post({ type: "chunks", list: pending });
        pending = [];
      }
    }
    var encoder = new VideoEncoder({
      output: function (chunk, meta) {
        var config = meta && meta.decoderConfig;
        if (!configured && config && config.description) {
          configured = true;
          post({ type: "config", avcC: base64(bytesOf(config.description)) });
        }
        var bytes = new Uint8Array(chunk.byteLength);
        chunk.copyTo(bytes);
        pending.push({ key: chunk.type === "key", time: chunk.timestamp, data: base64(bytes) });
        if (pending.length >= BATCH) {
          send();
        }
      },
      error: function (error) {
        failure = messageOf(error);
      }
    });
    encoder.configure(configOf(scene, codec));
    var step = 1e6 / scene.fps;
    for (var i = 0; i < scene.frames.length; i += 1) {
      if (failure !== null) {
        throw new Error(failure);
      }
      draw(g, scene, scene.frames[i]);
      var frame = new VideoFrame(canvas, {
        timestamp: Math.round(i * step),
        duration: Math.round(step)
      });
      // A picture to start from every two seconds.
      encoder.encode(frame, { keyFrame: i % (scene.fps * 2) === 0 });
      frame.close();
      while (encoder.encodeQueueSize > QUEUE && failure === null) {
        await wait(4);
      }
      if (i % 15 === 0) {
        post({ type: "progress", frames: i });
      }
    }
    await encoder.flush();
    if (failure !== null) {
      throw new Error(failure);
    }
    encoder.close();
    if (!configured) {
      throw new Error("the encoder gave no avcC");
    }
    send();
    mapTimes.encode = Math.round(now() - t0);
    post({ type: "done", frames: scene.frames.length, ms: mapTimes, mode: mode });
  }

  // The preview of «Edit video» (TASK-408, part C2c): the scene's
  // pictures drawn as they come, on a canvas over the whole page, round
  // and round, with no encoding; the map and the animal as for the video.
  // A new scene takes the old one's place at the same second; "pause"
  // holds the picture. The second shown goes to the app four times a
  // second.
  var playing = null;
  var PLAY_STEP_MS = 33;
  var TIME_EVERY_MS = 250;
  function play(scene) {
    if (playing === null) {
      var canvas = document.createElement("canvas");
      canvas.style.position = "fixed";
      canvas.style.left = "0";
      canvas.style.top = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.zIndex = "10";
      var wide = (window.innerWidth || scene.width) * (window.devicePixelRatio || 1);
      var k = Math.min(1, wide / scene.width);
      canvas.width = Math.round(scene.width * k);
      canvas.height = Math.round(scene.height * k);
      document.body.appendChild(canvas);
      var g = canvas.getContext("2d");
      g.setTransform(k, 0, 0, k, 0, 0);
      playing = { scene: scene, g: g, start: now(), paused: false, at: 0, drawn: -1, told: 0 };
      tick();
      return;
    }
    playing.scene = scene;
    playing.drawn = -1;
  }
  function secondsOf(p) {
    var length = p.scene.frames.length / p.scene.fps;
    return p.paused ? p.at : ((now() - p.start) / 1000) % length;
  }
  function tick() {
    var p = playing;
    if (p === null) {
      return;
    }
    var at = secondsOf(p);
    var i = Math.min(p.scene.frames.length - 1, Math.floor(at * p.scene.fps));
    if (i !== p.drawn) {
      try {
        draw(p.g, p.scene, p.scene.frames[i]);
      } catch (error) {
        // A picture not drawn: the next one is tried.
      }
      p.drawn = i;
    }
    if (now() - p.told >= TIME_EVERY_MS) {
      p.told = now();
      post({ type: "time", seconds: Math.round(at * 10) / 10 });
    }
    setTimeout(tick, PLAY_STEP_MS);
  }
  function pause() {
    if (playing !== null && !playing.paused) {
      playing.at = secondsOf(playing);
      playing.paused = true;
    }
  }
  function stop() {
    playing = null;
  }
  function resume() {
    if (playing !== null && playing.paused) {
      playing.start = now() - playing.at * 1000;
      playing.paused = false;
    }
  }

  window.muwVideo = {
    prepareMap: prepareMap,
    prepareCharacter: prepareCharacter,
    prepareImage: prepareImage,
    play: play,
    pause: pause,
    resume: resume,
    stop: stop,
    make: function (scene) {
      if (started) {
        return;
      }
      started = true;
      make(scene).then(releaseLive, function (error) {
        releaseLive();
        post({ type: "failed", error: messageOf(error) });
      });
    }
  };

  findCodec().then(
    function (found) {
      codec = found;
      post({ type: "ready", codec: found });
    },
    function () {
      post({ type: "ready", codec: null });
    }
  );
})();
`;

/** A frame of animation from a timer, every this many milliseconds. */
const FRAME_MS = 16;

/**
 * Animation frames from a timer, put in place before MapLibre loads
 * (TASK-351, the fix of 2026-11-03): iOS gives a page it keeps out of
 * sight no animation frames, and MapLibre loads its style and draws on
 * them, so the map never came and the video fell back on the yellow. The
 * page's timers run wherever it is, as the pictures' encoding has shown
 * since TASK-295. Nothing here needs a smooth frame: a timer is enough.
 */
const FRAMES = String.raw`
(function () {
  "use strict";
  var FRAME_MS = ${FRAME_MS};
  var next = 0;
  var timers = {};
  window.requestAnimationFrame = function (callback) {
    next += 1;
    var id = next;
    timers[id] = setTimeout(function () {
      delete timers[id];
      callback(performance.now());
    }, FRAME_MS);
    return id;
  };
  window.cancelAnimationFrame = function (id) {
    clearTimeout(timers[id]);
    delete timers[id];
  };
})();
`;

/**
 * The whole page: the frames from a timer, MapLibre GL JS from the same
 * pinned address as the map page, for the map under the video, then the
 * script. Nothing else from the network: the tiles come through the map,
 * and only once the app asks.
 */
export const VIDEO_PAGE = `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body>
<script>${FRAMES}</script>
<script src="${MAPLIBRE_JS_URL}" integrity="${MAPLIBRE_JS_SRI}" crossorigin="anonymous"></script>
<script>${SCRIPT}</script>
</body>
</html>
`;

/** Where the page says it is: an https address, so WebCodecs, which only
 * secure pages have, is there. It never loads anything from it. */
export const VIDEO_PAGE_BASE = "https://video.muw.invalid/";

/** What the app asks the page to do: make the video of `sceneJson`. */
export function makeCall(sceneJson: string): string {
  return `window.muwVideo.make(${sceneJson}); true;`;
}

/** What the preview asks (TASK-408, part C2c): play `sceneJson` round and
 * round, in place of what it plays now; hold the picture; go on. */
export function playCall(sceneJson: string): string {
  return `window.muwVideo.play(${sceneJson}); true;`;
}

export function pauseCall(): string {
  return "window.muwVideo.pause(); true;";
}

export function resumeCall(): string {
  return "window.muwVideo.resume(); true;";
}

/** What the app asks first with an animal: make it ready, from its model
 * (`modelBase64`, the .glb's bytes). */
export function prepareCharacterCall(modelBase64: string): string {
  return `window.muwVideo.prepareCharacter(${JSON.stringify({ model: modelBase64 })}); true;`;
}

/**
 * The runner's own image for the page (TASK-417, ADR-0345): a JPEG as a
 * data URL, or a GIF's frames as their RGBA in base64, each shown for its
 * `frameMs`, round and round.
 */
export type PageImageFrame =
  { src: string } | { width: number; height: number; rgba: string };

export type PageImage = { frames: PageImageFrame[]; frameMs: number[] };

/** What the app asks first with the runner's image in place of an animal:
 * make it ready, from its frames. Nothing in it points to the network. */
export function prepareImageCall(image: PageImage): string {
  return `window.muwVideo.prepareImage(${JSON.stringify(image)}); true;`;
}

/** What the app asks first, on the map looks: draw the map of `mapJson`. */
export function prepareMapCall(mapJson: string): string {
  return `window.muwVideo.prepareMap(${mapJson}); true;`;
}
