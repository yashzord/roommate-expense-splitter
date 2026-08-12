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

  beforeEach(() => {
    localStorage.clear();
    app = new RoommateExpenseSplitter();
    vi.spyOn(Date, 'now').mockReturnValue(1678886400000); // Consistent timestamp for IDs
  });

  it('should add a roommate successfully', () => {
    const roommate = app.addRoommate('Alice');
    expect(roommate).toEqual({ id: 'rm-1678886400000', name: 'Alice' });
    expect(app.getRoommates()).toHaveLength(1);
    expect(app.getRoommates()[0].name).toBe('Alice');
  });

  it('should add an expense with explicit splits', () => {
    const alice = app.addRoommate('Alice');
    const bob = app.addRoommate('Bob');

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

  it('should calculate settlements correctly for a simple case', () => {
    const alice = app.addRoommate('Alice');
    const bob = app.addRoommate('Bob');

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

  it('should start a new settlement period and archive data', () => {
    const alice = app.addRoommate('Alice');
    const bob = app.addRoommate('Bob');
    app.addExpense('Rent', 1000, alice.id, [
      { roommateId: alice.id, amount: 500 },
      { roommateId: bob.id, amount: 500 }
    ]);

    const archived = app.startNewSettlementPeriod();

    expect(app.getExpenses()).toHaveLength(0);
    expect(app.getHistoricalSettlements()).toHaveLength(1);
    expect(archived.expenses).toHaveLength(1);
    expect(archived.settlements).toHaveLength(1);
    expect(archived.settlements[0].amount).toBe(500);
  });

  it('should throw ValidationError for invalid expense amount', () => {
    const alice = app.addRoommate('Alice');
    expect(() => app.addExpense('Invalid', 0, alice.id, [{ roommateId: alice.id, amount: 0 }]))
      .toThrow(ValidationError);
    expect(() => app.addExpense('Invalid', -10, alice.id, [{ roommateId: alice.id, amount: -10 }]))
      .toThrow(ValidationError);
  });
});
