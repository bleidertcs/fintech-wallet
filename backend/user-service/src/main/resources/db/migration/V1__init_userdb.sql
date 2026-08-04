CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    balance DECIMAL(19,2) NOT NULL,
    daily_limit DECIMAL(19,2) NOT NULL DEFAULT 50000.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'ARS',
    PRIMARY KEY (id),
    CONSTRAINT uk_user_profiles_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
