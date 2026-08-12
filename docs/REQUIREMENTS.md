# Software Requirement Specification — Roommate Expense Splitter

## Introduction
The Roommate Expense Splitter is a client-side web application designed to help roommates track shared expenses and determine who owes whom. Its purpose is to simplify financial settlements among cohabitants by providing a clear, itemized breakdown of contributions and debts.

## Functional Requirements
*   **FR-1: Expense Entry:** Users shall be able to input a new expense including a description (text), amount (numeric), and who paid (selected from a list of roommates). *Rationale: Core function for tracking spending.*
*   **FR-2: Roommate Management:** Users shall be able to add, edit, and remove roommate names. *Rationale: Allows customization for different living situations.*
*   **FR-3: Expense Assignment:** For each expense, users shall be able to specify which roommates are involved and how the expense is split (e.g., equally, custom percentages, or custom amounts). *Rationale: Accommodates various sharing scenarios.*
*   **FR-4: Settlement Calculation:** The application shall calculate and display a summary of who owes whom, showing the net balance for each roommate. *Rationale: Provides the primary value proposition of the app.*
*   **FR-5: Data Persistence:** All entered expenses, roommate names, and settlement data shall be automatically saved to and loaded from the user's local storage. *Rationale: Ensures data is not lost between sessions.*
*   **FR-6: Expense Editing/Deletion:** Users shall be able to edit or delete existing expense entries. *Rationale: Allows correction of mistakes or removal of irrelevant data.*

## Non-Functional Requirements
*   **NFR-1: Performance:** The application shall render initial UI and load data from local storage within 500ms on a modern browser. *Quantified: Loading time.*
*   **NFR-2: Responsiveness:** The UI shall be fully functional and aesthetically pleasing on screen widths from 320px to 1920px. *Quantified: Screen width range.*
*   **NFR-3: Usability:** New users shall be able to add their first expense and see a settlement calculation within 2 minutes of first use without external instructions. *Quantified: Time to first use.*
*   **NFR-4: Data Integrity:** Data stored in localStorage shall be robust against browser tab closures and system restarts. *Quantified: Data persistence reliability.*

## Constraints
*   The application must be a fully client-side web application, built with Vite, using only `index.html`, `src/app.ts`, and `src/main.ts`.
*   No external packages, frameworks, or network calls are permitted.
*   Data persistence is limited to `localStorage` only.

## Out of Scope
*   User authentication or multi-user accounts.
*   Integration with payment systems or financial institutions.
*   Real-time synchronization across multiple devices.

## Open Questions
1.  How should expenses be split by default when a new expense is added (e.g., equally among all roommates, or requiring explicit selection)?
2.  What level of detail is required for the settlement display? Should it show individual transactions that make up a debt, or just the net amount owed?
3.  Should there be a 
