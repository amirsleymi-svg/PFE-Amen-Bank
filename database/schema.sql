-- ============================================================
-- AMEN BANK - Complete Database Schema
-- 3 Roles: CLIENT, EMPLOYEE, ADMIN
-- ============================================================

DROP DATABASE IF EXISTS amen_bank;
CREATE DATABASE amen_bank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE amen_bank;

-- ============================================================
-- 1. IDENTITY & SECURITY TABLES
-- ============================================================

-- Roles lookup
CREATE TABLE roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Permissions lookup
CREATE TABLE permissions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Role-Permission mapping
CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Users (all accounts: clients, employees, admins)
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role_id BIGINT NOT NULL,
    status ENUM('PENDING', 'ACTIVE', 'DISABLED', 'LOCKED') NOT NULL DEFAULT 'PENDING',
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    INDEX idx_users_email (email),
    INDEX idx_users_username (username),
    INDEX idx_users_status (status),
    INDEX idx_users_role (role_id)
) ENGINE=InnoDB;

-- ============================================================
-- 2. BANKING TABLES
-- ============================================================

-- Bank accounts
CREATE TABLE bank_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(20) NOT NULL UNIQUE,
    iban VARCHAR(34) NOT NULL UNIQUE,
    balance DECIMAL(15,3) NOT NULL DEFAULT 0.000,
    currency VARCHAR(3) NOT NULL DEFAULT 'TND',
    status ENUM('ACTIVE', 'DISABLED', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    client_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id),
    INDEX idx_bank_accounts_client (client_id),
    INDEX idx_bank_accounts_status (status),
    INDEX idx_bank_accounts_iban (iban)
) ENGINE=InnoDB;

-- Account cards (linked cards)
CREATE TABLE account_cards (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    card_number_masked VARCHAR(19) NOT NULL,
    card_token VARCHAR(255) NOT NULL UNIQUE,
    expiry_date DATE NOT NULL,
    status ENUM('ACTIVE', 'DISABLED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    client_id BIGINT NOT NULL,
    account_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (account_id) REFERENCES bank_accounts(id),
    INDEX idx_account_cards_client (client_id),
    INDEX idx_account_cards_account (account_id)
) ENGINE=InnoDB;

-- ============================================================
-- 3. TRANSACTIONS & TRANSFERS
-- ============================================================

-- Transactions (global history)
CREATE TABLE transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reference VARCHAR(50) NOT NULL UNIQUE,
    type ENUM('TRANSFER_SIMPLE', 'TRANSFER_GROUPED', 'TRANSFER_PERMANENT', 'CREDIT_DISBURSEMENT', 'CARD_LINKING', 'CREDIT_REPAYMENT') NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    amount DECIMAL(15,3) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'TND',
    source_account_id BIGINT,
    destination_account_id BIGINT,
    destination_external_iban VARCHAR(34),
    description_text VARCHAR(500),
    initiated_by BIGINT NOT NULL,
    approved_by BIGINT NULL,
    executed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (source_account_id) REFERENCES bank_accounts(id),
    FOREIGN KEY (destination_account_id) REFERENCES bank_accounts(id),
    FOREIGN KEY (initiated_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX idx_transactions_source (source_account_id),
    INDEX idx_transactions_dest (destination_account_id),
    INDEX idx_transactions_status (status),
    INDEX idx_transactions_type (type),
    INDEX idx_transactions_initiator (initiated_by),
    INDEX idx_transactions_created (created_at)
) ENGINE=InnoDB;

-- Transaction history (status changes audit trail)
CREATE TABLE transaction_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_id BIGINT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by BIGINT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comment VARCHAR(500),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id),
    INDEX idx_tx_history_transaction (transaction_id)
) ENGINE=InnoDB;

-- Transfer requests (before execution)
CREATE TABLE transfer_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_id BIGINT NOT NULL UNIQUE,
    transfer_type ENUM('SIMPLE', 'GROUPED', 'PERMANENT') NOT NULL,
    requires_2fa_confirmation BOOLEAN NOT NULL DEFAULT TRUE,
    two_fa_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    client_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES users(id),
    INDEX idx_transfer_requests_client (client_id)
) ENGINE=InnoDB;

-- Transfer beneficiaries (for grouped transfers)
CREATE TABLE transfer_beneficiaries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transfer_request_id BIGINT NOT NULL,
    beneficiary_name VARCHAR(200) NOT NULL,
    beneficiary_iban VARCHAR(34) NOT NULL,
    amount DECIMAL(15,3) NOT NULL,
    destination_account_id BIGINT NULL,
    FOREIGN KEY (transfer_request_id) REFERENCES transfer_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (destination_account_id) REFERENCES bank_accounts(id),
    INDEX idx_beneficiaries_request (transfer_request_id)
) ENGINE=InnoDB;

