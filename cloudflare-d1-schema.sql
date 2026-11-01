-- ============================================================================
-- BRILLIANT ACADEMY - ENTERPRISE CLOUDFLARE D1 SQL RELATIONAL SCHEMA
-- Ultra-Low Latency (<10ms) Global Edge Database
-- Execute via: npx wrangler d1 execute brilliant-academy-db --file=./cloudflare-d1-schema.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  role TEXT DEFAULT 'student',
  avatar TEXT DEFAULT '',
  enrolled_courses TEXT DEFAULT '[]',
  last_active_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  instructor TEXT DEFAULT 'Physics Beast',
  price REAL DEFAULT 0,
  currency TEXT DEFAULT 'LKR',
  thumbnail_url TEXT DEFAULT '',
  is_published INTEGER DEFAULT 1,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  video_r2_key TEXT DEFAULT '',
  is_free INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  payment_id TEXT DEFAULT '',
  enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS video_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  watched_seconds INTEGER DEFAULT 0,
  total_seconds INTEGER DEFAULT 0,
  is_completed INTEGER DEFAULT 0,
  last_watched_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'LKR',
  payment_method TEXT DEFAULT 'payable',
  status TEXT DEFAULT 'pending',
  txn_id TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_ledger (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_id TEXT DEFAULT 'system',
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  payload_hash TEXT DEFAULT '',
  details TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indices for instant (<5ms) edge queries
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_course ON video_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_ledger(event_type, created_at);
