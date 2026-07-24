// AI client runtime state: detection / browse / test orchestration for the
// AI Clients dialog. Persisted config (enabled/path/version) lives in
// aiConfig.clients; this module owns the transient status + messages.
// Detection runs ONLY on dialog open, Auto Detect or Test — never on
// routine UI actions (aiprompt §40).

import {
  statusFromProbe, statusFromTest, type ProviderStatusInfo, type ProviderUiStatus,
} from "$lib/core/ai-providers";
import { PROVIDER_IDS, type AIProviderId } from "$lib/core/ai-types";
import { aiDetectProvider, aiProbeProvider, aiTestProvider, pickFile } from "$lib/ipc";
import { aiConfig } from "./ai-config.svelte";
import { ui } from "./ui.svelte";

interface ProviderRuntime {
  status: ProviderUiStatus;
  message: string | null;
}

function initialRuntime(): Record<AIProviderId, ProviderRuntime> {
  return {
    claude: { status: "unknown", message: null },
    codex: { status: "unknown", message: null },
  };
}

class AiClientsState {
  runtime = $state<Record<AIProviderId, ProviderRuntime>>(initialRuntime());

  /** Opens the dialog; first open probes stored paths / auto-detects. */
  openDialog(): void {
    ui.aiClientsOpen = true;
    for (const provider of PROVIDER_IDS) {
      if (this.runtime[provider].status === "unknown") void this.autoDetect(provider);
    }
  }

  /**
   * Auto Detect: stored path is re-validated first; otherwise the PATH is
   * searched. Only a successful identity+version probe becomes "detected".
   */
  async autoDetect(provider: AIProviderId): Promise<void> {
    this.setRuntime(provider, { status: "detecting", message: null });
    try {
      const stored = aiConfig.clients[provider].path;
      const path = stored ?? (await aiDetectProvider(provider));
      if (path === null) {
        this.applyInfo(provider, statusFromProbe(provider, { kind: "missing", versionOutput: null, message: null }), null);
        return;
      }
      const probe = await aiProbeProvider(provider, path);
      // a stored path may have broken (portable move) — fall back to PATH once
      if (probe.kind === "missing" && stored !== null) {
        const fresh = await aiDetectProvider(provider);
        if (fresh !== null && fresh !== stored) {
          this.applyInfo(provider, statusFromProbe(provider, await aiProbeProvider(provider, fresh)), fresh);
          return;
        }
      }
      this.applyInfo(provider, statusFromProbe(provider, probe), path);
    } catch (e) {
      this.setRuntime(provider, { status: "notDetected", message: e instanceof Error ? e.message : String(e) });
    }
  }

  /** Browse…: manual executable selection, fully validated (§12). */
  async browse(provider: AIProviderId): Promise<void> {
    const path = await pickFile([{ name: "Executables", extensions: ["exe", "cmd", "bat"] }]);
    if (path === null) return;
    this.setRuntime(provider, { status: "detecting", message: null });
    try {
      const probe = await aiProbeProvider(provider, path);
      this.applyInfo(provider, statusFromProbe(provider, probe), path);
    } catch (e) {
      this.setRuntime(provider, { status: "notDetected", message: e instanceof Error ? e.message : String(e) });
    }
  }

  /** Test: executable + version + best-effort auth readiness (§37). */
  async test(provider: AIProviderId): Promise<void> {
    const path = aiConfig.clients[provider].path;
    if (path === null) {
      await this.autoDetect(provider);
      return;
    }
    this.setRuntime(provider, { status: "detecting", message: null });
    try {
      const outcome = await aiTestProvider(provider, path);
      this.applyInfo(provider, statusFromTest(provider, outcome), path);
    } catch (e) {
      this.setRuntime(provider, { status: "notDetected", message: e instanceof Error ? e.message : String(e) });
    }
  }

  setEnabled(provider: AIProviderId, enabled: boolean): void {
    aiConfig.clients = {
      ...aiConfig.clients,
      [provider]: { ...aiConfig.clients[provider], enabled },
    };
    aiConfig.persistClients();
  }

  /** Applies a probe/test interpretation + persists the validated config. */
  private applyInfo(provider: AIProviderId, info: ProviderStatusInfo, path: string | null): void {
    this.setRuntime(provider, { status: info.status, message: info.message });
    const usable = info.status === "detected" || info.status === "notReady";
    aiConfig.clients = {
      ...aiConfig.clients,
      [provider]: {
        ...aiConfig.clients[provider],
        // a failed probe clears the stored path — an arbitrary file must
        // never linger as if it were the provider (§12)
        path: usable ? path : null,
        version: usable ? info.version : null,
      },
    };
    aiConfig.persistClients();
  }

  private setRuntime(provider: AIProviderId, runtime: ProviderRuntime): void {
    this.runtime = { ...this.runtime, [provider]: runtime };
  }
}

export const aiClients = new AiClientsState();
