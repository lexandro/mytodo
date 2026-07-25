//! Model discovery. Neither CLI has a "list models" command, but both cache
//! something usable:
//!   * Codex — `~/.codex/models_cache.json` holds the COMPLETE list its
//!     account may use (Codex fetches it from the backend), so it replaces
//!     our curated catalog.
//!   * Claude Code — `~/.claude.json` only caches the EXTRA options beyond
//!     the built-in aliases (e.g. a 1M-context variant), so those are added
//!     to the catalog rather than replacing it.
//!
//! This reads other tools' caches, so every step degrades to "no models"
//! instead of erroring: a missing file, a new format or a partial entry just
//! means the fallback list is used.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// One offered model. `note` is a short human hint, not a spec.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub value: String,
    pub label: String,
    pub note: String,
}

/// What a client told us about its models.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ModelList {
    pub models: Vec<ModelInfo>,
    /// true = the whole list (replace the catalog); false = extras to add.
    pub complete: bool,
}

#[derive(Deserialize)]
struct CodexCache {
    #[serde(default)]
    models: Vec<CodexModel>,
}

#[derive(Deserialize)]
struct CodexModel {
    slug: String,
    #[serde(default)]
    display_name: Option<String>,
    #[serde(default)]
    description: Option<String>,
    /// "list" = offered in Codex's own picker; "hide" = internal.
    #[serde(default)]
    visibility: Option<String>,
}

const MAX_NOTE_CHARS: usize = 60;
const MAX_MODELS: usize = 24;

fn home_dir() -> Option<PathBuf> {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
}

fn shorten(text: &str) -> String {
    let trimmed = text.trim().trim_end_matches('.');
    match trimmed.char_indices().nth(MAX_NOTE_CHARS) {
        None => trimmed.to_string(),
        Some((cut, _)) => format!("{}…", &trimmed[..cut]),
    }
}

