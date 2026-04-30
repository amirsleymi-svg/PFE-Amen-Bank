-- ============================================================
-- AMEN BANK - Migration V2: New Features
-- 1. Fraud alerts table
-- 2. Rating column for daily_reports
-- 3. Extended notification types
-- ============================================================

USE amen_bank;

-- 1. Create fraud_alerts table
CREATE TABLE IF NOT EXISTS fraud_alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_id BIGINT NULL,
    alert_type ENUM('HIGH_AMOUNT', 'SUSPICIOUS_PATTERN', 'UNUSUAL_DESTINATION', 'VELOCITY') NOT NULL,
    description TEXT NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    status ENUM('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by BIGINT NULL,
    reviewed_at TIMESTAMP NULL,
    review_comment VARCHAR(500),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_fraud_status (status),
    INDEX idx_fraud_severity (severity),
    INDEX idx_fraud_detected (detected_at)
) ENGINE=InnoDB;

-- 2. Add rating column to daily_reports
ALTER TABLE daily_reports ADD COLUMN rating TINYINT NULL AFTER review_comment;

-- 3. Extend notification type enum
ALTER TABLE notifications MODIFY COLUMN type ENUM('INFO', 'WARNING', 'SUCCESS', 'ERROR', 'TRANSFER', 'CREDIT', 'FRAUD', 'CARD', 'REPORT') NOT NULL DEFAULT 'INFO';

SELECT '✓ Migration V2 applied successfully' AS result;
