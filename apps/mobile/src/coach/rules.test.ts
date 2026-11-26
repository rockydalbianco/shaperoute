import {
  allTips,
  coachTips,
  type CoachExercise,
  type CoachInput,
  type CoachRun,
  type CoachWorkout,
  epley,
  monotony,
  plates,
  setsByMuscle,
  steadyWeeks,
  tipKey,
  weekdayOf,
} from "./rules";

const NOW = new Date(2026, 10, 23, 12, 0, 0);
const DAY = 86_400_000;

function ago(days: number, hour = 12): Date {
  const moment = new Date(NOW.getTime() - days * DAY);
  moment.setHours(hour, 0, 0, 0);
  return moment;
}

function load(
  exercise: string,
  reps: number[],
  kg: number,
  targetReps?: number,
): CoachExercise {
  return {
    exercise,
    sets: reps.map((r) => ({ kind: "load" as const, reps: r, load_kg: kg })),
    ...(targetReps === undefined ? {} : { targetReps, targetKg: kg }),
  };
}

function gym(
  days: number,
  exercises: CoachExercise[],
  plan?: string,
  durationS = 3600,
): CoachWorkout {
  return {
    id: `w${days}-${exercises.map((one) => one.exercise).join("-")}`,
    startedAt: ago(days),
    durationS,
    ...(plan === undefined ? {} : { plan }),
    exercises,
  };
}

function run(days: number, km: number, paceS: number): CoachRun {
  return { startedAt: ago(days, 8), distanceM: km * 1000, durationS: km * paceS };
}

function input(more: Partial<CoachInput> = {}): CoachInput {
  return { now: NOW, workouts: [], runs: [], planItems: [], ...more };
}

const BENCH_PLAN = {
  plan: "p1",
  day: 1,
  item: {
    exercise: "bench_press",
    kind: "load" as const,
    sets: 3,
    reps: 10,
    load_kg: 60,
  },
};

function rules(tips: { rule: string }[]): string[] {
  return tips.map((one) => one.rule);
}

describe("helpers", () => {
  it("rounds to plates and estimates the max with Epley", () => {
    expect(plates(61.2)).toBe(60);
    expect(plates(63.8)).toBe(65);
    expect(epley(100, 3)).toBeCloseTo(110);
  });

  it("counts a main muscle a set and a helper half", () => {
    const sets = setsByMuscle([gym(1, [load("bench_press", [10, 10, 10], 60)])]);
    expect(sets.get("chest")).toBe(3);
    expect(sets.get("triceps")).toBe(1.5);
  });

  it("numbers weekdays from Monday", () => {
    expect(weekdayOf(new Date(2026, 10, 23))).toBe(1);
    expect(weekdayOf(new Date(2026, 10, 22))).toBe(7);
  });
});

describe("P1 double progression", () => {
  const done = [
    gym(2, [load("bench_press", [10, 10, 10], 60, 10)], "p1"),
    gym(5, [load("bench_press", [10, 10, 11], 60, 10)], "p1"),
  ];

  it("adds 2.5 kg to the upper body when all reps were done twice", () => {
    const tips = allTips(input({ workouts: done, planItems: [BENCH_PLAN] }));
    const p1 = tips.find((one) => one.rule === "P1");
    expect(p1?.values).toEqual({ kg: 62.5, old: 60, min: 10 });
    expect(p1?.change).toEqual({ plan: "p1", exercise: "bench_press", deltaKg: 2.5 });
  });

  it("adds 5 kg to the legs", () => {
    const legs = [
      gym(2, [load("back_squat", [8, 8, 8], 80, 8)], "p1"),
      gym(5, [load("back_squat", [8, 8, 8], 80, 8)], "p1"),
    ];
    const p1 = allTips(input({ workouts: legs })).find((one) => one.rule === "P1");
    expect(p1?.values.kg).toBe(85);
    expect(p1?.change).toBeUndefined();
  });

  it("does not fire after one good workout, or with a rep missed", () => {
    expect(rules(allTips(input({ workouts: done.slice(0, 1) })))).not.toContain("P1");
    const missed = [done[0], gym(5, [load("bench_press", [10, 9, 10], 60, 10)], "p1")];
    expect(rules(allTips(input({ workouts: missed })))).not.toContain("P1");
  });

  it("adds a rep to a bodyweight exercise", () => {
    const bw = (days: number): CoachWorkout =>
      gym(days, [
        {
          exercise: "push_up",
          sets: [12, 12, 12].map((reps) => ({ kind: "bodyweight" as const, reps })),
          targetReps: 12,
        },
      ]);
    const tip = allTips(input({ workouts: [bw(1), bw(3)] })).find(
      (one) => one.rule === "P1bw",
    );
    expect(tip?.values).toEqual({ reps: 13 });
  });
});

