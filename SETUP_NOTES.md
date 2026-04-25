# Setup Notes - Changes to Reverse Later

## .env - Supabase values cleared

The following Supabase placeholder values were cleared so the server uses local SQLite instead of trying to connect to Supabase.

**What was changed:**
```
# Before (original from .env.example)
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# After (cleared to force SQLite fallback)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```

**Why:** The code in `src/services/db/index.ts` checks if both `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set. If they are, it tries to connect to Supabase. The placeholder values triggered this path and caused a connection error. Clearing them makes the server fall back to local `mcp.sqlite`.

**To restore:** Set the three Supabase env vars back to your real Supabase project values (or the placeholders if you just want the original state).

## .env - MCP_ADMIN_TOKEN added

Added `MCP_ADMIN_TOKEN=mentra-dev-admin-2026` to bypass the Mentra OAuth webview flow (which fails locally due to SSL cert issues). This token is used as the Bearer token for MCP client connections.

**To restore:** Remove the `MCP_ADMIN_TOKEN` line from `.env`.

## memory-glasses/.mcp.json - MCP client config added

Added `.mcp.json` to the memory-glasses project to connect Claude Code to the local Mentra MCP server.

**To restore:** Delete `memory-glasses/.mcp.json` or run `claude mcp remove mentra-glasses -s project` from the memory-glasses directory.
