// UI state — everything that is not domain data: panes, selection, view,
// inline rename, drag & drop indicators, context menu, toast. Persistable
// parts (layout, pane lists, archOpen…) are synced to settings in F7/F9.

import { DEFAULT_SETTINGS_SECTION, type SettingsSectionId } from "$lib/core/settings-sections";

export type LayoutName = "1" | "2v" | "2h" | "4";
export type ViewName = "main" | "pinned" | "trash";

export interface PaneState {
  listId: string | null;
  quickDraft: string;
  filterOpen: boolean;
  filterText: string;
  pickerOpen: boolean;
}

/**
 * Inline rename in progress. Lists and groups parse a leading emoji out of the
 * value; a todo edits its title only (its emoji has its own detail control).
 * `paneIndex` is the pane the rename was armed in — the same todo or group can
 * be on screen in several panes, and only one of them may show the input
 * (a second one would steal the focus and blur-commit the first).
 */
export interface RenamingState {
  type: "list" | "group" | "todo";
  id: string;
  value: string;
  paneIndex: number;
}

export type DragPayload = { type: "todo" | "list"; id: string } | null;
export type DropTarget = { key: string; pos: "before" | "after" | "into" } | null;

export type CtxItem =
  | { separator: true }
  | { separator?: false; label: string; hint?: string; danger?: boolean; disabled?: boolean; action: () => void };

export interface CtxMenuState {
  x: number;
  y: number;
  items: CtxItem[];
}

export interface ToastState {
  message: string;
  undoable: boolean;
}

/** AI panel context; see state/ai-actions.ts for the transitions. */
export interface AiPanelState {
  listId: string;
  todoId: string | null;
  /**
   * Thread the panel is showing. Preset actions and chat turns all append to
   * it, so the panel is one continuous conversation until "New chat".
   */
  conversationId: string;
  /** Composer draft (the console input). */
  draft: string;
  /**
   * Permission mode for THIS conversation's chat turns. Fixed once the
   * thread has turns: a resumed session must not silently gain write access.
   */
  chatMode: import("$lib/core/ai-types").AIMode;
  /** Preset action cards expanded (auto-collapse once a thread has turns). */
  presetsOpen: boolean;
  /** History list view. */
  history: boolean;
  /** Guard error from the last start attempt (shown in the panel). */
  error: { message: string; openAiClients?: boolean } | null;
}

const TOAST_MS = 4200;

function emptyPane(): PaneState {
  return { listId: null, quickDraft: "", filterOpen: false, filterText: "", pickerOpen: false };
}

class UiState {
  layout = $state<LayoutName>("1");
  panes = $state<PaneState[]>([emptyPane(), emptyPane(), emptyPane(), emptyPane()]);
  activePane = $state(0);
  view = $state<ViewName>("main");
  selectedId = $state<string | null>(null);
  detailOpen = $state(false);
  detailTab = $state<"details" | "activity" | "ai">("details");
  renaming = $state<RenamingState | null>(null);
  drag = $state<DragPayload>(null);
  drop = $state<DropTarget>(null);
  ctxMenu = $state<CtxMenuState | null>(null);
  toast = $state<ToastState | null>(null);
  /** Archived section open state per list id. */
  archOpen = $state<Record<string, boolean>>({});
  /** Global pinned strip expanded state. */
  pinsOpen = $state(true);
  /** Global search dialog (Ctrl+Shift+F); null = closed. */
  globalSearch = $state<{ query: string; index: number } | null>(null);
  /** Command palette (Ctrl+K); null = closed. */
  palette = $state<{ query: string; index: number } | null>(null);
  /** Theme preference; "system" follows the Windows setting. */
  theme = $state<"system" | "dark" | "light">("system");
  /** Live system dark-mode flag (updated by AppShell's media listener). */
  systemDark = $state(true);
  /** UI scale percent (80–150) — zooms the whole shell. */
  uiScale = $state(100);
  /** Todo title font size in px (10–20) — todo rows only. */
  todoFs = $state(13);
  /** Settings dialog (global shortcuts, …). */
  settingsOpen = $state(false);
  /** Which Settings section the sidebar has selected. */
  settingsSection = $state<SettingsSectionId>(DEFAULT_SETTINGS_SECTION);
  /** Workspace settings dialog for a list id; null = closed. */
  workspaceSettings = $state<string | null>(null);
  /** Icon & color dialog for a list id; null = closed. */
  listAppearance = $state<string | null>(null);
  /** AI Clients settings dialog. */
  aiClientsOpen = $state(false);
  /**
   * AI run panel (right drawer). Bound to the list/todo context it was
   * opened from (aiprompt §39); a running run keeps going when this closes.
   */
  aiPanel = $state<AiPanelState | null>(null);
  /** Backup restore picker dialog. */
  restoreOpen = $state(false);
  /** Open menu-bar menu (File/Edit/…); null = closed. */
  menuOpen = $state<string | null>(null);
  /** Keyboard shortcuts dialog (F1). */
  shortcutsOpen = $state(false);
  /** About dialog (Help → About myTODO). */
  aboutOpen = $state(false);
  /** Changelog dialog (Help → What's new). */
  changelogOpen = $state(false);
  /** Scale controls popover in the title bar. */
  scalePopOpen = $state(false);

  get effectiveTheme(): "dark" | "light" {
    if (this.theme === "system") return this.systemDark ? "dark" : "light";
    return this.theme;
  }

  /** A modal/popover owns the screen — plain-key shortcuts must not fire behind it. */
  get overlayOpen(): boolean {
    return (
      this.menuOpen !== null ||
      this.ctxMenu !== null ||
      this.shortcutsOpen ||
      this.aboutOpen ||
      this.changelogOpen ||
      this.settingsOpen ||
      this.workspaceSettings !== null ||
      this.listAppearance !== null ||
      this.aiClientsOpen ||
      this.restoreOpen ||
      this.scalePopOpen ||
      this.palette !== null ||
      this.globalSearch !== null
    );
  }

  /** Quick-add input elements per pane — for Ctrl+N focus. Not reactive. */
  quickAddEls: (HTMLInputElement | null)[] = [null, null, null, null];

  /** Bumped by F2 to make the detail title focus + select itself. */
  focusTitleTick = $state(0);

  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  get activePaneState(): PaneState {
    return this.panes[this.activePane];
  }

  showToast(message: string, undoable = false): void {
    clearTimeout(this.toastTimer);
    this.toast = { message, undoable };
    this.toastTimer = setTimeout(() => (this.toast = null), TOAST_MS);
  }

  clearDragState(): void {
    this.drag = null;
    this.drop = null;
  }

  updatePane(index: number, patch: Partial<PaneState>): void {
    this.panes[index] = { ...this.panes[index], ...patch };
  }
}

export const ui = new UiState();
