# Stakeholder Clarifications

**Q: How should expenses be split by default when a new expense is added (e.g., equally among all roommates, or requiring explicit selection)?**
A: requires explicit selection

**Q: What level of detail is required for the settlement display? Should it show individual transactions that make up a debt, or just the net amount owed?**
A: show individual transactions that make up a debt

**Q: Should there be a "clear all data" or "start new settlement period" functionality, and if so, how should historical data be handled?**
A: (stakeholder deferred — use your best judgment)

## Clarified Decisions:

*   **Expense Splitting Default:** New expenses will *not* default to equal splitting. Users must explicitly select how each expense is divided among roommates. This impacts the initial UI/UX design for adding expenses, requiring clear selection mechanisms rather than a simple "add" button.
*   **Settlement Detail:** The settlement display will show individual transactions contributing to a debt, not just net amounts. This increases the complexity of the settlement display and underlying data model, prioritizing transparency and auditability over a simpler, high-level view.
*   **Data Reset/New Period:** (Deferred - Best Judgment) A "start new settlement period" functionality will be included, archiving historical data rather than deleting it. This adds a requirement for data archiving and retrieval mechanisms, impacting data storage and potential reporting features, but ensures users can review past settlements.
