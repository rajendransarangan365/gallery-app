/**
 * @gallery/database - SQLite Schema DDL
 * High-performance indexing for 100,000+ photo libraries.
 */

export const INITIAL_SCHEMA_SQL = `
-- Pragmas for 10x Performance & Reliability
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA temp_store = MEMORY;

-- 1. Photos Table
CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    content_hash TEXT NOT NULL UNIQUE,
    file_uri TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    width INTEGER NOT NULL DEFAULT 0,
    height INTEGER NOT NULL DEFAULT 0,
    capture_date TEXT NOT NULL,
    imported_date TEXT NOT NULL,
    modified_date TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    altitude REAL,
    city TEXT,
    country TEXT,
    camera_make TEXT,
    camera_model TEXT,
    lens_model TEXT,
    focal_length REAL,
    f_number REAL,
    iso INTEGER,
    exposure_time TEXT,
    orientation INTEGER DEFAULT 1,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    thumbnail_path TEXT,
    preview_path TEXT
);

CREATE INDEX IF NOT EXISTS idx_photos_capture_date ON photos(capture_date DESC);
CREATE INDEX IF NOT EXISTS idx_photos_favorite ON photos(is_favorite) WHERE is_favorite = 1;
CREATE INDEX IF NOT EXISTS idx_photos_location ON photos(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_content_hash ON photos(content_hash);

-- 2. Albums Table
CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    album_type TEXT NOT NULL DEFAULT 'user',
    cover_photo_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(cover_photo_id) REFERENCES photos(id) ON DELETE SET NULL
);

-- 3. Album Photos Junction
CREATE TABLE IF NOT EXISTS album_photos (
    album_id TEXT NOT NULL,
    photo_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(album_id, photo_id),
    FOREIGN KEY(album_id) REFERENCES albums(id) ON DELETE CASCADE,
    FOREIGN KEY(photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

-- 4. Face Recognition Clusters
CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    representative_photo_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(representative_photo_id) REFERENCES photos(id) ON DELETE SET NULL
);

-- 5. Detected Faces
CREATE TABLE IF NOT EXISTS detected_faces (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    person_id TEXT,
    box_x REAL NOT NULL,
    box_y REAL NOT NULL,
    box_width REAL NOT NULL,
    box_height REAL NOT NULL,
    confidence REAL NOT NULL,
    embedding BLOB, -- 512-dim Float32 vector
    FOREIGN KEY(photo_id) REFERENCES photos(id) ON DELETE CASCADE,
    FOREIGN KEY(person_id) REFERENCES people(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_faces_photo_id ON detected_faces(photo_id);
CREATE INDEX IF NOT EXISTS idx_faces_person_id ON detected_faces(person_id);

-- 6. AI Vision & Semantic Tags
CREATE TABLE IF NOT EXISTS ai_tags (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    category TEXT NOT NULL,
    label TEXT NOT NULL,
    confidence REAL NOT NULL,
    FOREIGN KEY(photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_tags_photo ON ai_tags(photo_id);
CREATE INDEX IF NOT EXISTS idx_ai_tags_label ON ai_tags(label);

-- 7. Non-Destructive Photo Edit Recipes
CREATE TABLE IF NOT EXISTS photo_edits (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL UNIQUE,
    recipe_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

-- 8. Excluded Folders Registry
CREATE TABLE IF NOT EXISTS excluded_folders (
    id TEXT PRIMARY KEY,
    canonical_path TEXT NOT NULL UNIQUE,
    inode TEXT,
    is_recursive INTEGER NOT NULL DEFAULT 1,
    added_at TEXT NOT NULL
);

-- 9. Paired Devices Registry
CREATE TABLE IF NOT EXISTS paired_devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    device_type TEXT NOT NULL,
    platform_version TEXT,
    ip_address TEXT,
    port INTEGER,
    last_seen TEXT NOT NULL,
    is_trusted INTEGER NOT NULL DEFAULT 1
);

-- 10. Sync Manifest History
CREATE TABLE IF NOT EXISTS sync_history (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    direction TEXT NOT NULL, -- 'upload' | 'download'
    status TEXT NOT NULL,
    transferred_files INTEGER NOT NULL DEFAULT 0,
    transferred_bytes INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    error_message TEXT,
    FOREIGN KEY(device_id) REFERENCES paired_devices(id) ON DELETE CASCADE
);
`;

