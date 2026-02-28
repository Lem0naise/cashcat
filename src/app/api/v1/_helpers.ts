import { NextResponse } from 'next/server';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_REGEX = /^\d{4}-\d{2}$/;

type Success<T> = { ok: true; value: T };
type Failure = { ok: false; response: NextResponse };
type ParseResult<T> = Success<T> | Failure;

export function apiError(status: number, code: string, message: string, details?: unknown) {
    return NextResponse.json(
        {
            error: {
                code,
                message,
                details: details ?? null,
            },
        },
        { status }
    );
}

export function apiData<T>(data: T, meta?: Record<string, unknown>) {
    return NextResponse.json({ data, ...(meta ? { meta } : {}) });
}

export function parseBooleanParam(
    value: string | null,
    paramName: string,
    defaultValue: boolean
): ParseResult<boolean> {
    if (value === null) return { ok: true, value: defaultValue };
    const normalized = value.toLowerCase();
    if (normalized === 'true' || normalized === '1') return { ok: true, value: true };
    if (normalized === 'false' || normalized === '0') return { ok: true, value: false };
    return {
        ok: false,
        response: apiError(400, 'invalid_parameter', `Invalid ${paramName}. Use true/false.`),
    };
}

export function parseNumberParam(
    value: string | null,
    paramName: string,
    options: {
        required?: boolean;
        integer?: boolean;
        min?: number;
        max?: number;
        defaultValue?: number | null;
    } = {}
): ParseResult<number | null> {
    const {
        required = false,
        integer = false,
        min = Number.NEGATIVE_INFINITY,
        max = Number.POSITIVE_INFINITY,
        defaultValue = null,
    } = options;

    if (value === null || value === '') {
        if (required) {
            return {
                ok: false,
                response: apiError(400, 'missing_parameter', `Missing required parameter: ${paramName}`),
            };
        }
        return { ok: true, value: defaultValue };
    }

    const parsed = integer ? Number.parseInt(value, 10) : Number(value);
    if (!Number.isFinite(parsed)) {
        return {
            ok: false,
            response: apiError(400, 'invalid_parameter', `Invalid ${paramName}. Must be a number.`),
        };
    }

    if (parsed < min || parsed > max) {
        return {
            ok: false,
            response: apiError(
                400,
                'invalid_parameter',
                `Invalid ${paramName}. Must be between ${min} and ${max}.`
            ),
        };
    }

    return { ok: true, value: parsed };
}

export function parseUuidParam(value: string | null, paramName: string): ParseResult<string | null> {
    if (value === null || value === '') return { ok: true, value: null };
    if (!UUID_REGEX.test(value)) {
        return {
            ok: false,
            response: apiError(400, 'invalid_parameter', `Invalid ${paramName}. Must be a UUID.`),
        };
    }
    return { ok: true, value };
}

export function parseUuidListParam(value: string | null, paramName: string): ParseResult<string[] | null> {
    if (value === null || value.trim() === '') return { ok: true, value: null };
    const values = value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    if (values.length === 0) return { ok: true, value: null };

    const invalid = values.find((entry) => !UUID_REGEX.test(entry));
    if (invalid) {
        return {
            ok: false,
            response: apiError(
                400,
                'invalid_parameter',
                `Invalid ${paramName}. '${invalid}' is not a valid UUID.`
            ),
        };
    }

    return { ok: true, value: values };
}

export function parseMonthParam(value: string | null, paramName: string): ParseResult<string | null> {
    if (value === null || value === '') return { ok: true, value: null };
    if (!MONTH_REGEX.test(value)) {
        return {
            ok: false,
            response: apiError(400, 'invalid_parameter', `Invalid ${paramName} format. Use YYYY-MM.`),
        };
    }
    return { ok: true, value };
}

export function parseDateParam(value: string | null, paramName: string): ParseResult<string | null> {
    if (value === null || value === '') return { ok: true, value: null };
    if (!DATE_REGEX.test(value)) {
        return {
            ok: false,
            response: apiError(400, 'invalid_parameter', `Invalid ${paramName} format. Use YYYY-MM-DD.`),
        };
    }
    return { ok: true, value };
}

export function parseEnumParam<T extends string>(
    value: string | null,
    paramName: string,
    allowed: readonly T[]
): ParseResult<T | null> {
    if (value === null || value === '') return { ok: true, value: null };
    const isAllowed = allowed.includes(value as T);
    if (!isAllowed) {
        return {
            ok: false,
            response: apiError(
                400,
                'invalid_parameter',
                `Invalid ${paramName}. Allowed values: ${allowed.join(', ')}`
            ),
        };
    }
    return { ok: true, value: value as T };
}

export function parseFieldsParam(value: string | null, allowedFields: readonly string[]): ParseResult<string[] | null> {
    if (value === null || value.trim() === '') return { ok: true, value: null };
    const requested = value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

    if (requested.length === 0) return { ok: true, value: null };

    const invalid = requested.find((field) => !allowedFields.includes(field));
    if (invalid) {
        return {
            ok: false,
            response: apiError(
                400,
                'invalid_parameter',
                `Invalid fields parameter. '${invalid}' is not selectable.`
            ),
        };
    }

    return { ok: true, value: Array.from(new Set(requested)) };
}

export function encodeCursor(offset: number) {
    return Buffer.from(String(offset), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): number | null {
    try {
        const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
        const parsed = Number.parseInt(decoded, 10);
        if (!Number.isFinite(parsed) || parsed < 0) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function parsePagination(params: {
    limitRaw: string | null;
    offsetRaw: string | null;
    cursorRaw: string | null;
    defaultLimit?: number;
    maxLimit?: number;
}): ParseResult<{ limit: number; offset: number; cursor: string | null }> {
    const { limitRaw, offsetRaw, cursorRaw, defaultLimit = 100, maxLimit = 1000 } = params;

    const limitResult = parseNumberParam(limitRaw, 'limit', {
        integer: true,
        min: 1,
        max: maxLimit,
        defaultValue: defaultLimit,
    });
    if (!limitResult.ok) return limitResult;

    if (cursorRaw && offsetRaw !== null) {
        return {
            ok: false,
            response: apiError(400, 'invalid_parameter', "Use either 'cursor' or 'offset', not both."),
        };
    }

    if (cursorRaw) {
        const decoded = decodeCursor(cursorRaw);
        if (decoded === null) {
            return {
                ok: false,
                response: apiError(400, 'invalid_parameter', 'Invalid cursor value.'),
            };
        }
        return { ok: true, value: { limit: limitResult.value as number, offset: decoded, cursor: cursorRaw } };
    }

    const offsetResult = parseNumberParam(offsetRaw, 'offset', {
        integer: true,
        min: 0,
        max: Number.MAX_SAFE_INTEGER,
        defaultValue: 0,
    });
    if (!offsetResult.ok) return offsetResult;

    return {
        ok: true,
        value: {
            limit: limitResult.value as number,
            offset: offsetResult.value as number,
            cursor: null,
        },
    };
}

export function listMeta(params: {
    total: number;
    returned: number;
    limit: number;
    offset: number;
    extra?: Record<string, unknown>;
}) {
    const { total, returned, limit, offset, extra = {} } = params;
    const nextOffset = offset + returned;
    const nextCursor = nextOffset < total ? encodeCursor(nextOffset) : null;

    return {
        total,
        returned,
        limit,
        offset,
        next_cursor: nextCursor,
        ...extra,
    };
}
