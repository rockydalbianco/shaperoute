-- Accounts and their sessions (TASK-114, ADR-0115, docs/DATABASE.md).
-- A migration already in main is never edited: write the next one.

CREATE TABLE users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Lower case, so one address is one account however it is typed.
    email text NOT NULL UNIQUE
        CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 254),
    -- Argon2id, with its own salt and parameters; never the password.
    password_hash text NOT NULL,
    -- Shown as typed, unique whatever the case.
    username text NOT NULL CHECK (username ~ '^[A-Za-z0-9_.]{3,20}$'),
    role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    -- When the person ticked "I am at least 16" (ADR-0114, point 6).
    confirmed_16_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX users_username_lower_key ON users (lower(username));

-- One row per signed-in phone. Only the SHA-256 of the token is kept: a
-- copy of the database does not let anyone in. A session ends 90 days
-- after its last use, or when its row is deleted (signing out).
CREATE TABLE sessions (
    token_hash bytea PRIMARY KEY CHECK (length(token_hash) = 32),
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL,
    last_used_at timestamptz NOT NULL
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
