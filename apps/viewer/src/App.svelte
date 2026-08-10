<script lang="ts">
import { onMount } from "svelte";

type Lore = {
  name: string;
  kind: "character" | "folder" | "lore";
  keys: string;
  content: string;
  assets: string[];
};
type Project = {
  id: string;
  kind: "primary" | "example";
  name: string;
  description: string;
  scenario: string;
  firstMessage: string;
  tags: string[];
  stats: { characters: number; loreEntries: number; assets: number; regexScripts: number; triggers: number };
  lore: Lore[];
};

let projects: Project[] = $state([]);
let selectedId = $state("");
let query = $state("");
let activeTab = $state<"characters" | "lore" | "overview">("overview");
// biome-ignore lint/correctness/noUnusedVariables: referenced by the Svelte template
let error = $state("");
const selected = $derived(projects.find((project) => project.id === selectedId) ?? projects[0]);
// biome-ignore lint/correctness/noUnusedVariables: referenced by the Svelte template
const visibleLore = $derived(
  (selected?.lore ?? []).filter((entry) => {
    const matchesTab =
      activeTab === "characters"
        ? entry.kind === "character"
        : activeTab === "lore"
          ? entry.kind === "lore"
          : false;
    const text = `${entry.name} ${entry.keys} ${entry.content}`.toLowerCase();
    return matchesTab && text.includes(query.toLowerCase());
  }),
);

onMount(async () => {
  try {
    const response = await fetch("/catalog.json");
    if (!response.ok) throw new Error("Run `bun run viewer:data` before opening the viewer.");
    const catalog = await response.json();
    projects = catalog.projects;
    selectedId = projects.find((project) => project.kind === "primary")?.id ?? projects[0]?.id ?? "";
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  }
});
</script>

<svelte:head><title>RisuAI World Viewer</title></svelte:head>

<header>
  <div>
    <span class="eyebrow">RisuAI CharX workspace</span>
    <h1>World Viewer</h1>
  </div>
  <select bind:value={selectedId} aria-label="Project">
    {#each projects as project}
      <option value={project.id}>{project.kind === "primary" ? "Main" : "Example"} · {project.name}</option>
    {/each}
  </select>
</header>

{#if error}
  <main><div class="empty"><h2>Viewer data chưa được tạo</h2><p>{error}</p></div></main>
{:else if selected}
  <main>
    <section class="hero">
      <div>
        <span class:primary={selected.kind === "primary"} class="badge">{selected.kind}</span>
        <h2>{selected.name}</h2>
        <p>{selected.description}</p>
        <div class="tags">{#each selected.tags as tag}<span>{tag}</span>{/each}</div>
      </div>
      <div class="stats">
        <article><strong>{selected.stats.characters}</strong><span>characters</span></article>
        <article><strong>{selected.stats.loreEntries}</strong><span>lore entries</span></article>
        <article><strong>{selected.stats.assets}</strong><span>assets</span></article>
        <article><strong>{selected.stats.regexScripts}</strong><span>scripts</span></article>
      </div>
    </section>

    <nav>
      <button class:active={activeTab === "overview"} onclick={() => (activeTab = "overview")}>Overview</button>
      <button class:active={activeTab === "characters"} onclick={() => (activeTab = "characters")}>Characters</button>
      <button class:active={activeTab === "lore"} onclick={() => (activeTab = "lore")}>Lore & rules</button>
    </nav>

    {#if activeTab === "overview"}
      <section class="overview-grid">
        <article><span class="eyebrow">Scenario</span><p>{selected.scenario || "No scenario yet."}</p></article>
        <article><span class="eyebrow">Opening</span><p>{selected.firstMessage || "No opening message yet."}</p></article>
      </section>
    {:else}
      <input class="search" bind:value={query} placeholder="Search names, keys, and content…" />
      <section class="cards">
        {#each visibleLore as entry}
          <article>
            <div class="card-title"><h3>{entry.name}</h3><span>{entry.assets?.length ?? 0} assets</span></div>
            {#if entry.keys}<code>{entry.keys}</code>{/if}
            <p>{entry.content}</p>
          </article>
        {:else}
          <div class="empty">No matching entries.</div>
        {/each}
      </section>
    {/if}
  </main>
{/if}
