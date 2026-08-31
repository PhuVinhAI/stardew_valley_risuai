/**
 * The two persistent HUD lines: the scene header at the top of a reply and the
 * bag line at the bottom. Both are written by the model as plain bracketed text
 * so it can see its own previous ones in the history and keep the format going;
 * a display regex turns each into chips at render time.
 *
 * Neither line is state the runtime owns. There is no Lua counter behind them and
 * nothing validates a value against a previous turn — the model carries them
 * forward the way it carries any other continuity, and the regex only decides how
 * they look. That is deliberate: a chat variable would need a trigger on every
 * message and would still not know what the narration just did.
 */

const SCENE_CLASS = "sv-scene-tags";
const BAG_CLASS = "sv-bag";

/**
 * Fixed field order for the scene header. Season and day locate the scene in the
 * year, the clock locates it in the day, weather is the condition those three
 * imply, then place, then who is present. The order is fixed rather than free so
 * the model cannot quietly stop writing a field: a missing one is visible as a
 * missing chip in a known position.
 *
 * Weather sits after the clock because it is the field most likely to contradict
 * the others — rain at 06:00 that is still rain at 18:00 is a continuity claim,
 * and keeping it beside the clock is what makes that visible while reading.
 */
export const SCENE_FIELDS = ["season", "day", "clock", "weather", "place", "cast"] as const;

/** How many `|`-separated items the bag line renders after the money chip. */
const BAG_SLOTS = 12;

/**
 * Slots are lazy with the surrounding spaces outside the capture, so a chip holds
 * `Spring` rather than ` Spring `. Fields after the first are optional: an opening
 * that has not established a date yet (Free Start) writes a one-field header, and
 * a partial line should still render as chips rather than as raw bracket text.
 * The last slot accepts `|` so an unusually long cast list degrades into one wider
 * chip instead of failing to match.
 */
export function sceneLineRegex(): Record<string, unknown> {
  const slot = (charClass: string): string => `\\s*([${charClass}]+?)\\s*`;
  const middle = `(?:\\|${slot("^|\\]\\n")})?`.repeat(SCENE_FIELDS.length - 2);
  const pattern = `\\[Scene:${slot("^|\\]\\n")}${middle}(?:\\|${slot("^\\]\\n")})?\\]`;
  const chips = SCENE_FIELDS.map(
    (field, index) => `<span class="${SCENE_CLASS}__tag is-${field}">$${index + 1}</span>`,
  ).join("");
  return {
    comment: "Scene header",
    in: pattern,
    out: `<div class="${SCENE_CLASS}">${chips}</div>`,
    type: "editdisplay",
    ableFlag: false,
    flag: "g",
  };
}

/**
 * The bag line. First field is money and is styled apart from the rest; every
 * later field is one thing the player owns, in whatever wording the narration
 * used. A replacement cannot loop, so the pattern offers a fixed number of
 * optional slots and `:empty` hides the ones that never matched — the same shape
 * the scene header uses, for the same reason.
 */
export function bagLineRegex(): Record<string, unknown> {
  const slot = (charClass: string): string => `\\s*([${charClass}]+?)\\s*`;
  const items = `(?:\\|${slot("^|\\]\\n")})?`.repeat(BAG_SLOTS - 1);
  const pattern = `\\[Bag:${slot("^|\\]\\n")}${items}(?:\\|${slot("^\\]\\n")})?\\]`;
  const chips = Array.from(
    { length: BAG_SLOTS + 1 },
    (_, index) => `<span class="${BAG_CLASS}__item${index === 0 ? " is-money" : ""}">$${index + 1}</span>`,
  ).join("");
  return {
    comment: "Bag line",
    in: pattern,
    out: `<div class="${BAG_CLASS}">${chips}</div>`,
    type: "editdisplay",
    ableFlag: false,
    flag: "g",
  };
}

export function hudRegex(): Record<string, unknown>[] {
  return [sceneLineRegex(), bagLineRegex()];
}

/**
 * Chips render inside the message body rather than inside the start panel, so
 * they get the same forced colours for the same reason — a dark chat theme would
 * otherwise put its own light text on their cream background.
 */
export function hudCss(): string {
  return `
.${SCENE_CLASS} {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin: 0 0 10px;
}

.${SCENE_CLASS}__tag {
  max-width: 100%;
  padding: 2px 10px;
  border: 1px solid rgb(120 84 44 / 35%);
  border-radius: 999px;
  background: rgb(246 236 216 / 85%) !important;
  color: #6b4a24 !important;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1.6;
}

/* Season leads the line and is the one chip that names the time of year. */
.${SCENE_CLASS}__tag.is-season {
  border-color: #6f9c3d;
  background: #e7f3d2 !important;
  color: #3f5c1e !important;
  text-transform: uppercase;
}

/* Day and clock are the two fields that must never go missing, so they are the
 * two that read as a unit: same tint, tabular digits, no wrapping. */
.${SCENE_CLASS}__tag.is-day,
.${SCENE_CLASS}__tag.is-clock {
  border-color: #b3813f;
  background: #f7e9cd !important;
  color: #6b4a24 !important;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Weather is a condition rather than a coordinate, so it reads cooler than the
 * calendar chips beside it. */
.${SCENE_CLASS}__tag.is-weather {
  border-color: #7d9fb5;
  background: #e4eef4 !important;
  color: #38566b !important;
}

.${SCENE_CLASS}__tag.is-place { font-weight: 700; }

.${SCENE_CLASS}__tag.is-cast { opacity: 0.85; }

.${SCENE_CLASS}__tag:empty { display: none; }

.${BAG_CLASS} {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin: 12px 0 0;
  padding: 8px 10px;
  border: 1px dashed rgb(120 84 44 / 40%);
  border-radius: 8px;
  background: rgb(253 244 224 / 70%) !important;
}

.${BAG_CLASS}__item {
  padding: 2px 9px;
  border: 1px solid rgb(120 84 44 / 30%);
  border-radius: 6px;
  background: rgb(255 250 240 / 90%) !important;
  color: #5b3f21 !important;
  font-size: 11px;
  line-height: 1.6;
}

/* Money is the one field that is always present, so it is the one that is styled
 * as a total rather than as an item. */
.${BAG_CLASS}__item.is-money {
  border-color: #c79a3a;
  background: #fbf0cf !important;
  color: #6a4c12 !important;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.${BAG_CLASS}__item:empty { display: none; }

/* A bag line with nothing but money still shows; one with no money at all means
 * the model dropped the field, and an empty container would hide that. */
.${BAG_CLASS}:empty { display: none; }
`;
}
