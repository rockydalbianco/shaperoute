/**
 * What the page says about using the app, sport by sport (`docs/SITO.md`).
 *
 * Each line describes something the app does today: change it here when the
 * app changes, not in the page.
 */

export const sports = [
  {
    id: "run",
    label: "Run",
    facts: ["Up to 21 km", "Real streets", "Voice turn by turn"],
    steps: [
      {
        title: "Pick a shape",
        text: "A heart, a star, a cat, a word from A to Z, or the outline of your own photo.",
      },
      {
        title: "Set the distance",
        text: "Up to 21 km, starting from where you are or from any place you search.",
      },
      {
        title: "Choose your route",
        text: "Sgrava draws up to three routes on real streets. Keep the one you like.",
      },
      {
        title: "Run it",
        text: "Follow the voice turn by turn, or take the GPX file to your watch. At the end, a score tells how close you drew it.",
      },
    ],
  },
  {
    id: "bike",
    label: "Bike",
    facts: ["10 to 30 km", "Cycle paths and open streets", "Speed in km/h"],
    steps: [
      {
        title: "Pick a shape",
        text: "The same shapes, drawn larger: a bike covers more map.",
      },
      {
        title: "Set the distance",
        text: "From 10 to 30 km, on cycle paths and on streets open to bikes.",
      },
      {
        title: "Choose your route",
        text: "Sgrava keeps to one-way streets and stays off stairs and roads closed to bikes.",
      },
      {
        title: "Ride it",
        text: "Turns are called ahead of time, and the screen shows your speed in km/h.",
      },
    ],
  },
  {
    id: "paddle",
    label: "Paddle",
    facts: ["1 to 5 km", "Lakes and sea", "Close to the shore"],
    steps: [
      {
        title: "Pick the water",
        text: "A lake or a stretch of sea: Explore lists the lakes, the nearest first.",
      },
      {
        title: "Pick a shape",
        text: "A heart, a star, a moon and more: shapes that read well on open water.",
      },
      {
        title: "Set the distance",
        text: "From 1 to 5 km. The shape stays within reach of the shore, clear of the bank.",
      },
      {
        title: "Paddle it",
        text: "Read the safety notice, then follow the line on the map from your canoe, kayak or board.",
      },
    ],
  },
];

/** The app's pages, as the cards under the steps. */
export const pages = [
  {
    name: "Draw",
    text: "Your shape, your distance, your start. The route is yours to keep or change.",
  },
  {
    name: "Explore",
    text: "Routes already drawn in your city, ready to start: no waiting, just pick one.",
  },
  {
    name: "Profile",
    text: "Your saved runs, your favourite routes and the drawings you chose to publish.",
  },
];

/** The filters over «Best drawings». */
export const postFilters = [
  { id: "all", label: "All" },
  { id: "run", label: "Run" },
  { id: "paddle", label: "Paddle" },
];
