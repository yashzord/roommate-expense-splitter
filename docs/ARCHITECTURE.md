# Architecture — Roommate Expense Splitter

# Design Document: Roommate Expense Splitter

## High-Level Design (HLD)

### System Overview
The Roommate Expense Splitter is a client-side web application designed for managing and settling shared expenses. It follows a strict separation of concerns, with `index.html` providing the UI structure and styling, `src/main.ts` handling DOM manipulation and event wiring, and `src/app.ts` encapsulating all core business logic and data management.

```
index.html
    ├── <style> (CSS)
    ├── <script type="module" src="./src/main.ts"></script>
    │           └── imports src/app.ts
    │                   └── (core logic, data structures, localStorage interaction)
```

### Component Responsibilities
*   **`index.html`**: Defines the application's visual structure, basic styling, and loads the main TypeScript entry point.
*   **`src/main.ts`**: Manages all interactions with the Document Object Model (DOM), handling user input, updating the UI, and orchestrating calls to the core logic.
*   **`src/app.ts`**: Contains all application business logic, data models, validation, and direct interaction with `localStorage` for persistence.

### Data Design

**In-Memory & `localStorage`:**

```typescript
// localStorage key for all application data
const LOCAL_STORAGE_KEY = "roommateExpenseSplitterData";

interface AppData {
    roommates: Roommate[];
    expenses: Expense[];
    settlementPeriods: SettlementPeriod[]; // Archived periods
    currentSettlement: CurrentSettlement;
}

interface Roommate {
    id: string; // UUID
    name: string;
}

interface Expense {
    id: string; // UUID
    payerId: string; // Roommate ID
    description: string;
    amount: number; // Total amount
    splits: ExpenseSplit[]; // How the expense is divided
    date: string; // ISO 8601 date string
}

interface ExpenseSplit {
    roommateId: string; // Roommate ID
    amount: number; // Amount owed by this roommate for this expense
}

interface CurrentSettlement {
    transactions: SettlementTransaction[]; // Detailed transactions for the current period
}

interface SettlementTransaction {
    fromRoommateId: string;
    toRoommateId: string;
    amount: number;
    expenseIds: string[]; // IDs of expenses contributing to this transaction
}

interface SettlementPeriod {
    id: string; // UUID for the period
    startDate: string; // ISO 8601 date string
    endDate: string; // ISO 8601 date string
    summary: SettlementTransaction[]; // Final state of transactions for this period
    expenses: Expense[]; // All expenses from this period
}
```

## Low-Level Design (LLD)

### Logic Core Specification (`src/app.ts`)

*   **`Roommate`**: type for a roommate.
*   **`Expense`**: type for an expense.
*   **`ExpenseSplit`**: type for how an expense is split.
*   **`SettlementTransaction`**: type for a transaction in a settlement.
*   **`SettlementPeriod`**: type for an archived settlement period.
*   **`AppData`**: type for the entire application state.
*   **`AppError`**: base class for typed application errors.
*   **`ValidationError`**: extends `AppError`, for input validation failures.
*   **`NotFoundError`**: extends `AppError`, for missing entities.
*   **`getAppData(): AppData`**: Retrieves the current application state from `localStorage` or initializes it.
*   **`saveAppData(data: AppData): void`**: Persists the given application state to `localStorage`.
*   **`addRoommate(name: string): Roommate`**: Adds a new roommate, validates input, and returns the new roommate.
*   **`getRoommates(): Roommate[]`**: Returns all registered roommates.
*   **`addExpense(payerId: string, description: string, amount: number, splits: ExpenseSplit[]): Expense`**: Records a new expense, validates input, and returns the new expense.
*   **`editExpense(expenseId: string, payerId: string, description: string, amount: number, splits: ExpenseSplit[]): Expense`**: Updates an existing expense, validates input, and returns the updated expense.
*   **`deleteExpense(expenseId: string): void`**: Removes an expense.
*   **`calculateCurrentSettlement(): CurrentSettlement`**: Computes and returns the detailed current settlement based on all active expenses.
*   **`startNewSettlementPeriod(): SettlementPeriod`**: Archives the current expenses and settlement, resets for a new period, and returns the archived period.

### UI Wireframe

```
+-------------------------------------------------------------------+
| Roommate Expense Splitter                                         |
+-------------------------------------------------------------------+
| [Add Roommate]                                                    |
|                                                                   |
| Roommates:                                                        |
| [Roommate 1 Name] [Edit] [Delete]                                 |
| [Roommate 2 Name] [Edit] [Delete]                                 |
|                                                                   |
+-------------------------------------------------------------------+
| Add New Expense:                                                  |
| Payer: [Dropdown: Roommates]                                      |
| Description: [Text Input]                                         |
| Amount: [Number Input]                                            |
|                                                                   |
| Split:                                                            |
| [ ] Roommate 1: [Number Input]                                    |
| [ ] Roommate 2: [Number Input]                                    |
|      (Remaining: $X.XX)                                           |
| [Record Expense]                                                  |
+-------------------------------------------------------------------+
| Current Expenses:                                                 |
| [Date] [Payer] [Description] [Amount] [Details] [Edit] [Delete]   |
| ...                                                               |
+-------------------------------------------------------------------+
| Settlement Details:                                               |
| Roommate A owes Roommate B $XX.XX (from Expense Y, Expense Z)     |
| Roommate C owes Roommate A $YY.YY (from Expense P)                |
| ...                                                               |
| [Start New Settlement Period]                                     |
+-------------------------------------------------------------------+
```

### Interaction Flow

1.  **User adds Roommate**: Clicks "Add Roommate" -> Enters name -> Clicks "Save".
2.  **User records Expense**: Selects Payer, enters Description, Amount -> Explicitly enters split amounts for each roommate -> Clicks "Record Expense".
3.  **System updates Settlement**: After any expense change, `calculateCurrentSettlement` is called, and the "Settlement Details" section is re-rendered with individual transactions and contributing expenses.
4.  **User starts new period**: Clicks "Start New Settlement Period" -> System archives current data, clears active expenses, and resets settlement display.

### Key Risks

1.  **Data Integrity on Split Entry**: Users might enter split amounts that don't sum to the total expense amount.
    *   **Mitigation**: Implement real-time validation in the UI (`src/main.ts`) and server-side validation in `addExpense`/`editExpense` (`src/app.ts`) to ensure splits always sum correctly, providing immediate feedback.
2.  **Complex Settlement Display**: Showing individual transactions and their contributing expenses can be overwhelming.
    *   **Mitigation**: Design the UI with clear visual grouping (e.g., collapsible sections, distinct formatting) and potentially a summary view that can be expanded for details.
3.  **`localStorage` Limits**: Storing all historical settlement periods and expenses in `localStorage` could eventually hit storage limits, especially with many users/transactions.
    *   **Mitigation**: Monitor `localStorage` usage. If it becomes an issue, implement a warning system or consider a future enhancement for exporting/importing data to offload older periods.
