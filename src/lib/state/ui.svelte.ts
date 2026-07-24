// UI state — everything that is not domain data: panes, selection, view,
// inline rename, drag & drop indicators, context menu, toast. Persistable
// parts (layout, pane lists, archOpen…) are synced to settings in F7/F9.

export type LayoutName = "1" | "2v" | "2h" | "4";
export type ViewName = "main" | "pinned" | "trash";

export interface PaneState {
  listId: string | null;
  quickDraft: string;
  filterOpen: boolean;
  filterText: string;
  pickerOpen: boolean;
}

export interface RenamingState {
  type: "list" | "group";
  id: string;
  value: string;
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
  detailTab = $state<"details" | "activity">("details");
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
  /** Visual theme — full System/Light/Dark handling lands in F9. */
  theme = $state<"dark" | "light">("dark");
  /** Settings dialog (global shortcuts, …). */
  settingsOpen = $state(false);

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
