// Unit tests for the schedule date/time helpers (src/shared/schedule.ts).
// Run with:  npx jest
import {
  addDays,
  addMinutes,
  countWeeklySlots,
  describeWeekdays,
  formatDay,
  formatDayRange,
  formatFullDate,
  hhmm,
  monthBounds,
  nextMonday,
  startsAfter,
  timeAgo,
  weekdayIndex,
} from "../src/shared/schedule";

const NOW = new Date(2026, 10, 10, 16, 0); // Tue 10 Nov 2026, 16:00 local time

describe("dates", () => {
  it("numbers weekdays from Monday = 0, like the API", () => {
    expect(weekdayIndex("2026-11-09")).toBe(0); // Monday
    expect(weekdayIndex("2026-11-15")).toBe(6); // Sunday
  });

  it("adds days across months and years", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("formats days, adding the year only when it differs", () => {
    expect(formatDay("2026-11-16", NOW)).toBe("Mon 16 Nov");
    expect(formatDay("2027-01-04", NOW)).toBe("Mon 4 Jan 2027");
    expect(formatDayRange("2026-12-21", "2026-12-24", NOW)).toBe("Mon 21 Dec – Thu 24 Dec");
    expect(formatDayRange("2026-12-21", "2026-12-21", NOW)).toBe("Mon 21 Dec");
  });

  it("writes a date of birth in full", () => {
    expect(formatFullDate("2000-05-15")).toBe("15 May 2000");
    expect(formatFullDate("1995-12-01")).toBe("1 December 1995");
  });

  it("finds month bounds, including leap years", () => {
    expect(monthBounds("2026-11")).toEqual({ first: "2026-11-01", last: "2026-11-30" });
    expect(monthBounds("2028-02")).toEqual({ first: "2028-02-01", last: "2028-02-29" });
  });

  it("finds the coming Monday", () => {
    expect(nextMonday("2026-11-10")).toBe("2026-11-16"); // Tuesday -> next Monday
    expect(nextMonday("2026-11-16")).toBe("2026-11-23"); // Monday -> a week later
  });
});

describe("times", () => {
  it("trims seconds and adds minutes", () => {
    expect(hhmm("09:30:00")).toBe("09:30");
    expect(addMinutes("09:45", 30)).toBe("10:15");
    expect(addMinutes("23:30", 30)).toBeNull(); // would end at midnight
  });

  it("knows whether a slot starts later than now", () => {
    expect(startsAfter("2026-11-10", "16:30", NOW)).toBe(true);
    expect(startsAfter("2026-11-10", "16:00", NOW)).toBe(false);
    expect(startsAfter("2026-11-09", "18:00", NOW)).toBe(false);
  });
});

describe("weekly hours", () => {
  it("describes the chosen days", () => {
    expect(describeWeekdays([0, 1, 2, 3, 4])).toBe("Mon–Fri");
    expect(describeWeekdays([4, 0, 2])).toBe("Mon, Wed, Fri");
    expect(describeWeekdays([5, 6])).toBe("Sat, Sun");
    expect(describeWeekdays([0, 1, 2, 3, 4, 5, 6])).toBe("every day");
  });

  it("counts the slots it would add", () => {
    // Tue 10 Nov for 2 weeks, Mon-Fri, 09:00-17:00 in 30 minutes: 10 days x 16 slots
    expect(countWeeklySlots("2026-11-10", 2, [0, 1, 2, 3, 4], "09:00", "17:00", 30)).toEqual({
      days: 10,
      perDay: 16,
      total: 160,
    });
    // A leftover shorter than one slot is not used: 09:00-10:40 in 30 minutes is 3 slots
    expect(countWeeklySlots("2026-11-10", 1, [1], "09:00", "10:40", 30).perDay).toBe(3);
    expect(countWeeklySlots("2026-11-10", 1, [1], "10:00", "09:00", 30).total).toBe(0);
  });
});

describe("timeAgo", () => {
  it("uses short relative times", () => {
    expect(timeAgo(new Date(2026, 10, 10, 15, 59, 30).toISOString(), NOW)).toBe("just now");
    expect(timeAgo(new Date(2026, 10, 10, 15, 35).toISOString(), NOW)).toBe("25 min ago");
    expect(timeAgo(new Date(2026, 10, 10, 9, 0).toISOString(), NOW)).toBe("7 h ago");
    expect(timeAgo(new Date(2026, 10, 9, 22, 0).toISOString(), NOW)).toBe("yesterday");
    expect(timeAgo(new Date(2026, 10, 2, 9, 0).toISOString(), NOW)).toBe("Mon 2 Nov");
  });
});
