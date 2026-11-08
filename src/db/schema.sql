-- ============================================================================
-- ARS FACTORY & SERVER EVEO: INFRAESTRUTURA DE PERSISTÊNCIA DE OBSERVABILIDADE
-- Database: postgresql-database-arsfactory (TimescaleDB / PostgreSQL 16)
-- ============================================================================

-- Optional on PostgreSQL. Install the extension separately where TimescaleDB is used.

-- 1. TABELA PERSISTENTE DE LOGS DE MONITORAMENTO E SISTEMA
CREATE TABLE IF NOT EXISTS monitoring_logs (
    id BIGSERIAL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level VARCHAR(16) NOT NULL DEFAULT 'INFO',
    source VARCHAR(64) NOT NULL,
    project VARCHAR(64) NOT NULL DEFAULT 'ars-factory',
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_monitoring_logs_ts ON monitoring_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_level ON monitoring_logs (level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_source ON monitoring_logs (source, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_meta ON monitoring_logs USING GIN (metadata);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('monitoring_logs', 'timestamp', if_not_exists => TRUE);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Hypertable monitoring_logs ja configurada ou formato padrao.';
END $$;

-- 2. TABELA DE EVENTOS DE SEGURANÇA E TENTATIVAS DE INVASÃO (SOC)
CREATE TABLE IF NOT EXISTS security_threat_events (
    id BIGSERIAL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(32) NOT NULL,
    source_ip VARCHAR(45) NOT NULL,
    target_service VARCHAR(64),
    target_user VARCHAR(64),
    severity VARCHAR(16) NOT NULL DEFAULT 'HIGH',
    action_taken VARCHAR(32) NOT NULL DEFAULT 'LOGGED',
    details JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_sec_events_ip ON security_threat_events (source_ip, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sec_events_type ON security_threat_events (event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sec_events_sev ON security_threat_events (severity, timestamp DESC);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('security_threat_events', 'timestamp', if_not_exists => TRUE);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Hypertable security_threat_events ja configurada.';
END $$;

-- 3. TABELA DE BLACKLIST PERSISTENTE DE IPS AMEAÇADORES (SINCRONIZADA COM REDIS)
CREATE TABLE IF NOT EXISTS active_blacklisted_ips (
    ip_address VARCHAR(45) PRIMARY KEY,
    reason VARCHAR(128) NOT NULL,
    offense_count INTEGER NOT NULL DEFAULT 1,
    severity VARCHAR(16) NOT NULL DEFAULT 'CRITICAL',
    banned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_blacklist_active ON active_blacklisted_ips (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_blacklist_exp ON active_blacklisted_ips (expires_at);

-- 4. TABELA DE TELEMETRIA HISTÓRICA AGREGADA (LONG-TERM METRICS ARCHIVE)
CREATE TABLE IF NOT EXISTS system_metrics_archive (
    id BIGSERIAL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metric_name VARCHAR(64) NOT NULL,
    resource_name VARCHAR(64) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    labels JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_metrics_name_ts ON system_metrics_archive (metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_res ON system_metrics_archive (resource_name, timestamp DESC);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('system_metrics_archive', 'timestamp', if_not_exists => TRUE);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Hypertable system_metrics_archive ja configurada.';
END $$;

-- 5. TABELA DE AUDITORIA DE TAREFAS E ORQUESTRADOR RPA (ARS FACTORY)
CREATE TABLE IF NOT EXISTS rpa_task_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    task_id VARCHAR(64) NOT NULL,
    robot_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    duration_ms INTEGER,
    result_summary TEXT,
    payload JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_rpa_task_id ON rpa_task_audit_logs (task_id);
CREATE INDEX IF NOT EXISTS idx_rpa_robot_id ON rpa_task_audit_logs (robot_id);
CREATE INDEX IF NOT EXISTS idx_rpa_status ON rpa_task_audit_logs (status, created_at DESC);
