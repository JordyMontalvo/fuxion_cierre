-- Fuxion Massive Closure Schema (10M Users)
-- Optimized for fast reads and tree traversal

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    sponsor_id INTEGER REFERENCES users(id),
    name VARCHAR(255),
    pv4 NUMERIC(10, 2) DEFAULT 0, -- Personal Volume 4 Weeks
    gv NUMERIC(15, 2) DEFAULT 0,  -- Group Volume
    rank_id VARCHAR(50),
    level INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_sponsor ON users(sponsor_id);
CREATE INDEX idx_users_rank ON users(rank_id);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount NUMERIC(10, 2),
    type VARCHAR(50), -- 'purchase', 'return', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed metadata for 10M Simulation (Logic only, actual 10M inserted via Go ingest)
INSERT INTO users (id, name, pv4, level) VALUES (1, 'ROOT', 500, 0) ON CONFLICT DO NOTHING;
