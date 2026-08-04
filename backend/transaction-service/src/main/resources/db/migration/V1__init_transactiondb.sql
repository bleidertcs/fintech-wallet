CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    from_user_id BIGINT NOT NULL,
    to_user_id BIGINT NOT NULL,
    amount DECIMAL(19,2) NOT NULL,
    status VARCHAR(255) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_tx_from_user (from_user_id),
    INDEX idx_tx_to_user (to_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS money_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    requester_id BIGINT NOT NULL,
    target_id BIGINT NOT NULL,
    amount DECIMAL(19,2) NOT NULL,
    message VARCHAR(255),
    status VARCHAR(255) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_money_req_requester (requester_id),
    INDEX idx_money_req_target (target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
