CREATE TABLE IF NOT EXISTS auth_session (
  token_hash TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS auth_session_user_id_idx ON auth_session (user_id);
CREATE INDEX IF NOT EXISTS auth_session_expires_at_idx ON auth_session (expires_at);

PRAGMA optimize;
