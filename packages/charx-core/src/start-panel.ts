import type { ScenarioSource, StartPanel } from "@charx/project-schema";
import { hudCss, hudRegex, SCENE_FIELDS } from "./hud";

export interface StartPanelScenario extends ScenarioSource {
  bodyText: Record<string, string>;
  previewName: string;
}

export interface StartPanelIR {
  panel: StartPanel;
  scenarios: StartPanelScenario[];
}

export interface StartPanelArtifacts {
  firstMessage: string;
  regex: Record<string, unknown>[];
  triggers: Record<string, unknown>[];
  defaultVariables: string;
  backgroundHtml: string;
}

const PANEL_CLASS = "sv-start-panel";

function scenarioButtonPayload(scenarioId: string): string {
  return `sv_scene_${scenarioId.replace(/-/g, "_")}`;
}

function languageButtonPayload(languageId: string): string {
  return `sv_lang_${languageId.replace(/-/g, "_")}`;
}

function groupButtonPayload(groupId: string): string {
  return `sv_group_${groupId.replace(/-/g, "_")}`;
}

/**
 * Renders one localized string as nested CBS `#when` blocks so the runtime picks
 * the active language without needing a separate message per language.
 */
function localized(variable: string, languages: string[], texts: Record<string, string>): string {
  const fallback = texts[languages[languages.length - 1] ?? ""] ?? "";
  return languages
    .slice(0, -1)
    .reduceRight(
      (rest, id) =>
        `{{#when::{{getvar::${variable}}}::is::${id}}}${texts[id] ?? fallback}{{:else}}${rest}{{/when}}`,
      fallback,
    );
}

