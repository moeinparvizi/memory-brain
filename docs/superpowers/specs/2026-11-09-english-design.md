# English language support

Approved by the user: retain Persian and add English, with a language selector on Settings and Login. Remember the choice on this browser. English uses LTR; Persian uses RTL. Translate interface text, validation, dates, numbers, and generated reports. Never translate or rewrite user-entered content. Keep existing currency units and Saturday-based week semantics. Create an English README with accurate setup and test commands, then commit and push the completed changes, including the previously verified fixes.

## Approach
Use a small typed translation catalog and Angular service within the existing stack. Explicit template translations distinguish interface strings from stored user content. Runtime switching avoids separate builds and reloads; no new runtime dependency is needed. Separate builds would complicate deployment; DOM text replacement would risk altering user content.