describe("P2 below the reps", () => {
  it("takes 10% off, at least 2.5 kg, after two workouts mostly below", () => {
    const short = [
      gym(2, [load("bench_press", [8, 7, 10], 60, 10)], "p1"),
      gym(5, [load("bench_press", [9, 7, 7], 60, 10)], "p1"),
    ];
    const p2 = allTips(input({ workouts: short, planItems: [BENCH_PLAN] })).find(
      (one) => one.rule === "P2",
    );
    expect(p2?.values.kg).toBe(55);
    expect(p2?.change?.deltaKg).toBe(-5);
  });

  it("does not fire when most sets were done", () => {
    const fine = [
      gym(2, [load("bench_press", [10, 10, 8], 60, 10)], "p1"),
      gym(5, [load("bench_press", [10, 9, 10], 60, 10)], "p1"),
    ];
    expect(rules(allTips(input({ workouts: fine })))).not.toContain("P2");
  });
});

describe("P3 stall", () => {
  it("changes the reps when the estimated max has not moved in 3 workouts", () => {
    const flat = [2, 5, 9].map((d) =>
      gym(d, [load("bench_press", [8, 8, 7], 70)], "p1"),
    );
    const p3 = allTips(input({ workouts: flat, planItems: [BENCH_PLAN] })).find(
      (one) => one.rule === "P3",
    );
    expect(p3?.values.min2).toBe(5);
    expect(p3?.values.kg).toBe(plates(epley(70, 8) / (1 + 5 / 30)));
    expect(p3?.change?.deltaReps).toBe(-3);
  });

  it("does not fire while the max grows", () => {
    const rising = [
      gym(2, [load("bench_press", [8, 8, 8], 75)], "p1"),
      gym(5, [load("bench_press", [8, 8, 8], 72.5)], "p1"),
      gym(9, [load("bench_press", [8, 8, 8], 70)], "p1"),
    ];
    expect(rules(allTips(input({ workouts: rising })))).not.toContain("P3");
  });
});

describe("P4 and P5 weekly volume", () => {
  it("asks for more sets of the least trained big muscle, on its plan day", () => {
    const week = [
      gym(1, [load("bench_press", [10, 10, 10, 10, 10, 10, 10, 10, 10, 10], 60)]),
    ];
    const squat = {
      plan: "p1",
      day: 4,
      item: { exercise: "back_squat", kind: "load" as const, sets: 3 },
    };
    const p4 = allTips(input({ workouts: week, planItems: [squat] })).find(
      (one) => one.rule === "P4",
    );
    expect(p4?.muscle).toBe("lats");
    expect(p4?.values.n).toBe(4);
    const forQuads = allTips(
      input({
        workouts: [
          gym(1, [
            load("bench_press", Array(10).fill(10), 60),
            load("pull_up", Array(10).fill(8), 0),
            load("romanian_deadlift", Array(10).fill(8), 60),
            load("back_squat", [8, 8], 80),
          ]),
          gym(3, [
            load("shoulder_press", Array(10).fill(8), 30),
            load("leg_press", Array(10).fill(8), 100),
          ]),
        ],
        planItems: [squat],
      }),
    ).find((one) => one.rule === "P4");
    expect(forQuads?.muscle).not.toBe("quads");
    expect(forQuads?.muscle).not.toBe("chest");
  });

  it("warns above 20 sets a muscle", () => {
    const lots = [
      gym(1, [load("bench_press", Array(12).fill(10), 60)]),
      gym(3, [load("dumbbell_bench_press", Array(10).fill(10), 20)]),
    ];
    expect(rules(allTips(input({ workouts: lots })))).toContain("P4hi");
  });

  it("suggests two days for a big muscle trained on one day only", () => {
    const once = [gym(1, [load("bench_press", Array(6).fill(10), 60)])];
    const p5 = allTips(input({ workouts: once })).find((one) => one.rule === "P5");
    expect(p5?.muscle).toBe("chest");
    expect(p5?.values.day).toBe(weekdayOf(ago(1)));
    const twice = [
      gym(1, [load("bench_press", Array(6).fill(10), 60)]),
      gym(4, [load("push_up", [10], 0)]),
    ];
    expect(
      allTips(input({ workouts: twice })).find(
        (one) => one.rule === "P5" && one.muscle === "chest",
      ),
    ).toBeUndefined();
  });

  it("says nothing of volume in a week without the gym", () => {
    expect(
      rules(allTips(input({ workouts: [gym(10, [load("bench_press", [10], 60)])] }))),
    ).not.toContain("P4");
  });
});

