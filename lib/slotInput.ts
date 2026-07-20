import { customAlphabet } from "nanoid";

export const slotId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);
export const linkToken = customAlphabet(
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789",
  12
);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export type RawSlot = { date: string; start: string; end: string };

/** Returns an error message for bad slot input, or null when everything is valid. */
export function invalidSlotInput(rawSlots: RawSlot[]): string | null {
  for (const s of rawSlots) {
    if (!DATE_RE.test(s.date) || !TIME_RE.test(s.start) || !TIME_RE.test(s.end)) {
      return "Invalid slot format";
    }
    if (s.end <= s.start) {
      return `End time must be after start time (${s.date})`;
    }
  }
  return null;
}
