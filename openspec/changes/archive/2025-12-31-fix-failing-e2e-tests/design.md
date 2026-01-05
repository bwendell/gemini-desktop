# Test Reliability Design

## Problem

Multiple E2E test groups fail consistently or flakily, likely due to:

- Incorrect selectors (UI changed but test didn't)
- Environment issues (packaging/running context)
- Test logic flaws (e.g., incorrect assumptions about window state)
- Assume all tests timing out are due to incorrect selectors until proven otherwise

## Proposed Solution

- **Pattern Standardization:** Ensure all tests follow `docs/E2E_TESTING_GUIDELINES.md`.
- **Robustness:** Use `waitFor*` lookups instead of static sleeps where possible, but use timeouts appropriate for Electron operations.
- **Isolation:** Ensure tests clean up after themselves (windows, settings) to avoid pollution.

## Trade-offs

- **Speed vs. Reliability:** Some tests might become slower to ensure reliability (e.g., increasing timeouts). This is acceptable as reliability is the priority.
