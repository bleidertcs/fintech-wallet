CREATE TABLE IF NOT EXISTS saga_instances (
    id VARCHAR(36) NOT NULL,
    saga_type VARCHAR(255) NOT NULL,
    current_step VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    payload JSON NOT NULL,
    error_message TEXT,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_saga_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
