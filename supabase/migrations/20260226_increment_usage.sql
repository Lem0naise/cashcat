-- Atomically increment import_count or export_count in the settings table.
-- Uses INSERT ... ON CONFLICT so it is safe even if the settings row does not
-- exist yet (e.g. the user bypassed the onboarding flow).
--
-- p_user_id is declared as text so the Supabase JS client can pass a plain
-- string; it is cast to uuid internally.

CREATE OR REPLACE FUNCTION increment_usage_count(
    p_user_id text,
    p_field    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_field NOT IN ('import_count', 'export_count') THEN
        RAISE EXCEPTION 'Invalid field: %', p_field;
    END IF;

    INSERT INTO settings (id, import_count, export_count)
    VALUES (
        p_user_id::uuid,
        CASE WHEN p_field = 'import_count' THEN 1 ELSE 0 END,
        CASE WHEN p_field = 'export_count' THEN 1 ELSE 0 END
    )
    ON CONFLICT (id) DO UPDATE
    SET import_count = CASE
            WHEN p_field = 'import_count' THEN settings.import_count + 1
            ELSE settings.import_count
        END,
        export_count = CASE
            WHEN p_field = 'export_count' THEN settings.export_count + 1
            ELSE settings.export_count
        END;
END;
$$;
