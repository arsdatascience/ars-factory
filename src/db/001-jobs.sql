CREATE TABLE factory_jobs (
    id UUID PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('task', 'build')),
    name TEXT NOT NULL,
    target TEXT NOT NULL,
    input JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'simulated', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    finished_at TIMESTAMPTZ
);

CREATE INDEX factory_jobs_listing ON factory_jobs (kind, created_at DESC, id DESC);
CREATE INDEX factory_jobs_pending ON factory_jobs (created_at, id) WHERE status = 'queued';

CREATE TABLE factory_job_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES factory_jobs(id),
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX factory_job_events_history ON factory_job_events (job_id, id);

CREATE FUNCTION factory_record_job_event() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO factory_job_events (job_id, status) VALUES (NEW.id, NEW.status);
    RETURN NEW;
END;
$$;

CREATE TRIGGER factory_job_status_event
    AFTER INSERT OR UPDATE OF status ON factory_jobs
    FOR EACH ROW EXECUTE FUNCTION factory_record_job_event();