fn parse_codex_cache(json: &str) -> Vec<ModelInfo> {
    let cache: CodexCache = match serde_json::from_str(json) {
        Ok(cache) => cache,
        Err(_) => return Vec::new(),
    };
    cache
        .models
        .into_iter()
        // hidden entries are Codex's internal helpers, not user choices
        .filter(|m| m.visibility.as_deref().unwrap_or("list") == "list")
        .filter(|m| !m.slug.is_empty())
        .take(MAX_MODELS)
        .map(|m| ModelInfo {
            label: m.display_name.unwrap_or_else(|| m.slug.clone()),
            note: m.description.map(|d| shorten(&d)).unwrap_or_default(),
            value: m.slug,
        })
        .collect()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ClaudeConfig {
    /// Options BEYOND the built-in aliases; absent for most accounts.
    #[serde(default)]
    additional_model_options_cache: Vec<ClaudeModel>,
}

#[derive(Deserialize)]
struct ClaudeModel {
    value: String,
    #[serde(default)]
    label: Option<String>,
    #[serde(default)]
    description: Option<String>,
}

fn parse_claude_config(json: &str) -> Vec<ModelInfo> {
    let config: ClaudeConfig = match serde_json::from_str(json) {
        Ok(config) => config,
        Err(_) => return Vec::new(),
    };
    config
        .additional_model_options_cache
        .into_iter()
        .filter(|m| !m.value.is_empty())
        .take(MAX_MODELS)
        .map(|m| ModelInfo {
            label: m.label.unwrap_or_else(|| m.value.clone()),
            note: m.description.map(|d| shorten(&d)).unwrap_or_default(),
            value: m.value,
        })
        .collect()
}

fn read(path: PathBuf, parse: fn(&str) -> Vec<ModelInfo>) -> Vec<ModelInfo> {
    match std::fs::read_to_string(path) {
        Ok(json) => parse(&json),
        Err(_) => Vec::new(),
    }
}

/// What the provider itself says about its models; empty models = fall back.
pub fn list(provider: &str) -> ModelList {
    let home = match home_dir() {
        Some(home) => home,
        None => {
            return ModelList {
                models: Vec::new(),
                complete: false,
            }
        }
    };
    match provider {
        "codex" => ModelList {
            models: read(
                home.join(".codex").join("models_cache.json"),
                parse_codex_cache,
            ),
            complete: true,
        },
        "claude" => ModelList {
            models: read(home.join(".claude.json"), parse_claude_config),
            complete: false,
        },
        _ => ModelList {
            models: Vec::new(),
            complete: false,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE: &str = r#"{
      "fetched_at": "2026-07-25T13:28:27Z",
      "client_version": "0.145.0",
      "models": [
        {"slug": "gpt-5.6-sol", "display_name": "GPT-5.6-Sol",
         "description": "Latest frontier agentic coding model.", "visibility": "list"},
        {"slug": "gpt-5.6-luna", "display_name": "GPT-5.6-Luna",
         "description": "Fast and affordable agentic coding model.", "visibility": "list"},
        {"slug": "codex-auto-review", "display_name": "Codex Auto Review",
         "description": "Automatic approval review model.", "visibility": "hide"}
      ]
    }"#;

    #[test]
    fn reads_the_listed_models_and_drops_hidden_ones() {
        let models = parse_codex_cache(SAMPLE);
        assert_eq!(
            models,
            vec![
                ModelInfo {
                    value: "gpt-5.6-sol".into(),
                    label: "GPT-5.6-Sol".into(),
                    note: "Latest frontier agentic coding model".into(),
                },
                ModelInfo {
                    value: "gpt-5.6-luna".into(),
                    label: "GPT-5.6-Luna".into(),
                    note: "Fast and affordable agentic coding model".into(),
                },
            ]
        );
    }

    #[test]
    fn a_new_or_broken_format_degrades_to_the_fallback_list() {
        assert!(parse_codex_cache("not json").is_empty());
        assert!(parse_codex_cache("{}").is_empty());
        assert!(parse_codex_cache(r#"{"models": "nope"}"#).is_empty());
        // unknown fields must not break parsing, missing ones fall back
        let partial = r#"{"models":[{"slug":"gpt-9","brand_new_field":42}]}"#;
        assert_eq!(
            parse_codex_cache(partial),
            vec![ModelInfo {
                value: "gpt-9".into(),
                label: "gpt-9".into(),
                note: String::new(),
            }]
        );
    }

    #[test]
    fn long_descriptions_are_shortened_for_the_picker() {
        let long = format!(
            r#"{{"models":[{{"slug":"m","description":"{}"}}]}}"#,
            "x".repeat(200)
        );
        let note = &parse_codex_cache(&long)[0].note;
        assert!(note.chars().count() <= MAX_NOTE_CHARS + 1, "note: {note}");
        assert!(note.ends_with('…'));
    }

    #[test]
    fn claude_contributes_only_its_extra_options() {
        // real shape of ~/.claude.json: unrelated keys around the cache
        let json = r#"{
          "numStartups": 41,
          "additionalModelOptionsCache": [
            {"value": "claude-fable-5[1m]", "label": "Fable",
             "description": "Fable 5 · Most capable for your hardest tasks"}
          ],
          "projects": {}
        }"#;
        assert_eq!(
            parse_claude_config(json),
            vec![ModelInfo {
                value: "claude-fable-5[1m]".into(),
                label: "Fable".into(),
                note: "Fable 5 · Most capable for your hardest tasks".into(),
            }]
        );
        assert!(parse_claude_config(r#"{"numStartups": 1}"#).is_empty());
        assert!(parse_claude_config("nope").is_empty());
    }

    #[test]
    fn completeness_differs_per_provider() {
        // codex reports everything its account may use, claude only extras
        assert!(list("codex").complete);
        assert!(!list("claude").complete);
        let unknown = list("gemini");
        assert!(unknown.models.is_empty() && !unknown.complete);
    }
}
