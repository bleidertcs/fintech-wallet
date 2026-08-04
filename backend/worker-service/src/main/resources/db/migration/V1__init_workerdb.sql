CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    from_user_id BIGINT,
    to_user_id BIGINT,
    amount DECIMAL(19,2),
    event_type VARCHAR(255) NOT NULL,
    details TEXT,
    timestamp DATETIME(6),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS statement_jobs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    status VARCHAR(255) NOT NULL DEFAULT 'PENDING',
    pdf_path VARCHAR(255),
    error_message TEXT,
    created_at DATETIME(6),
    completed_at DATETIME(6),
    PRIMARY KEY (id),
    INDEX idx_statement_jobs_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
