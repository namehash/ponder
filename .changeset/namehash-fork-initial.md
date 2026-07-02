---
"@namehash/ponder": patch
---

Initial `@namehash/ponder` release: namehash fork of `ponder@0.16.6`. The published
package is aliased back to `ponder` by consumers (`"ponder": "npm:@namehash/ponder@<version>"`),
so the CLI bin name stays `ponder`. Fork delta relative to upstream `ponder@0.16.6`
(all changes are confined to `packages/core`; `@ponder/utils`/`@ponder/client` are
unmodified and pulled from upstream):

- Add `PONDER_STATEMENT_TIMEOUT` env var to configure the Postgres `statement_timeout`
  (in milliseconds) applied to the connection pools.
- Preserve user-defined database indexes during crash recovery instead of always
  dropping them: indexes are kept when the previous instance had completed initial
  sync (`is_ready === 1`) and the max block gap across chains is below
  `PONDER_RECREATE_INDEXES_MIN_BLOCK_GAP` (default `10000`). Also fixes a bug where
  indexes were not created on the first run.
