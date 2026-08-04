CREATE TABLE IF NOT EXISTS outbox_events (
    id VARCHAR(36) NOT NULL,
    aggregate_type VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    payload JSON NOT NULL,
    created_at DATETIME(6) NOT NULL,
    processed BIT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    INDEX idx_outbox_created_at (created_at),
    INDEX idx_outbox_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
