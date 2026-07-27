## What changed

<!-- One or two sentences. If this closes an issue, write "Closes #123". -->

## Sources

<!--
Required for any change to data/. One URL per claim you added or changed, so a
reviewer can check it without hunting. Skip this section for code-only changes.
-->

## Checks

- [ ] `./scripts/build.sh` finishes clean
- [ ] `python3 scripts/check_md_layer.py` passes
- [ ] `npm test` passes
- [ ] I didn't hand-edit anything in `dashboard/` except `template.html`

<!--
The three commands regenerate and re-verify the whole published surface. The
diff on a data change is large by design: one record edit fans out to the HTML,
the markdown mirrors, the JSON twins, the SQLite export and llms.txt. That's
expected. A diff that touches dashboard/ and *not* data/ or template.html is
the one to look at twice.
-->
