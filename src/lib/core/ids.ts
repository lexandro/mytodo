// Id generation — kept in core so tests can run under Node (crypto.randomUUID
// exists in both Node 19+ and the webview).

export function newId(): string {
  return crypto.randomUUID();
}
