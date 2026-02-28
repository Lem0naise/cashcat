# CashCat MCP (HTTP)

This repository includes a built-in HTTP MCP endpoint at:

- `https://<your-domain>/api/mcp`

When deployed on Vercel, it is available automatically after push/deploy.

## Authentication

Use your CashCat API key in the `Authorization` header:

- `Authorization: Bearer cc_live_...`

The MCP route validates API keys using the same auth flow as `/api/v1/*`.

## Supported MCP Methods

- `initialize`
- `ping`
- `tools/list`
- `tools/call`

## Available Tools

- `cashcat_get`
  - Generic read-only access to GET endpoints:
    - `accounts`
    - `assignments`
    - `categories`
    - `categories/budget-left`
    - `groups`
    - `transactions`
    - `transfers`
  - Supports pass-through query params and optional auto-pagination.

- `cashcat_financial_overview`
  - Advisory-focused summary for a month/as-of date.
  - Includes net worth, budget totals, overspending highlights, cashflow, and recent activity.

- `cashcat_full_context`
  - Pulls a broad multi-endpoint context bundle (accounts/categories/groups/assignments/transactions/transfers/budget-left).
  - Intended for AI agents that need deep, structured context before giving advice.

## Example: `initialize`

```bash
curl -sS https://<your-domain>/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {}
  }'
```

## Example: `tools/list`

```bash
curl -sS https://<your-domain>/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

## Example: `cashcat_financial_overview`

```bash
curl -sS https://<your-domain>/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer cc_live_..." \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "cashcat_financial_overview",
      "arguments": {
        "month": "2026-02",
        "recent_items_limit": 20
      }
    }
  }'
```

## Example: `cashcat_full_context`

```bash
curl -sS https://<your-domain>/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer cc_live_..." \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "cashcat_full_context",
      "arguments": {
        "month": "2026-02",
        "max_rows_per_endpoint": 3000
      }
    }
  }'
```

## Operational Notes

- This MCP endpoint is read-focused by design.
- For very large datasets, use `max_rows`/`max_rows_per_endpoint` to control payload size.
- Rotate API keys if exposed in logs, screenshots, or shared conversations.