function requireLocalized(
  label: string,
  languages: string[],
  texts: Record<string, string>,
): Record<string, string> {
  for (const id of languages)
    if (!texts[id]?.trim()) throw new Error(`${label} is missing text for language '${id}'`);
  return texts;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Cards are emitted on a single line: a collapsed `{{#when}}` block would leave a
 * blank line, that blank line ends the Markdown raw-HTML block, and the indented
 * markup after it would render as an empty code block instead of a card grid.
 */
function scenarioCard(ir: StartPanelIR, scenario: StartPanelScenario, languages: string[]): string {
  const variables = ir.panel.variables;
  const title = localized(variables.language, languages, scenario.titles);
  const summary = localized(variables.language, languages, scenario.summaries);
  const choose = localized(variables.language, languages, ir.panel.ui.choosePrefix ?? {});
  const image = scenario.previewName
    ? `<span class="${PANEL_CLASS}__card-image" style="background-image:url('{{raw::${scenario.previewName}}}')"></span>`
    : "";
  const chips = languages
    .map((language) => {
      const tags = scenario.tags?.[language] ?? [];
      if (!tags.length) return "";
      const strip = tags.map((tag) => `<span class="${PANEL_CLASS}__chip">${tag}</span>`).join("");
      return `{{#when::{{getvar::${variables.language}}}::is::${language}}}${strip}{{/when}}`;
    })
    .join("");
  return [
    `<article class="${PANEL_CLASS}__card{{#when::{{getvar::${variables.scene}}}::is::${scenario.id}}} is-active{{/when}}">`,
    image,
    `<span class="${PANEL_CLASS}__card-title">${title}</span>`,
    chips ? `<span class="${PANEL_CLASS}__card-chips">${chips}</span>` : "",
    `<span class="${PANEL_CLASS}__card-summary">${summary}</span>`,
    `<span class="${PANEL_CLASS}__card-action">{{button::${choose}::${scenarioButtonPayload(scenario.id)}}}</span>`,
    "</article>",
  ].join("");
}

/**
 * Group grids stay in the DOM and are toggled by an `is-visible` class instead of
 * a block-level `{{#when}}`, so switching groups never rewrites the surrounding
 * Markdown structure.
 */
function panelHtml(ir: StartPanelIR): string {
  const languages = ir.panel.languages.map((language) => language.id);
  const variables = ir.panel.variables;
  const ui = ir.panel.ui;
  for (const [key, texts] of Object.entries(ui)) requireLocalized(`start panel ui.${key}`, languages, texts);
  const text = (key: string): string => localized(variables.language, languages, ui[key] ?? {});
  const languageRow = ir.panel.languages
    .map(
      (language) =>
        `<span class="${PANEL_CLASS}__control{{#when::{{getvar::${variables.language}}}::is::${language.id}}} is-active{{/when}}">{{button::${language.label}::${languageButtonPayload(language.id)}}}</span>`,
    )
    .join("");
  const groupRow = ir.panel.groups
    .map((group) => {
      const label = localized(variables.language, languages, group.labels);
      return `<span class="${PANEL_CLASS}__control{{#when::{{getvar::${variables.group}}}::is::${group.id}}} is-active{{/when}}">{{button::${label}::${groupButtonPayload(group.id)}}}</span>`;
    })
    .join("");
  const groupSections = ir.panel.groups
    .map((group) => {
      const scenarios = ir.scenarios.filter((scenario) => scenario.group === group.id);
      if (!scenarios.length) return "";
      const cards = scenarios.map((scenario) => scenarioCard(ir, scenario, languages)).join("");
      return `<div class="${PANEL_CLASS}__cards{{#when::{{getvar::${variables.group}}}::is::${group.id}}} is-visible{{/when}}">${cards}</div>`;
    })
    .filter(Boolean)
    .join("");
  return [
    `<section class="${PANEL_CLASS}">`,
    `<header class="${PANEL_CLASS}__header">`,
    `<span class="${PANEL_CLASS}__eyebrow">${text("eyebrow")}</span>`,
    `<h2 class="${PANEL_CLASS}__title">${text("title")}</h2>`,
    `<p class="${PANEL_CLASS}__subtitle">${text("subtitle")}</p>`,
    "</header>",
    `<div class="${PANEL_CLASS}__row">`,
    `<span class="${PANEL_CLASS}__row-label">${text("languageLabel")}</span>`,
    `<div class="${PANEL_CLASS}__controls">${languageRow}</div>`,
    "</div>",
    `<div class="${PANEL_CLASS}__row">`,
    `<span class="${PANEL_CLASS}__row-label">${text("groupStep")}</span>`,
    `<div class="${PANEL_CLASS}__controls">${groupRow}</div>`,
    "</div>",
    `<div class="${PANEL_CLASS}__step">${text("sceneStep")}</div>`,
    groupSections,
    `<footer class="${PANEL_CLASS}__footer">${text("footer")}</footer>`,
    "</section>",
  ].join("");
}

/**
 * Scene header written as plain text rather than markup, so the model sees the
 * same `[Scene: ...]` line in the opening message and in the example messages
 * and can keep writing it. `hud.ts` owns the display regex that turns it into
 * chips, and `SCENE_FIELDS` is the field order both sides agree on.
 */
const SCENE_LINE_SLOTS = SCENE_FIELDS.length;

function sceneLine(tags: string[]): string {
  if (!tags.length) return "";
  return `[Scene: ${tags.join(" | ")}]`;
}

function firstMessage(ir: StartPanelIR): string {
  const languages = ir.panel.languages.map((language) => language.id);
  const variables = ir.panel.variables;
  const localizedBody = (scenario: StartPanelScenario, language: string): string =>
    [sceneLine(scenario.tags?.[language] ?? []), scenario.bodyText[language] ?? ""]
      .filter(Boolean)
      .join("\n\n");
  const blocks = ir.scenarios.map((scenario) => {
    const body = languages
      .slice(0, -1)
      .reduceRight(
        (rest, id) =>
          `{{#when::{{getvar::${variables.language}}}::is::${id}}}\n${localizedBody(scenario, id)}\n{{:else}}\n${rest}\n{{/when}}`,
        localizedBody(scenario, languages[languages.length - 1] ?? ""),
      );
    return `{{#when::{{getvar::${variables.scene}}}::is::${scenario.id}}}\n${body}\n{{/when}}`;
  });
  return [ir.panel.sentinel, "", ...blocks].join("\n");
}

function lua(ir: StartPanelIR): string {
  const variables = ir.panel.variables;
  const lines: string[] = [
    "-- Generated by charx-core. Binds start-panel buttons to chat variables.",
    "local function set_var(triggerId, key, value)",
    "    setChatVar(triggerId, key, tostring(value))",
    "end",
    "",
    "local function read_var(triggerId, key)",
    "    local value = getChatVar(triggerId, key)",
    '    if value == nil or value == "null" then return "" end',
    "    return tostring(value)",
    "end",
    "",
    "local function ensure_defaults(triggerId)",
    `    if read_var(triggerId, "${variables.language}") == "" then`,
    `        set_var(triggerId, "${variables.language}", "${ir.panel.defaultLanguage}")`,
    "    end",
    `    if read_var(triggerId, "${variables.group}") == "" then`,
    `        set_var(triggerId, "${variables.group}", "${ir.scenarios.find((scenario) => scenario.id === ir.panel.defaultScenario)?.group ?? ir.panel.groups[0]?.id ?? ""}")`,
    "    end",
    `    if read_var(triggerId, "${variables.scene}") == "" then`,
    `        set_var(triggerId, "${variables.scene}", "${ir.panel.defaultScenario}")`,
    "    end",
    "end",
    "",
    "function onStart(triggerId)",
    "    ensure_defaults(triggerId)",
    "    return true",
    "end",
    "",
  ];
  for (const language of ir.panel.languages) {
    lines.push(
      `function ${languageButtonPayload(language.id)}(triggerId)`,
      "    ensure_defaults(triggerId)",
      `    set_var(triggerId, "${variables.language}", "${language.id}")`,
      "    reloadDisplay(triggerId)",
      "end",
      "",
    );
  }
  for (const group of ir.panel.groups) {
    lines.push(
      `function ${groupButtonPayload(group.id)}(triggerId)`,
      "    ensure_defaults(triggerId)",
      `    set_var(triggerId, "${variables.group}", "${group.id}")`,
      "    reloadDisplay(triggerId)",
      "end",
      "",
    );
  }
  for (const scenario of ir.scenarios) {
    lines.push(
      `function ${scenarioButtonPayload(scenario.id)}(triggerId)`,
      "    ensure_defaults(triggerId)",
      `    set_var(triggerId, "${variables.group}", "${scenario.group}")`,
      `    set_var(triggerId, "${variables.scene}", "${scenario.id}")`,
      "    reloadDisplay(triggerId)",
      "end",
      "",
    );
  }
  return lines.join("\n");
}

function backgroundCss(): string {
  return `<style>
.${PANEL_CLASS} {
  --sv-ink: #3f2d1c;
  --sv-line: #b98a4f;
  --sv-paper: #fdf4e0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-sizing: border-box;
  width: min(100%, 860px);
  margin: 12px auto;
  padding: 18px 20px 16px;
  border: 3px solid var(--sv-line);
  border-radius: 10px;
  background: linear-gradient(180deg, #fffaf0, var(--sv-paper)) !important;
  box-shadow: 0 6px 0 rgb(120 84 44 / 22%), 0 14px 26px rgb(80 56 30 / 16%);
  font-size: 15px;
  line-height: 1.45;
  text-align: left;
}

.${PANEL_CLASS} *,
.${PANEL_CLASS} *::before,
.${PANEL_CLASS} *::after { box-sizing: border-box; }

/*
 * The panel paints its own light paper background, so it cannot inherit text
 * colour from the chat theme: a dark RisuAI theme styles \`h2\`, \`p\`, and
 * \`button\` with its own selectors, those beat the container's \`color\`, and the
 * heading and subtitle render white on cream. Every text node is repainted here
 * with \`!important\` because the theme's rules are the more specific ones.
 */
.${PANEL_CLASS},
.${PANEL_CLASS} h2,
.${PANEL_CLASS} p,
.${PANEL_CLASS} span,
.${PANEL_CLASS} div,
.${PANEL_CLASS} article,
.${PANEL_CLASS} header,
.${PANEL_CLASS} footer,
.${PANEL_CLASS} button { color: var(--sv-ink) !important; }

.${PANEL_CLASS}__header { display: flex; flex-direction: column; gap: 4px; }

.${PANEL_CLASS}__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

/* Doubled up so it outranks the \`.${PANEL_CLASS} span\` repaint above. */
.${PANEL_CLASS} .${PANEL_CLASS}__eyebrow { color: #9a6b34 !important; }

.${PANEL_CLASS}__title { margin: 0; font-size: 20px; font-weight: 700; }

.${PANEL_CLASS}__subtitle { margin: 0; font-size: 13px; opacity: 0.75; }

.${PANEL_CLASS}__row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }

.${PANEL_CLASS}__row-label {
  min-width: 118px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.7;
}

.${PANEL_CLASS}__controls { display: flex; flex-wrap: wrap; gap: 8px; }

/*
 * Buttons are the other element a chat theme reliably restyles, so the paper
 * background is forced here too — a dark theme's button background would
 * otherwise leave a dark pill with dark text on it.
 */
.${PANEL_CLASS}__control button,
.${PANEL_CLASS}__card-action button {
  padding: 6px 14px;
  border: 2px solid var(--sv-line);
  border-radius: 999px;
  background: #fffdf6 !important;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.${PANEL_CLASS}__control.is-active button {
  border-color: #6f9c3d;
  background: #dff0c2 !important;
  box-shadow: inset 0 0 0 1px #6f9c3d;
}

.${PANEL_CLASS}__step {
  padding-top: 4px;
  border-top: 1px dashed var(--sv-line);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.7;
}

/*
 * Columns are capped at 260px instead of 1fr: a group holding a single scene
 * would otherwise stretch that one card across the whole panel and blow its
 * 4/3 preview up to several hundred pixels tall on a desktop window.
 */
.${PANEL_CLASS}__cards {
  display: none;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 260px));
  justify-content: start;
}

.${PANEL_CLASS}__cards.is-visible { display: grid; }

.${PANEL_CLASS}__card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 2px solid rgb(185 138 79 / 55%);
  border-radius: 8px;
  background: #fffdf6 !important;
}

.${PANEL_CLASS}__card.is-active {
  border-color: #6f9c3d;
  background: #f4fae8 !important;
  box-shadow: 0 0 0 2px rgb(111 156 61 / 35%);
}

.${PANEL_CLASS}__card-image {
  display: block;
  width: 100%;
  max-height: 190px;
  aspect-ratio: 4 / 3;
  border: 1px solid rgb(120 84 44 / 35%);
  border-radius: 6px;
  background-color: #efe2c8;
  background-position: center top;
  background-repeat: no-repeat;
  background-size: cover;
  image-rendering: pixelated;
}

.${PANEL_CLASS}__card-title { font-size: 14px; font-weight: 700; }

.${PANEL_CLASS}__card-chips { display: flex; flex-wrap: wrap; gap: 4px; }

.${PANEL_CLASS}__chip {
  padding: 1px 7px;
  border: 1px solid rgb(120 84 44 / 30%);
  border-radius: 999px;
  background: #f6ecd8 !important;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.${PANEL_CLASS}__card-summary { font-size: 12px; line-height: 1.4; opacity: 0.78; }

.${PANEL_CLASS}__card-action { margin-top: auto; }

.${PANEL_CLASS}__footer { font-size: 11px; opacity: 0.6; }
${hudCss()}</style>`;
}

export function compileStartPanel(ir: StartPanelIR): StartPanelArtifacts {
  const languages = ir.panel.languages.map((language) => language.id);
  if (!languages.includes(ir.panel.defaultLanguage))
    throw new Error(`start panel defaultLanguage '${ir.panel.defaultLanguage}' is not a declared language`);
  const groups = new Set(ir.panel.groups.map((group) => group.id));
  for (const group of ir.panel.groups)
    requireLocalized(`start panel group '${group.id}'`, languages, group.labels);
  const seen = new Set<string>();
  for (const scenario of ir.scenarios) {
    if (seen.has(scenario.id)) throw new Error(`Duplicate scenario id: ${scenario.id}`);
    seen.add(scenario.id);
    if (!groups.has(scenario.group))
      throw new Error(`Scenario '${scenario.id}' references unknown group '${scenario.group}'`);
    requireLocalized(`scenario '${scenario.id}' titles`, languages, scenario.titles);
    requireLocalized(`scenario '${scenario.id}' summaries`, languages, scenario.summaries);
    // A scenario with no bodies at all opens on its scene header alone; one that
    // ships prose for a single language would silently open blank in the other.
    if (Object.keys(scenario.bodyText).length)
      requireLocalized(`scenario '${scenario.id}' bodies`, languages, scenario.bodyText);
    for (const language of languages) {
      const tags = scenario.tags?.[language] ?? [];
      if (!tags.length && !scenario.bodyText[language])
        throw new Error(
          `Scenario '${scenario.id}' has no '${language}' body, so it needs '${language}' tags`,
        );
      if (tags.length > SCENE_LINE_SLOTS)
        throw new Error(
          `Scenario '${scenario.id}' has ${tags.length} '${language}' tags; the scene header renders at most ${SCENE_LINE_SLOTS}`,
        );
      for (const tag of tags)
        if (/[|\]\n]/.test(tag))
          throw new Error(`Scenario '${scenario.id}' tag '${tag}' cannot contain '|', ']', or a newline`);
      // A header is all-or-nothing. Two shapes are legal: the full field set, or a
      // single label for a scenario that establishes no time and no place at all.
      // Anything between the two is worse than either, because the model copies the
      // opening header's shape for the rest of the chat — a scenario that ships
      // four fields teaches it that the clock and the weather are optional.
      if (tags.length <= 1) continue;
      if (tags.length !== SCENE_LINE_SLOTS)
        throw new Error(
          `Scenario '${scenario.id}' has ${tags.length} '${language}' tags; a scene header is all ${SCENE_LINE_SLOTS} fields (${SCENE_FIELDS.join(", ")}) or a single label`,
        );
      const day = tags[SCENE_FIELDS.indexOf("day")] ?? "";
      if (!/\d/.test(day))
        throw new Error(
          `Scenario '${scenario.id}' '${language}' day field '${day}' has no number in it; the header's day field is a calendar day`,
        );
      const clock = tags[SCENE_FIELDS.indexOf("clock")] ?? "";
      if (!/^\d{1,2}:\d{2}$/.test(clock))
        throw new Error(
          `Scenario '${scenario.id}' '${language}' clock field '${clock}' is not a HH:MM time; the header's clock field is an exact time of day`,
        );
    }
  }
  if (!seen.has(ir.panel.defaultScenario))
    throw new Error(`start panel defaultScenario '${ir.panel.defaultScenario}' is not a declared scenario`);
  const variables = ir.panel.variables;
  const defaultGroup =
    ir.scenarios.find((scenario) => scenario.id === ir.panel.defaultScenario)?.group ??
    ir.panel.groups[0]?.id ??
    "";
  return {
    firstMessage: firstMessage(ir),
    regex: [
      {
        comment: "Start panel",
        in: escapeRegex(ir.panel.sentinel),
        out: panelHtml(ir),
        type: "editdisplay",
        ableFlag: false,
      },
      ...hudRegex(),
    ],
    triggers: [
      {
        comment: "Start panel handlers",
        type: "start",
        conditions: [],
        effect: [{ type: "triggerlua", code: lua(ir) }],
        lowLevelAccess: false,
      },
    ],
    defaultVariables: [
      `${variables.language}=${ir.panel.defaultLanguage}`,
      `${variables.group}=${defaultGroup}`,
      `${variables.scene}=${ir.panel.defaultScenario}`,
    ].join("\n"),
    backgroundHtml: backgroundCss(),
  };
}