-- Scheduled transfers (permanent/recurring)
CREATE TABLE scheduled_transfers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transfer_request_id BIGINT NOT NULL,
    frequency ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    next_execution_date DATE NOT NULL,
    last_executed_at TIMESTAMP NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    source_account_id BIGINT NOT NULL,
    destination_iban VARCHAR(34) NOT NULL,
    amount DECIMAL(15,3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_request_id) REFERENCES transfer_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (source_account_id) REFERENCES bank_accounts(id),
    INDEX idx_scheduled_active (is_active, next_execution_date)
) ENGINE=InnoDB;

-- ============================================================
-- 4. CREDITS
-- ============================================================

-- Credit simulations (history)
CREATE TABLE credit_simulations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    client_id BIGINT NOT NULL,
    amount DECIMAL(15,3) NOT NULL,
    duration_months INT NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    monthly_payment DECIMAL(15,3) NOT NULL,
    total_cost DECIMAL(15,3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id),
    INDEX idx_credit_sim_client (client_id)
) ENGINE=InnoDB;

-- Credit requests
CREATE TABLE credit_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    client_id BIGINT NOT NULL,
    amount DECIMAL(15,3) NOT NULL,
    duration_months INT NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    monthly_payment DECIMAL(15,3) NOT NULL,
    total_cost DECIMAL(15,3) NOT NULL,
    purpose VARCHAR(500),
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'DISBURSED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    reviewed_by BIGINT NULL,
    decision_comment VARCHAR(500),
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    INDEX idx_credit_req_client (client_id),
    INDEX idx_credit_req_status (status)
) ENGINE=InnoDB;

-- ============================================================
-- 5. REGISTRATION & PASSWORD RESET
-- ============================================================

-- Registration requests
CREATE TABLE registration_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    reviewed_by BIGINT NULL,
    decision_comment VARCHAR(500),
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reg_req_status (status),
    INDEX idx_reg_req_email (email)
) ENGINE=InnoDB;

-- Password reset requests
CREATE TABLE password_reset_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    reviewed_by BIGINT NULL,
    decision_comment VARCHAR(500),
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_pwd_reset_user (user_id),
    INDEX idx_pwd_reset_status (status)
) ENGINE=InnoDB;

-- Activation tokens
CREATE TABLE activation_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_activation_token (token)
) ENGINE=InnoDB;

-- Reset tokens
CREATE TABLE reset_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_reset_token (token)
) ENGINE=InnoDB;

-- ============================================================
-- 6. SECURITY, LOGS & NOTIFICATIONS
-- ============================================================

-- Two-factor OTP codes (email-based)
CREATE TABLE two_factor_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose ENUM('LOGIN', 'TRANSFER', 'SENSITIVE_ACTION') NOT NULL DEFAULT 'LOGIN',
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_2fa_user (user_id),
    INDEX idx_2fa_code (code, user_id)
) ENGINE=InnoDB;

-- Audit logs
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id BIGINT,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- Notifications
CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('INFO', 'WARNING', 'SUCCESS', 'ERROR') NOT NULL DEFAULT 'INFO',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user_read (user_id, is_read),
    INDEX idx_notif_created (created_at)
) ENGINE=InnoDB;

-- Daily reports (employee)
CREATE TABLE daily_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    report_date DATE NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    status ENUM('DRAFT', 'SUBMITTED', 'REVIEWED') NOT NULL DEFAULT 'DRAFT',
    reviewed_by BIGINT NULL,
    review_comment VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    UNIQUE KEY uk_employee_date (employee_id, report_date),
    INDEX idx_report_date (report_date),
    INDEX idx_report_status (status)
) ENGINE=InnoDB;

-- Refresh tokens (for JWT refresh)
CREATE TABLE refresh_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_refresh_token (token(255)),
    INDEX idx_refresh_user (user_id)
) ENGINE=InnoDB;

-- ============================================================
-- 7. SEED DATA
-- ============================================================

-- Insert roles
INSERT INTO roles (name, description) VALUES
('CLIENT', 'Bank client with personal account access'),
('EMPLOYEE', 'Bank employee with limited operational access'),
('ADMIN', 'Administrator with full system management access');

-- Insert permissions
INSERT INTO permissions (name, description) VALUES
-- Client permissions
('CLIENT_VIEW_ACCOUNT', 'View own bank accounts and balances'),
('CLIENT_VIEW_TRANSACTIONS', 'View own transaction history'),
('CLIENT_INITIATE_TRANSFER', 'Initiate transfer requests'),
('CLIENT_SIMULATE_CREDIT', 'Run credit simulations'),
('CLIENT_REQUEST_CREDIT', 'Submit credit requests'),
('CLIENT_LINK_CARD', 'Link a bank card to account'),
('CLIENT_USE_CHATBOT', 'Access chatbot assistance'),
-- Employee permissions
('EMPLOYEE_VIEW_TRANSFERS', 'View pending transfer requests'),
('EMPLOYEE_APPROVE_TRANSFER', 'Approve or reject transfers'),
('EMPLOYEE_VIEW_CREDITS', 'View pending credit requests'),
('EMPLOYEE_APPROVE_CREDIT', 'Approve or reject credits'),
('EMPLOYEE_VIEW_CLIENTS', 'View client information for processing'),
('EMPLOYEE_MANAGE_CLIENT_STATUS', 'Activate or deactivate client accounts'),
('EMPLOYEE_CREATE_REPORT', 'Create daily reports'),
-- Admin permissions
('ADMIN_MANAGE_USERS', 'Create, modify, activate, deactivate users'),
('ADMIN_APPROVE_REGISTRATION', 'Approve or reject registration requests'),
('ADMIN_APPROVE_RESET_REQUEST', 'Approve or reject password reset requests'),
('ADMIN_APPROVE_CREDIT', 'Approve or reject credit requests'),
('ADMIN_APPROVE_TRANSFER', 'Approve or reject transfer requests'),
('ADMIN_MANAGE_ROLES', 'Manage role permissions'),
('ADMIN_VIEW_AUDIT_LOGS', 'View system audit logs'),
('ADMIN_VIEW_REPORTS', 'View employee reports'),
('ADMIN_DELETE_USER', 'Securely delete user accounts'),
('ADMIN_MONITOR_SYSTEM', 'Access system monitoring dashboard');

