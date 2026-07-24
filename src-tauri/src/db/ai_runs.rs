//! AI run history persistence. Rows mirror `AIRunRow` in
//! src/lib/core/ai-runs.ts (camelCase over IPC); log/result are opaque JSON
//! strings — the Rust side never interprets them. Writes go through `put`,
//! which also prunes old terminal-status rows so history stays bounded
//! (aiprompt §21) and startup load stays lean.

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

/// Newest terminal-status runs kept per list; running rows are never pruned.
/// Mirrors MAX_RUNS_PER_LIST in src/lib/core/ai-types.ts.
const MAX_RUNS_PER_LIST: i64 = 50;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AiRun {
    pub id: String,
    pub list_id: String,
    pub todo_id: Option<String>,
    pub provider: String,
    pub action: String,
    pub mode: String,
    pub status: String,
    pub started_at: i64,
    pub finished_at: Option<i64>,
    pub session_id: Option<String>,
    /// JSON array of progress lines.
    pub log: String,
    /// JSON result object, or None while running.
    pub result: Option<String>,
    pub error: Option<String>,
}

pub fn load_all(conn: &Connection) -> Result<Vec<AiRun>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, list_id, todo_id, provider, action, mode, status,
                    started_at, finished_at, session_id, log, result, error
             FROM ai_runs ORDER BY started_at DESC",
        )
        .map_err(|e| format!("ai_runs query: {e}"))?;
    let rows = stmt
        .query_map([], |r| {
            Ok(AiRun {
                id: r.get(0)?,
                list_id: r.get(1)?,
                todo_id: r.get(2)?,
                provider: r.get(3)?,
                action: r.get(4)?,
                mode: r.get(5)?,
                status: r.get(6)?,
                started_at: r.get(7)?,
                finished_at: r.get(8)?,
                session_id: r.get(9)?,
                log: r.get(10)?,
                result: r.get(11)?,
                error: r.get(12)?,
            })
        })
        .map_err(|e| format!("ai_runs query: {e}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("ai_runs row: {e}"))
}

/// Upsert one run, then prune the same list: terminal-status rows beyond the
/// newest MAX_RUNS_PER_LIST are deleted (running rows always survive).
pub fn put(conn: &mut Connection, run: &AiRun) -> Result<(), String> {
    let tx = conn
        .transaction()
        .map_err(|e| format!("ai_run put: cannot open transaction: {e}"))?;
    tx.execute(
        "INSERT INTO ai_runs (id, list_id, todo_id, provider, action, mode, status,
            started_at, finished_at, session_id, log, result, error)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)
         ON CONFLICT(id) DO UPDATE SET
           list_id=?2, todo_id=?3, provider=?4, action=?5, mode=?6, status=?7,
           started_at=?8, finished_at=?9, session_id=?10, log=?11, result=?12, error=?13",
        params![
            run.id,
            run.list_id,
            run.todo_id,
            run.provider,
            run.action,
            run.mode,
            run.status,
            run.started_at,
            run.finished_at,
            run.session_id,
            run.log,
            run.result,
            run.error
        ],
    )
    .map_err(|e| format!("ai_run put: {e}"))?;
    tx.execute(
        "DELETE FROM ai_runs WHERE list_id = ?1 AND status != 'running' AND id NOT IN (
             SELECT id FROM ai_runs WHERE list_id = ?1 AND status != 'running'
             ORDER BY started_at DESC LIMIT ?2
         )",
        params![run.list_id, MAX_RUNS_PER_LIST],
    )
    .map_err(|e| format!("ai_run prune: {e}"))?;
    tx.commit()
        .map_err(|e| format!("ai_run put: commit failed: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::model::{DbOp, List};
    use crate::db::{schema, write};

    fn mem_db_with_list(list_id: &str) -> Connection {
        let mut conn = Connection::open_in_memory().expect("open");
        conn.pragma_update(None, "foreign_keys", true).expect("fk");
        schema::migrate(&mut conn).expect("migrate");
        write::apply_ops(
            &mut conn,
            &[DbOp::PutList {
                row: List {
                    id: list_id.into(),
                    name: "L".into(),
                    emoji: "".into(),
                    fixed: false,
                    order: 1.0,
                },
            }],
        )
        .expect("seed list");
        conn
    }

    fn sample_run(id: &str, list_id: &str, started_at: i64) -> AiRun {
        AiRun {
            id: id.into(),
            list_id: list_id.into(),
            todo_id: None,
            provider: "claude".into(),
            action: "investigate".into(),
            mode: "analyze".into(),
            status: "completed".into(),
            started_at,
            finished_at: Some(started_at + 5),
            session_id: Some("sess-1".into()),
            log: r#"["Reading workspace…","Done"]"#.into(),
            result: Some(r#"{"summary":"árvíztűrő tükörfúrógép"}"#.into()),
            error: None,
        }
    }

    #[test]
    fn roundtrip_and_upsert() {
        let mut conn = mem_db_with_list("l1");
        let run = sample_run("r1", "l1", 100);
        put(&mut conn, &run).expect("insert");
        assert_eq!(load_all(&conn).expect("load"), vec![run.clone()]);

        let finished = AiRun {
            status: "failed".into(),
            error: Some("timeout".into()),
            ..run
        };
        put(&mut conn, &finished).expect("update");
        assert_eq!(load_all(&conn).expect("load"), vec![finished]);
    }

    #[test]
    fn prune_keeps_newest_and_running() {
        let mut conn = mem_db_with_list("l1");
        // one long-running row, older than everything else
        let mut running = sample_run("r-running", "l1", 0);
        running.status = "running".into();
        put(&mut conn, &running).expect("running");
        for i in 0..(MAX_RUNS_PER_LIST + 10) {
            put(&mut conn, &sample_run(&format!("r{i}"), "l1", 100 + i)).expect("insert");
        }
        let runs = load_all(&conn).expect("load");
        assert_eq!(runs.len() as i64, MAX_RUNS_PER_LIST + 1);
        assert!(
            runs.iter().any(|r| r.id == "r-running"),
            "running row survives"
        );
        let oldest_terminal = runs
            .iter()
            .filter(|r| r.status != "running")
            .map(|r| r.started_at)
            .min()
            .unwrap();
        assert_eq!(oldest_terminal, 100 + 10, "oldest terminal rows pruned");
    }

    #[test]
    fn prune_is_per_list() {
        let mut conn = mem_db_with_list("l1");
        write::apply_ops(
            &mut conn,
            &[DbOp::PutList {
                row: List {
                    id: "l2".into(),
                    name: "Other".into(),
                    emoji: "".into(),
                    fixed: false,
                    order: 2.0,
                },
            }],
        )
        .expect("second list");
        put(&mut conn, &sample_run("keep-l2", "l2", 1)).expect("l2 run");
        for i in 0..(MAX_RUNS_PER_LIST + 5) {
            put(&mut conn, &sample_run(&format!("r{i}"), "l1", 100 + i)).expect("insert");
        }
        let runs = load_all(&conn).expect("load");
        assert!(
            runs.iter().any(|r| r.id == "keep-l2"),
            "other list untouched"
        );
    }

    #[test]
    fn deleting_the_list_cascades_runs() {
        let mut conn = mem_db_with_list("l1");
        put(&mut conn, &sample_run("r1", "l1", 100)).expect("insert");
        write::apply_ops(&mut conn, &[DbOp::DelList { id: "l1".into() }]).expect("del list");
        assert!(load_all(&conn).expect("load").is_empty());
    }
}
