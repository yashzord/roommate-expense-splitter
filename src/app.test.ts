import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoommateExpenseSplitter, ValidationError, Roommate, Expense, Settlement } from './app';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('RoommateExpenseSplitter', () => {
  let app: RoommateExpenseSplitter;
  let alice: Roommate;
  let bob: Roommate;
  let carol: Roommate;

  beforeEach(() => {
    localStorage.clear();
    app = new RoommateExpenseSplitter();
    vi.spyOn(Date, 'now').mockReturnValue(1678886400000); // Consistent timestamp for IDs

    // Setup some default roommates for most tests
    alice = app.addRoommate('Alice');
    bob = app.addRoommate('Bob');
    carol = app.addRoommate('Carol');
  });

  // --- Roommate Management Tests ---
  it('should add a roommate successfully', () => {
    localStorage.clear(); // Clear for this specific test to ensure fresh start
    app = new RoommateExpenseSplitter();
    const roommate = app.addRoommate('David');
    expect(roommate).toEqual({ id: 'rm-1678886400000', name: 'David' });
    expect(app.getRoommates()).toHaveLength(1);
    expect(app.getRoommates()[0].name).toBe('David');
  });

  it('should not add a roommate with an empty name', () => {
    expect(() => app.addRoommate('')).toThrow(ValidationError);
    expect(() => app.addRoommate('   ')).toThrow(ValidationError);
    expect(app.getRoommates()).toHaveLength(3); // Alice, Bob, Carol still exist
  });

  it('should not add a roommate with a duplicate name', () => {
    expect(() => app.addRoommate('Alice')).toThrow(ValidationError);
    expect(app.getRoommates()).toHaveLength(3);
  });

  it('should persist and load roommates from localStorage', () => {
    app.addRoommate('David');
    const newApp = new RoommateExpenseSplitter(); // Load state from localStorage
    expect(newApp.getRoommates()).toHaveLength(4);
    expect(newApp.getRoommates().some(r => r.name === 'David')).toBe(true);
  });

  // --- Expense Management Tests ---
  it('should add an expense with explicit splits', () => {
    const expense = app.addExpense('Dinner', 100, alice.id, [
      { roommateId: alice.id, amount: 50 },
      { roommateId: bob.id, amount: 50 }
    ]);

    expect(expense.description).toBe('Dinner');
    expect(expense.amount).toBe(100);
    expect(expense.paidBy).toBe(alice.id);
    expect(expense.splits).toHaveLength(2);
    expect(app.getExpenses()).toHaveLength(1);
  });

  it('should add an expense with uneven splits that sum correctly', () => {
    const expense = app.addExpense('Utilities', 120, bob.id, [
      { roommateId: alice.id, amount: 40 },
      { roommateId: bob.id, amount: 60 },
      { roommateId: carol.id, amount: 20 }
    ]);
    expect(expense.amount).toBe(120);
    expect(expense.splits.reduce((sum, s) => sum + s.amount, 0)).toBe(120);
  });

  it('should throw ValidationError for invalid expense amount', () => {
    expect(() => app.addExpense('Invalid', 0, alice.id, [{ roommateId: alice.id, amount: 0 }]))
      .toThrow(ValidationError);
    expect(() => app.addExpense('Invalid', -10, alice.id, [{ roommateId: alice.id, amount: -10 }]))
      .toThrow(ValidationError);
  });

  it('should throw ValidationError if description is empty', () => {
    expect(() => app.addExpense('', 50, alice.id, [{ roommateId: alice.id, amount: 50 }]))
      .toThrow(ValidationError);
    expect(() => app.addExpense('   ', 50, alice.id, [{ roommateId: alice.id, amount: 50 }]))
      .toThrow(ValidationError);
  });

  it('should throw ValidationError if paidBy roommate is not found', () => {
    expect(() => app.addExpense('Test', 50, 'non-existent-id', [{ roommateId: alice.id, amount: 50 }]))
      .toThrow(ValidationError);
  });

  it('should throw ValidationError if splits are empty', () => {
    expect(() => app.addExpense('Test', 50, alice.id, [])).toThrow(ValidationError);
  });

  it('should throw ValidationError if total split amount does not match expense amount', () => {
    expect(() => app.addExpense('Mismatch', 100, alice.id, [
      { roommateId: alice.id, amount: 40 },
      { roommateId: bob.id, amount: 40 }
    ]))
      .toThrow(ValidationError);
    expect(() => app.addExpense('Mismatch', 100, alice.id, [
      { roommateId: alice.id, amount: 60 },
      { roommateId: bob.id, amount: 60 }
    ]))
      .toThrow(ValidationError);
  });

  it('should allow small floating point discrepancies (e.g., 0.01)', () => {
    // 100.00 vs 99.99 should pass
    app.addExpense('Close enough', 100, alice.id, [
      { roommateId: alice.id, amount: 49.99 },
      { roommateId: bob.id, amount: 50.00 },
      { roommateId: carol.id, amount: 0.01 }
    ]);
    expect(app.getExpenses()).toHaveLength(1);

    // 100.00 vs 99.98 should fail
    expect(() => app.addExpense('Too far', 100, alice.id, [
      { roommateId: alice.id, amount: 49.99 },
      { roommateId: bob.id, amount: 49.99 }
    ]))
      .toThrow(ValidationError);
  });

  it('should throw ValidationError if split amount is negative', () => {
    expect(() => app.addExpense('Negative Split', 100, alice.id, [
      { roommateId: alice.id, amount: 120 },
      { roommateId: bob.id, amount: -20 } // Invalid
    ]))
      .toThrow(ValidationError);
  });

  it('should throw ValidationError if a split roommate is not found', () => {
    expect(() => app.addExpense('Unknown Splitter', 50, alice.id, [
      { roommateId: alice.id, amount: 25 },
      { roommateId: 'non-existent-id', amount: 25 }
    ]))
      .toThrow(ValidationError);
  });

  it('should persist and load expenses from localStorage', () => {
    app.addExpense('Movie', 30, bob.id, [{ roommateId: alice.id, amount: 15 }, { roommateId: bob.id, amount: 15 }]);
    const newApp = new RoommateExpenseSplitter();
    expect(newApp.getExpenses()).toHaveLength(1);
    expect(newApp.getExpenses()[0].description).toBe('Movie');
  });

  // --- Settlement Calculation Tests ---
  it('should calculate settlements correctly for a simple case (Bob owes Alice)', () => {
    app.addExpense('Groceries', 100, alice.id, [
      { roommateId: alice.id, amount: 0 },
      { roommateId: bob.id, amount: 100 }
    ]);

    const settlements = app.calculateSettlements();
    expect(settlements).toHaveLength(1);
    expect(settlements[0].debtor).toBe(bob.id);
    expect(settlements[0].creditor).toBe(alice.id);
    expect(settlements[0].amount).toBe(100);
    expect(settlements[0].transactions).toHaveLength(1);
    expect(settlements[0].transactions[0].description).toBe('Groceries');
  });

  it('should calculate settlements with multiple expenses and multiple roommates', () => {
    // Alice paid 100 for Bob (Bob owes Alice 100)
    app.addExpense('Dinner', 100, alice.id, [{ roommateId: bob.id, amount: 100 }]);
    // Bob paid 50 for Carol (Carol owes Bob 50)
    app.addExpense('Coffee', 50, bob.id, [{ roommateId: carol.id, amount: 50 }]);
    // Carol paid 20 for Alice (Alice owes Carol 20)
    app.addExpense('Snacks', 20, carol.id, [{ roommateId: alice.id, amount: 20 }]);

    // Balances:
    // Alice: +100 (from Dinner) -20 (for Snacks) = +80
    // Bob:   -100 (for Dinner) +50 (from Coffee) = -50
    // Carol: -50 (for Coffee) +20 (from Snacks) = -30

    const settlements = app.calculateSettlements();
    expect(settlements).toHaveLength(2); // Bob owes Alice, Carol owes Alice

    const bobToAlice = settlements.find(s => s.debtor === bob.id && s.creditor === alice.id);
    const carolToAlice = settlements.find(s => s.debtor === carol.id && s.creditor === alice.id);

    // Simplified settlement: Bob pays Alice 50, Carol pays Alice 30
    expect(bobToAlice?.amount).toBeCloseTo(50);
    expect(carolToAlice?.amount).toBeCloseTo(30);

    // Check transactions for Bob to Alice
    expect(bobToAlice?.transactions.some(t => t.description === 'Dinner')).toBe(true);
    expect(bobToAlice?.transactions.some(t => t.description === 'Snacks')).toBe(false); // Alice owes Carol for snacks, not Bob
  });

  it('should calculate settlements for even splits', () => {
    // Alice pays 90 for all three evenly (30 each)
    app.addExpense('Rent', 90, alice.id, [
      { roommateId: alice.id, amount: 30 },
      { roommateId: bob.id, amount: 30 },
      { roommateId: carol.id, amount: 30 }
    ]);

    // Balances:
    // Alice: +90 (paid) -30 (owed herself) = +60
    // Bob:   -30
    // Carol: -30

    const settlements = app.calculateSettlements();
    expect(settlements).toHaveLength(2);

    const bobToAlice = settlements.find(s => s.debtor === bob.id && s.creditor === alice.id);
    const carolToAlice = settlements.find(s => s.debtor === carol.id && s.creditor === alice.id);

    expect(bobToAlice?.amount).toBeCloseTo(30);
    expect(carolToAlice?.amount).toBeCloseTo(30);
  });

  it('should handle zero settlements when balances are already even', () => {
    // Alice pays 30 for herself
    app.addExpense('Personal Item', 30, alice.id, [{ roommateId: alice.id, amount: 30 }]);
    const settlements = app.calculateSettlements();
    expect(settlements).toHaveLength(0);
  });

  it('should handle complex settlement scenarios with multiple creditors and debtors', () => {
    // Alice paid 100 for Bob (Bob owes Alice 100)
    app.addExpense('Exp1', 100, alice.id, [{ roommateId: bob.id, amount: 100 }]);
    // Bob paid 150 for Carol (Carol owes Bob 150)
    app.addExpense('Exp2', 150, bob.id, [{ roommateId: carol.id, amount: 150 }]);
    // Carol paid 200 for Alice (Alice owes Carol 200)
    app.addExpense('Exp3', 200, carol.id, [{ roommateId: alice.id, amount: 200 }]);

    // Balances:
    // Alice: +100 (from Exp1) -200 (for Exp3) = -100
    // Bob:   -100 (for Exp1) +150 (from Exp2) = +50
    // Carol: -150 (for Exp2) +200 (from Exp3) = +50

    // Expected settlements: Alice owes Bob 50, Alice owes Carol 50
    const settlements = app.calculateSettlements();
    expect(settlements).toHaveLength(2);

    const aliceToBob = settlements.find(s => s.debtor === alice.id && s.creditor === bob.id);
    const aliceToCarol = settlements.find(s => s.debtor === alice.id && s.creditor === carol.id);

    expect(aliceToBob?.amount).toBeCloseTo(50);
    expect(aliceToCarol?.amount).toBeCloseTo(50);
  });

  // --- Historical Settlement Tests ---
  it('should start a new settlement period and archive data', () => {
    app.addExpense('Rent', 1000, alice.id, [
      { roommateId: alice.id, amount: 500 },
      { roommateId: bob.id, amount: 500 }
    ]);

    const archived = app.startNewSettlementPeriod();

    expect(app.getExpenses()).toHaveLength(0); // Current expenses cleared
    expect(app.getHistoricalSettlements()).toHaveLength(1);
    expect(archived.expenses).toHaveLength(1);
    expect(archived.settlements).toHaveLength(1);
    expect(archived.settlements[0].amount).toBe(500);
    expect(archived.timestamp).toBe(1678886400000);
  });

  it('should throw ValidationError if no expenses to archive for a new settlement period', () => {
    expect(() => app.startNewSettlementPeriod()).toThrow(ValidationError);
    expect(app.getHistoricalSettlements()).toHaveLength(0);
  });

  it('should persist and load historical settlements from localStorage', () => {
    app.addExpense('Dinner', 100, alice.id, [{ roommateId: bob.id, amount: 100 }]);
    app.startNewSettlementPeriod();

    const newApp = new RoommateExpenseSplitter();
    expect(newApp.getHistoricalSettlements()).toHaveLength(1);
    expect(newApp.getHistoricalSettlements()[0].expenses[0].description).toBe('Dinner');
  });

  // --- Clear All Data Tests ---
  it('should clear all data', () => {
    app.addRoommate('David');
    app.addExpense('Test', 10, alice.id, [{ roommateId: alice.id, amount: 10 }]);
    app.startNewSettlementPeriod();

    app.clearAllData();

    expect(app.getRoommates()).toHaveLength(0);
    expect(app.getExpenses()).toHaveLength(0);
    expect(app.getHistoricalSettlements()).toHaveLength(0);
    expect(localStorage.getItem('roommates')).toBeNull();
    expect(localStorage.getItem('expenses')).toBeNull();
    expect(localStorage.getItem('historicalSettlements')).toBeNull();
  });

  // --- Edge Cases and General Behavior ---
  it('should return empty arrays if no data exists', () => {
    localStorage.clear();
    app = new RoommateExpenseSplitter();
    expect(app.getRoommates()).toHaveLength(0);
    expect(app.getExpenses()).toHaveLength(0);
    expect(app.getHistoricalSettlements()).toHaveLength(0);
    expect(app.calculateSettlements()).toHaveLength(0);
  });

  it('should handle multiple settlement periods correctly', () => {
    // Period 1
    app.addExpense('Exp1', 60, alice.id, [{ roommateId: bob.id, amount: 60 }]);
    app.startNewSettlementPeriod();

    // Period 2
    app.addExpense('Exp2', 90, bob.id, [{ roommateId: carol.id, amount: 90 }]);
    app.startNewSettlementPeriod();

    expect(app.getHistoricalSettlements()).toHaveLength(2);
    expect(app.getHistoricalSettlements()[0].settlements[0].amount).toBeCloseTo(60);
    expect(app.getHistoricalSettlements()[1].settlements[0].amount).toBeCloseTo(90);
    expect(app.getExpenses()).toHaveLength(0);
  });
});