describe("P6 recovery", () => {
  const today = { plan: "p1", day: 1, items: [BENCH_PLAN.item] };

  it("fires when today's muscle was trained hard less than 48 h ago", () => {
    const hard = [gym(1, [load("bench_press", [10, 10, 10, 10], 60)])];
    const p6 = allTips(input({ workouts: hard, today })).find(
      (one) => one.rule === "P6",
    );
    expect(p6?.muscle).toBe("chest");
    expect(p6?.values.hours).toBe(24);
  });

  it("does not fire after 48 h, after few sets, or once today is done", () => {
    expect(
      rules(
        allTips(
          input({
            workouts: [gym(3, [load("bench_press", [10, 10, 10, 10], 60)])],
            today,
          }),
        ),
      ),
    ).not.toContain("P6");
    expect(
      rules(
        allTips(
          input({ workouts: [gym(1, [load("bench_press", [10, 10], 60)])], today }),
        ),
      ),
    ).not.toContain("P6");
    const doneToday = {
      ...gym(0, [load("bench_press", [10, 10, 10, 10], 60)]),
      startedAt: new Date(NOW.getTime() - 3_600_000),
    };
    expect(
      rules(
        allTips(
          input({
            workouts: [doneToday, gym(1, [load("bench_press", [10, 10, 10, 10], 60)])],
            today,
          }),
        ),
      ),
    ).not.toContain("P6");
  });
});

describe("C1 weekly distance", () => {
  const usual = [8, 15, 22, 29].flatMap((d) => [run(d, 5, 360), run(d + 2, 5, 360)]);

  it("fires above +30% on the 4 weeks before", () => {
    const c1 = allTips(
      input({ runs: [...usual, run(1, 8, 360), run(3, 6, 360)] }),
    ).find((one) => one.rule === "C1");
    expect(c1?.values).toEqual({ km: 14, pct: 40 });
  });

  it("does not fire at +20%, or below 5 km a week", () => {
    expect(
      rules(allTips(input({ runs: [...usual, run(1, 6, 360), run(3, 6, 360)] }))),
    ).not.toContain("C1");
    expect(
      rules(allTips(input({ runs: [run(8, 2, 360), run(1, 4, 360)] }))),
    ).not.toContain("C1");
  });
});

describe("C2 easy share", () => {
  it("fires when less than 75% of the running time was easy", () => {
    const fast = [run(1, 5, 300), run(4, 5, 300), run(7, 8, 360)];
    const c2 = allTips(input({ runs: fast, pace10kS: 300 })).find(
      (one) => one.rule === "C2",
    );
    expect(c2?.values.pct).toBe(Math.round(((8 * 360) / (8 * 360 + 3000)) * 100));
  });

  it("does not fire with mostly easy runs or fewer than 3 runs", () => {
    const easy = [run(1, 5, 300), run(4, 8, 360), run(7, 10, 360), run(9, 10, 360)];
    expect(rules(allTips(input({ runs: easy, pace10kS: 300 })))).not.toContain("C2");
    expect(
      rules(allTips(input({ runs: [run(1, 5, 300), run(3, 5, 300)], pace10kS: 300 }))),
    ).not.toContain("C2");
  });
});

describe("C3 workload ratio, soft", () => {
  it("fires above 1.5 and never carries a change", () => {
    const base = [8, 15, 22].map((d) => gym(d, [], undefined, 3600 * 1.5));
    const spike = [1, 2, 3, 4, 5].map((d) => gym(d, [], undefined, 3600 * 1.5));
    const c3 = allTips(input({ workouts: [...base, ...spike] })).find(
      (one) => one.rule === "C3",
    );
    expect(c3).toBeDefined();
    expect(c3?.change).toBeUndefined();
  });

  it("does not fire on an even month", () => {
    const even = [1, 8, 15, 22].map((d) => gym(d, [], undefined, 3600 * 2));
    expect(rules(allTips(input({ workouts: even })))).not.toContain("C3");
  });
});

