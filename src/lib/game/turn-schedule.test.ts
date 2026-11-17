import { describe, expect, it } from "vitest";
import type { FieldSpec, GameId } from "@/lib/domain";
import {
  fixedSchedule,
  isFixedSchedule,
  readStoredSchedule,
  scheduleError,
  scheduleStorageKey,
  turnDurationForRound,
  turnScheduleFrom,
} from "./turn-schedule";

const template: FieldSpec[] = [
  { key: "turnBaseS", label: "Base", type: "integer", default: 45 },
  { key: "turnStepS", label: "Step", type: "integer", default: 15 },
  { key: "turnMaxS", label: "Max", type: "integer", default: 180 },
];

describe("turnScheduleFrom", () => {
  it("reads the schedule from the config template defaults", () => {
    expect(turnScheduleFrom(null, template)).toEqual({
      baseS: 45,
      stepS: 15,
      maxS: 180,
    });
  });

  it("lets the game's config values override the defaults", () => {
    expect(turnScheduleFrom({ turnBaseS: 30, turnStepS: 5 }, template)).toEqual(
      { baseS: 30, stepS: 5, maxS: 180 },
    );
  });

  it("falls back to a constant 60 s when nothing declares a schedule", () => {
    expect(turnScheduleFrom(null, [])).toEqual({
      baseS: 60,
      stepS: 0,
      maxS: 600,
    });
  });
});

describe("turnDurationForRound", () => {
  const schedule = { baseS: 45, stepS: 15, maxS: 180 };

  it("grows linearly per round from the base", () => {
    expect(turnDurationForRound(schedule, 1)).toBe(45);
    expect(turnDurationForRound(schedule, 2)).toBe(60);
    expect(turnDurationForRound(schedule, 3)).toBe(75);
  });

  it("caps at the maximum", () => {
    // 45 + 15×9 = 180 exactly at round 10; later rounds stay capped.
    expect(turnDurationForRound(schedule, 10)).toBe(180);
    expect(turnDurationForRound(schedule, 40)).toBe(180);
  });

  it("is constant when the step is 0", () => {
    const flat = { baseS: 60, stepS: 0, maxS: 600 };

    expect(turnDurationForRound(flat, 1)).toBe(60);
    expect(turnDurationForRound(flat, 12)).toBe(60);
  });

  it("clamps a non-positive round up to the first", () => {
    expect(turnDurationForRound(schedule, 0)).toBe(45);
  });
});

describe("isFixedSchedule", () => {
  it("tells turns that last the same from turns that grow", () => {
    expect(isFixedSchedule({ baseS: 60, stepS: 0, maxS: 600 })).toBe(true);
    expect(isFixedSchedule({ baseS: 60, stepS: 10, maxS: 120 })).toBe(false);
  });
});

describe("fixedSchedule", () => {
  it("lasts the length it is given, every round", () => {
    const schedule = fixedSchedule(700);

    expect(turnDurationForRound(schedule, 1)).toBe(700);
    expect(turnDurationForRound(schedule, 9)).toBe(700);
  });
});

describe("scheduleError", () => {
  const ok = { baseS: 60, stepS: 10, maxS: 120 };

  it("accepts a schedule a turn can be timed on", () => {
    expect(scheduleError(ok)).toBeNull();
    expect(scheduleError({ baseS: 1, stepS: 0, maxS: 1 })).toBeNull();
  });

  it("refuses what no turn can be timed on", () => {
    expect(scheduleError({ ...ok, baseS: 1.5 })).toMatch(/entières/);
    expect(scheduleError({ ...ok, stepS: Number.NaN })).toMatch(/entières/);
    expect(scheduleError({ ...ok, baseS: 0 })).toMatch(/au moins/);
    expect(scheduleError({ ...ok, stepS: -5 })).toMatch(/négatif/);
    expect(scheduleError({ ...ok, maxS: 30 })).toMatch(/plafond/i);
  });
});

describe("the settings kept on the phone", () => {
  it("are kept per party", () => {
    expect(scheduleStorageKey("g1" as GameId)).not.toBe(
      scheduleStorageKey("g2" as GameId),
    );
  });

  it("read back what was written", () => {
    const schedule = { baseS: 90, stepS: 15, maxS: 180 };

    expect(readStoredSchedule(JSON.stringify(schedule))).toEqual(schedule);
  });

  it("read nothing from nothing, garbage, or a schedule no longer valid", () => {
    expect(readStoredSchedule(null)).toBeNull();
    expect(readStoredSchedule("{oops")).toBeNull();
    expect(readStoredSchedule("null")).toBeNull();
    expect(readStoredSchedule('{"baseS":0,"stepS":0,"maxS":0}')).toBeNull();
  });
});
