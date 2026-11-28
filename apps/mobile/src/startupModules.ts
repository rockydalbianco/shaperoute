/**
 * The modules that must run when the app opens, for what they do on loading
 * (TASK-500, ADR-0404). With Metro's inline requires a module runs the first
 * time one of its names is used: these are imported here for their effect,
 * from index.ts, before anything is drawn.
 *
 * - navigation/runPosition: defines the background task of the run's
 *   positions. iOS may start the app in the background to hand it
 *   positions, before any screen uses the module, and expo-task-manager
 *   wants the task defined by then.
 * - gym/gymIntro: listens to the sport chosen from the app's start, so the
 *   sheet of «Gym» comes up at its first touch, before any gym screen has
 *   used the module.
 *
 * A new module that subscribes or registers on loading, and is not used by
 * the first page, goes here.
 */
import "./navigation/runPosition";
import "./gym/gymIntro";