describe("T1 deload", () => {
  it("counts steady weeks and fires at 6", () => {
    const six = [0, 1, 2, 3, 4, 5].flatMap((w) => [
      gym(w * 7 + 1, []),
      gym(w * 7 + 4, []),
    ]);
    expect(steadyWeeks(input({ workouts: six }))).toBe(6);
    expect(rules(allTips(input({ workouts: six })))).toContain("T1");
  });

  it("stops counting at a light week", () => {
    const light = [0, 1, 3, 4, 5, 6].flatMap((w) => [
      gym(w * 7 + 1, []),
      gym(w * 7 + 4, []),
    ]);
    expect(steadyWeeks(input({ workouts: light }))).toBe(2);
    expect(rules(allTips(input({ workouts: light })))).not.toContain("T1");
  });

  it("measures monotony only with 4 training days", () => {
    const same = [0, 1, 2, 3, 4].map((d) => gym(d + 0.1, [], undefined, 3600));
    expect(monotony(input({ workouts: same.slice(0, 3) }))).toBeNull();
    expect(monotony(input({ workouts: same }))).toBeGreaterThan(0);
  });
});

describe("T3 short night, soft", () => {
  const today = { plan: "p1", day: 1, items: [] };

  it("fires below 60 on a day of the plan", () => {
    expect(
      allTips(input({ sleepScore: 52, today })).find((one) => one.rule === "T3")
        ?.values,
    ).toEqual({ score: 52 });
  });

  it("does not fire on a good night, without a score, or without a plan day", () => {
    expect(rules(allTips(input({ sleepScore: 75, today })))).not.toContain("T3");
    expect(rules(allTips(input({ sleepScore: null, today })))).not.toContain("T3");
    expect(rules(allTips(input({ sleepScore: 40 })))).not.toContain("T3");
  });
});

describe("T4 and T5", () => {
  it("welcomes back after 14 days, alone on the page", () => {
    const tips = coachTips(
      input({ workouts: [gym(20, [load("bench_press", [10], 60)])] }),
    );
    expect(rules(tips)).toEqual(["T4"]);
    expect(tips[0].values).toEqual({ days: 20, pct: 85 });
  });

  it("does not welcome back at 10 days", () => {
    expect(rules(allTips(input({ workouts: [gym(10, [])] })))).not.toContain("T4");
  });

  it("invites a second strength day", () => {
    expect(
      allTips(input({ workouts: [gym(2, [])] })).find((one) => one.rule === "T5")
        ?.values,
    ).toEqual({ n: 1 });
    expect(rules(allTips(input({ workouts: [gym(2, []), gym(4, [])] })))).not.toContain(
      "T5",
    );
  });
});

describe("coachTips", () => {
  const busy = input({
    workouts: [
      gym(2, [load("bench_press", [10, 10, 10], 60, 10)], "p1"),
      gym(5, [load("bench_press", [10, 10, 10], 60, 10)], "p1"),
    ],
    runs: [
      ...[8, 15, 22, 29].map((d) => run(d, 6, 360)),
      run(1, 10, 300),
      run(3, 5, 300),
    ],
    planItems: [BENCH_PLAN],
    pace10kS: 300,
  });

  it("shows at most three, safety first", () => {
    const tips = coachTips(busy);
    expect(tips.length).toBeLessThanOrEqual(3);
    expect(tips[0].rule).toBe("C1");
    expect(tips.map((one) => one.group)).toEqual(
      [...tips.map((one) => one.group)].sort(),
    );
  });

  it("is the same for the same workouts", () => {
    expect(coachTips(busy)).toEqual(coachTips(busy));
  });

  it("leaves out a tip put off with «Not now»", () => {
    const first = coachTips(busy)[0];
    expect(coachTips(busy, new Set([tipKey(first)])).map(tipKey)).not.toContain(
      tipKey(first),
    );
  });

  it("gives nothing without workouts", () => {
    expect(coachTips(input())).toEqual([]);
  });
});
