# Test Plan — Roommate Expense Splitter

## Objectives
*   Verify the correctness and robustness of the `RoommateExpenseSplitter` class business logic.
*   Ensure data integrity, persistence, and accurate settlement calculations under various scenarios.

## Scope
This test suite focuses on unit testing the `RoommateExpenseSplitter` class methods in `src/app.ts`. It covers adding roommates, adding expenses with various split configurations, calculating settlements, and managing historical settlements. UI interactions and `index.html` specific functionalities are out of scope for this unit test suite, as they will be covered by later integration and end-to-end tests.

## Test Types
*   **Unit Tests**: Detailed verification of individual methods within `RoommateExpenseSplitter`.
*   **Regression Tests**: These tests will run in CI to prevent regressions as the codebase evolves.
*   **Acceptance Tests**: Achieved through a User Acceptance Testing (UAT) gate, verifying the complete system against user stories.

## Risk Focus
1.  **Expense Splitting Logic**: Incorrect calculation or validation of split amounts could lead to financial discrepancies among roommates, a critical failure for the application's core purpose.
2.  **Settlement Calculation Accuracy**: Errors in determining who owes whom, or incorrect transaction aggregation, directly undermine the utility and trustworthiness of the application.
3.  **Data Persistence and Archiving**: Failures in saving/loading state or archiving historical data could lead to data loss or inconsistent financial records, severely impacting user trust and data integrity.

## Requirements Traceability Matrix

| Story | Test case(s) | Coverage |
|---|---|---|
| US-1: Add roommates to the system | `RoommateExpenseSplitter - addRoommate: should add a new roommate` <br> `RoommateExpenseSplitter - addRoommate: should not add a roommate with an empty name` <br> `RoommateExpenseSplitter - addRoommate: should not add a roommate with a name that already exists` | `addRoommate`, `getRoommates` |
| US-2: Record a new expense | `RoommateExpenseSplitter - addExpense: should add a new expense with even splits` <br> `RoommateExpenseSplitter - addExpense: should add a new expense with custom splits` <br> `RoommateExpenseSplitter - addExpense: should throw ValidationError for invalid expense amount` <br> `RoommateExpenseSplitter - addExpense: should throw ValidationError if total split amount does not match expense amount` | `addExpense`, `getExpenses` |
| US-3: View current settlement details | `RoommateExpenseSplitter - calculateSettlements: should correctly calculate settlements for simple expenses` <br> `RoommateExpenseSplitter - calculateSettlements: should correctly calculate settlements with multiple expenses and complex splits` | `calculateSettlements` |
| US-4: Start a new settlement period | `RoommateExpenseSplitter - startNewSettlementPeriod: should archive current expenses and settlements and clear current expenses` <br> `RoommateExpenseSplitter - startNewSettlementPeriod: should throw ValidationError if no expenses to archive` | `startNewSettlementPeriod`, `getHistoricalSettlements` |
| US-5: Edit or delete an expense | (Not directly covered by current `app.ts` methods) | (No direct coverage in `app.ts` for edit/delete) |
