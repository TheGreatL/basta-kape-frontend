# Project Guidelines & Agent Rules

## React Query Keys Standard

- **Always use `QUERY_KEY` constants**: Always reference query keys from `src/constants/query-keys.ts` (e.g. `QUERY_KEY.INVENTORY.DASHBOARD_OVERVIEW`).
- **Never use hardcoded string literals**: Never write raw string quotes for `queryKey` (e.g. `queryKey: ['custom:key']`).
- **Add new keys to `QUERY_KEY`**: If a component or query requires a new query key, define it inside the appropriate module namespace in `src/constants/query-keys.ts` first before referencing it.
