// Command palette entries (Ctrl+K): lists with Ctrl+n hints, layouts,
// views, theme toggle. Pure builder — the component renders and runs them.

import { byOrder } from "$lib/core/ordering";
import { fuzzyMatch } from "$lib/core/search";
import { switchList } from "./actions";
import { store } from "./store.svelte";
import { ui, type LayoutName } from "./ui.svelte";

export interface PaletteCommand {
  emoji: string;
  name: string;
  hint: string;
  run: () => void;
}

const PALETTE_LIMIT = 10;

function close(): void {
  ui.palette = null;
}

export function paletteCommands(query: string): PaletteCommand[] {
  const lists = [...store.data.lists].sort(byOrder);
  const layout = (name: string, emoji: string, value: LayoutName): PaletteCommand => ({
    emoji,
    name: `Layout: ${name}`,
    hint: "",
    run: () => {
      ui.layout = value;
      close();
    },
  });
  const commands: PaletteCommand[] = [
    ...lists.map((list, i): PaletteCommand => ({
      emoji: list.emoji,
      name: list.name,
      hint: i < 9 ? `Ctrl+${i + 1}` : "",
      run: () => {
        close();
        switchList(list.id);
      },
    })),
    layout("single pane", "▤", "1"),
    layout("split vertical", "◫", "2v"),
    layout("split horizontal", "⬓", "2h"),
    layout("2 × 2 grid", "▦", "4"),
    {
      emoji: "◎",
      name: "View: pinned todos",
      hint: "",
      run: () => {
        ui.view = "pinned";
        close();
      },
    },
    {
      emoji: "⌫",
      name: "View: trash",
      hint: "",
      run: () => {
        ui.view = "trash";
        close();
      },
    },
    {
      emoji: "◐",
      name: "Toggle light / dark theme",
      hint: "",
      run: () => {
        ui.theme = ui.theme === "dark" ? "light" : "dark";
        close();
      },
    },
  ];
  return commands.filter((c) => fuzzyMatch(query, c.name)).slice(0, PALETTE_LIMIT);
}
