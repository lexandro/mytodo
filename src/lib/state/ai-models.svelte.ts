// Model lists for the pickers. Loaded LAZILY — never on startup: the first
// surface that shows models asks for them, and until the answer arrives the
// picker already works from the fallback catalog (core/ai-models.ts).
// Failure is not an error state: an unreadable list simply means fallback.

import {
  noModels, resolveModelOptions, type DiscoveredModels, type ModelOption,
} from "$lib/core/ai-models";
import { PROVIDER_IDS, type AIProviderId } from "$lib/core/ai-types";
import { aiListModels } from "$lib/ipc";

type LoadStatus = "idle" | "loading" | "ready";

function emptyPerProvider<T>(value: () => T): Record<AIProviderId, T> {
  return Object.fromEntries(PROVIDER_IDS.map((id) => [id, value()])) as Record<AIProviderId, T>;
}

class AiModelsState {
  private discovered = $state<Record<AIProviderId, DiscoveredModels>>(
    emptyPerProvider(() => noModels()),
  );
  status = $state<Record<AIProviderId, LoadStatus>>(emptyPerProvider<LoadStatus>(() => "idle"));

  /** What the picker should offer right now (fallback until loaded). */
  options(provider: AIProviderId): readonly ModelOption[] {
    return resolveModelOptions(provider, this.discovered[provider]);
  }

  /** True while the client's own list is still being read. */
  isLoading(provider: AIProviderId): boolean {
    return this.status[provider] === "loading";
  }

  /** Idle-time prefetch for every client, so a picker never opens empty. */
  prefetchAll(): void {
    for (const provider of PROVIDER_IDS) this.ensureLoaded(provider);
  }

  /** Asks the client once per session; repeated calls are no-ops. */
  ensureLoaded(provider: AIProviderId): void {
    if (this.status[provider] !== "idle") return;
    this.status = { ...this.status, [provider]: "loading" };
    void aiListModels(provider)
      .then((discovered) => {
        this.discovered = { ...this.discovered, [provider]: discovered };
      })
      .catch(() => {
        // stay silent: the fallback catalog covers this case
      })
      .finally(() => {
        this.status = { ...this.status, [provider]: "ready" };
      });
  }
}

export const aiModels = new AiModelsState();
