---
"ponder": patch
---

Fixed a bug with `p.bytes()` bytea encoding when flushing rows to Postgres with COPY that caused `DelayedInsertError: invalid byte sequence for encoding "UTF8": 0x00`.
