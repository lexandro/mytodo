// Menu bar contents (COMPONENTS.md §MenuBar) — the discoverability surface:
// every shortcut appears here with its hint. Pure builders; MenuBar.svelte
// renders them. Import/Export/Backup items arrive with F10.

import { byOrder } from "$lib/core/ordering";
import { findTodo } from "$lib/core/todos-ops";
import { newList, switchList, trashTodoAction, undoAction } from "./actions";
import { backupNowAction, exportJsonAction, importJsonAction } from "./actions-data";
import { duplicateAction } from "./actions-detail";
import { moveUpOneLevel } from "./menus";
import { showQuickAddWindow, windowClose } from "$lib/ipc";
import { store } from "./store.svelte";
import { ui, type LayoutName } from "./ui.svelte";

export interface MenuItem {
  separator?: boolean;
  label?: string;
  hint?: string;
  disabled?: boolean;
  action?: () => void;
}

function close(): void {
  ui.menuOpen = null;
}

function item(label: string, action: () => void, hint = "", disabled = false): MenuItem {
  return {
    label,
    hint,
    disabled,
    action: () => {
      close();
      action();
    },
  };
}

const SEP: MenuItem = { separator: true };

function fileMenu(): MenuItem[] {
  return [
    item("New todo", () => ui.quickAddEls[ui.activePane]?.focus(), "Ctrl+N"),
    item("New list", () => newList(), "Ctrl+Shift+N"),
    item("Global quick add", () => void showQuickAddWindow(), "Ctrl+Shift+Space"),
    SEP,
    item("Import JSON…", () => void importJsonAction()),
    item("Export JSON…", () => void exportJsonAction()),
    item("Backup now", () => void backupNowAction()),
    item("Restore backup…", () => (ui.restoreOpen = true)),
    SEP,
    item("Settings…", () => (ui.settingsOpen = true)),
    SEP,
    item("Exit", () => void windowClose()),
  ];
}

function editMenu(): MenuItem[] {
  const selected = ui.selectedId !== null ? findTodo(store.data, ui.selectedId) : undefined;
  const has = selected !== undefined;
  return [
    item("Undo", () => undoAction(), "Ctrl+Z"),
    SEP,
    item("Rename", () => {
      ui.detailOpen = true;
      ui.detailTab = "details";
      ui.focusTitleTick += 1;
    }, "F2", !has),
    item("Duplicate", () => { if (selected !== undefined) duplicateAction(selected.id); }, "", !has),
    item(
      "Move up one level",
      () => { if (selected !== undefined) moveUpOneLevel(selected); },
      "Alt+←",
      !has || selected.groupId === null,
    ),
    item("Delete", () => { if (selected !== undefined) trashTodoAction(selected.id); }, "Del", !has),
  ];
}

function viewMenu(): MenuItem[] {
  const layout = (label: string, value: LayoutName): MenuItem =>
    item(`${ui.layout === value ? "●" : "○"}  ${label}`, () => (ui.layout = value));
  return [
    layout("Single pane", "1"),
    layout("Split vertical", "2v"),
    layout("Split horizontal", "2h"),
    layout("2 × 2 grid", "4"),
    SEP,
    item("Pinned todos", () => (ui.view = "pinned")),
    item("Trash", () => (ui.view = "trash")),
    SEP,
    item(
      ui.effectiveTheme === "dark" ? "Switch to light theme" : "Switch to dark theme",
      () => (ui.theme = ui.effectiveTheme === "dark" ? "light" : "dark"),
    ),
    item("Follow system theme", () => (ui.theme = "system"), ui.theme === "system" ? "✓" : ""),
  ];
}

function goMenu(): MenuItem[] {
  const lists = [...store.data.lists].sort(byOrder);
  return [
    item("Command palette", () => (ui.palette = { query: "", index: 0 }), "Ctrl+K"),
    item("Global search", () => (ui.globalSearch = { query: "", index: 0 }), "Ctrl+Shift+F"),
    item("Filter current list", () => {
      const pane = ui.activePaneState;
      ui.updatePane(ui.activePane, { filterOpen: !pane.filterOpen, filterText: "" });
    }, "Ctrl+F"),
    SEP,
    ...lists.map((list, i) =>
      item(
        list.emoji === "" ? list.name : `${list.emoji}  ${list.name}`,
        () => switchList(list.id),
        i < 9 ? `Ctrl+${i + 1}` : "",
      ),
    ),
  ];
}

function helpMenu(): MenuItem[] {
  return [
    item("Keyboard shortcuts", () => (ui.shortcutsOpen = true), "F1"),
    item("About myTODO", () => ui.showToast("myTODO — fast local todo workspace")),
  ];
}

export const MENUS: { name: string; items: () => MenuItem[] }[] = [
  { name: "File", items: fileMenu },
  { name: "Edit", items: editMenu },
  { name: "View", items: viewMenu },
  { name: "Go", items: goMenu },
  { name: "Help", items: helpMenu },
];