-- Assign permissions to CLIENT role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'CLIENT' AND p.name IN (
    'CLIENT_VIEW_ACCOUNT', 'CLIENT_VIEW_TRANSACTIONS', 'CLIENT_INITIATE_TRANSFER',
    'CLIENT_SIMULATE_CREDIT', 'CLIENT_REQUEST_CREDIT', 'CLIENT_LINK_CARD', 'CLIENT_USE_CHATBOT'
);

-- Assign permissions to EMPLOYEE role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'EMPLOYEE' AND p.name IN (
    'EMPLOYEE_VIEW_TRANSFERS', 'EMPLOYEE_APPROVE_TRANSFER', 'EMPLOYEE_VIEW_CREDITS',
    'EMPLOYEE_APPROVE_CREDIT', 'EMPLOYEE_VIEW_CLIENTS', 'EMPLOYEE_MANAGE_CLIENT_STATUS',
    'EMPLOYEE_CREATE_REPORT'
);

-- Assign permissions to ADMIN role (gets all admin + can also view like employee)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ADMIN' AND p.name IN (
    'ADMIN_MANAGE_USERS', 'ADMIN_APPROVE_REGISTRATION', 'ADMIN_APPROVE_RESET_REQUEST',
    'ADMIN_APPROVE_CREDIT', 'ADMIN_APPROVE_TRANSFER', 'ADMIN_MANAGE_ROLES',
    'ADMIN_VIEW_AUDIT_LOGS', 'ADMIN_VIEW_REPORTS', 'ADMIN_DELETE_USER', 'ADMIN_MONITOR_SYSTEM',
    'EMPLOYEE_VIEW_TRANSFERS', 'EMPLOYEE_VIEW_CREDITS', 'EMPLOYEE_VIEW_CLIENTS'
);

-- Insert initial admin user (password: Admin@2026 - bcrypt hash)
INSERT INTO users (first_name, last_name, email, username, password_hash, phone, role_id, status, two_factor_enabled)
VALUES (
    'Admin', 'System',
    'admin@amenbank.com.tn',
    'admin',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    '+216 71 000 000',
    (SELECT id FROM roles WHERE name = 'ADMIN'),
    'ACTIVE',
    TRUE
);

-- Insert sample employee
INSERT INTO users (first_name, last_name, email, username, password_hash, phone, role_id, status, two_factor_enabled)
VALUES (
    'Sami', 'Ben Ali',
    'sami.benali@amenbank.com.tn',
    'sami.employee',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    '+216 71 111 111',
    (SELECT id FROM roles WHERE name = 'EMPLOYEE'),
    'ACTIVE',
    TRUE
);

-- Insert sample client
INSERT INTO users (first_name, last_name, email, username, password_hash, phone, role_id, status, two_factor_enabled)
VALUES (
    'Fatma', 'Trabelsi',
    'fatma.trabelsi@gmail.com',
    'fatma.client',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    '+216 98 765 432',
    (SELECT id FROM roles WHERE name = 'CLIENT'),
    'ACTIVE',
    TRUE
);

-- Insert sample bank accounts for the client
INSERT INTO bank_accounts (account_number, iban, balance, currency, status, client_id)
VALUES
('00100234567', 'TN5907078100100234567890', 15250.500, 'TND', 'ACTIVE',
    (SELECT id FROM users WHERE username = 'fatma.client')),
('00100234568', 'TN5907078100100234568901', 3200.000, 'TND', 'ACTIVE',
    (SELECT id FROM users WHERE username = 'fatma.client'));

SELECT '✓ Database amen_bank created successfully' AS result;
SELECT CONCAT('  Tables: ', COUNT(*)) AS result FROM information_schema.tables WHERE table_schema = 'amen_bank';
SELECT CONCAT('  Roles: ', GROUP_CONCAT(name)) AS result FROM roles;
SELECT CONCAT('  Permissions: ', COUNT(*)) AS result FROM permissions;
SELECT CONCAT('  Users: ', COUNT(*)) AS result FROM users;
