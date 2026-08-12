import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RoommateExpenseSplitter, ValidationError, type Roommate, type Expense, type Settlement, type HistoricalSettlement } from './app';

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
  let splitter: RoommateExpenseSplitter;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    splitter = new RoommateExpenseSplitter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // US-1: Add roommates to the system
  it('addRoommate: should add a new roommate', () => {
    const roommate = splitter.addRoommate('Alice');
    expect(roommate.name).toBe('Alice');
    expect(roommate.id).toMatch(/^rm-\d+$/);
    expect(splitter.getRoommates()).toHaveLength(1);
    expect(splitter.getRoommates()[0]).toEqual(roommate);
  });

  it('addRoommate: should not add a roommate with an empty name', () => {
    expect(() => splitter.addRoommate('')).toThrow(ValidationError);
    expect(() => splitter.addRoommate('   ')).toThrow(ValidationError);
    expect(splitter.getRoommates()).toHaveLength(0);
  });

  it('addRoommate: should not add a roommate with a name that already exists', () => {
    splitter.addRoommate('Alice');
    expect(() => splitter.addRoommate('Alice')).toThrow(ValidationError);
    expect(splitter.getRoommates()).toHaveLength(1);
  });

  // US-2: Record a new expense
  it('addExpense: should add a new expense with even splits', () => {
    const alice = splitter.addRoommate('Alice');
    const bob = splitter.addRoommate('Bob');
    const charlie = splitter.addRoommate('Charlie');

    const expense = splitter.addExpense('Groceries', 300, alice.id, [
      { roommateId: alice.id, amount: 100 },
      { roommateId: bob.id, amount: 100 },
      { roommateId: charlie.id, amount: 100 }
    ]);

    expect(expense.description).toBe('Groceries');
    expect(expense.amount).toBe(300);
    expect(expense.paidBy).toBe(alice.id);
    expect(expense.splits).toHaveLength(3);
    expect(splitter.getExpenses()).toHaveLength(1);
  });

  it('addExpense: should add a new expense with custom splits', () => {
    const alice = splitter.addRoommate('Alice');
    const bob = splitter.addRoommate('Bob');

    const expense = splitter.addExpense('Dinner', 100, alice.id, [
      { roommateId: alice.id, amount: 70 },
      { roommateId: bob.id, amount: 30 }
    ]);

    expect(expense.description).toBe('Dinner');
    expect(expense.amount).toBe(100);
    expect(expense.paidBy).toBe(alice.id);
    expect(expense.splits).toEqual([
      { roommateId: alice.id, amount: 70 },
      { roommateId: bob.id, amount: 30 }
    ]);
  });

  it('addExpense: should throw ValidationError for invalid expense amount', () => {
    const alice = splitter.addRoommate('Alice');
    expect(() => splitter.addExpense('Rent', 0, alice.id, [{ roommateId: alice.id, amount: 0 }])).toThrow(ValidationError);
    expect(() => splitter.addExpense('Rent', -50, alice.id, [{ roommateId: alice.id, amount: -50 }])).toThrow(ValidationError);
  });

  it('addExpense: should throw ValidationError if total split amount does not match expense amount', () => {
    const alice = splitter.addRoommate('Alice');
    const bob = splitter.addRoommate('Bob');
    expect(() => splitter.addExpense('Utilities', 100, alice.id, [
      { roommateId: alice.id, amount: 50 },
      { roommateId: bob.id, amount: 40 }
    ])).toThrow(ValidationError);
  });

  // US-3: View current settlement details
  it('calculateSettlements: should correctly calculate settlements for simple expenses', () => {
    const alice = splitter.addRoommate('Alice');
    const bob = splitter.addRoommate('Bob');

    splitter.addExpense('Dinner', 100, alice.id, [
      { roommateId: alice.id, amount: 50 },
      { roommateId: bob.id, amount: 50 }
    ]);

    splitter.addExpense('Groceries', 50, bob.id, [
      { roommateId: alice.id, amount: 25 },
      { roommateId: bob.id, amount: 25 }
    ]);

    const settlements = splitter.calculateSettlements();
    // Alice paid 100, owes 50 + 25 = 75. Net: +25
    // Bob paid 50, owes 50 + 25 = 75. Net: -25
    expect(settlements).toHaveLength(1);
    expect(settlements[0].debtor).toBe(bob.id);
    expect(settlements[0].creditor).toBe(alice.id);
    expect(settlements[0].amount).toBeCloseTo(25);
  });

  it('calculateSettlements: should correctly calculate settlements with multiple expenses and complex splits', () => {
    const alice = splitter.addRoommate('Alice');
    const bob = splitter.addRoommate('Bob');
    const charlie = splitter.addRoommate('Charlie');

    // Alice pays 120 for dinner, split evenly
    splitter.addExpense('Dinner', 120, alice.id, [
      { roommateId: alice.id, amount: 40 },
      { roommateId: bob.id, amount: 40 },
      { roommateId: charlie.id, amount: 40 }
    ]);

    // Bob pays 60 for groceries, split Alice:20, Bob:20, Charlie:20
    splitter.addExpense('Groceries', 60, bob.id, [
      { roommateId: alice.id, amount: 20 },
      { roommateId: bob.id, amount: 20 },
      { roommateId: charlie.id, amount: 20 }
    ]);

    // Charlie pays 30 for snacks, split Alice:10, Bob:10, Charlie:10
    splitter.addExpense('Snacks', 30, charlie.id, [
      { roommateId: alice.id, amount: 10 },
      { roommateId: bob.id, amount: 10 },
      { roommateId: charlie.id, amount: 10 }
    ]);

    // Balances:
    // Alice: Paid 120, Owes 40 (Dinner) + 20 (Groceries) + 10 (Snacks) = 70. Net: +50
    // Bob: Paid 60, Owes 40 (Dinner) + 20 (Groceries) + 10 (Snacks) = 70. Net: -10
    // Charlie: Paid 30, Owes 40 (Dinner) + 20 (Groceries) + 10 (Snacks) = 70. Net: -40

    const settlements = splitter.calculateSettlements();
    expect(settlements).toHaveLength(2); // Bob to Alice, Charlie to Alice

    const bobToAlice = settlements.find(s => s.debtor === bob.id && s.creditor === alice.id);
    const charlieToAlice = settlements.find(s => s.debtor === charlie.id && s.creditor === alice.id);

    expect(bobToAlice?.amount).toBeCloseTo(10);
    expect(charlieToAlice?.amount).toBeCloseTo(40);
  });

  // US-4: Start a new settlement period
  it('startNewSettlementPeriod: should archive current expenses and settlements and clear current expenses', () => {
    const alice = splitter.addRoommate('Alice');
    const bob = splitter.addRoommate('Bob');

    splitter.addExpense('Dinner', 100, alice.id, [
      { roommateId: alice.id, amount: 50 },
      { roommateId: bob.id, amount: 50 }
    ]);

    const settlementsBeforeArchive = splitter.calculateSettlements();
    const expensesBeforeArchive = splitter.getExpenses();

    const mockTimestamp = Date.now();
    vi.setSystemTime(mockTimestamp);

    const historical = splitter.startNewSettlementPeriod();

    expect(historical.timestamp).toBe(mockTimestamp);
    expect(historical.settlements).toEqual(settlementsBeforeArchive);
    expect(historical.expenses).toEqual(expensesBeforeArchive);
    expect(splitter.getExpenses()).toHaveLength(0);
    expect(splitter.getHistoricalSettlements()).toHaveLength(1);
    expect(splitter.getHistoricalSettlements()[0]).toEqual(historical);
  });

  it('startNewSettlementPeriod: should throw ValidationError if no expenses to archive', () => {
    expect(splitter.getExpenses()).toHaveLength(0);
    expect(() => splitter.startNewSettlementPeriod()).toThrow(ValidationError);
  });

  it('clearAllData: should clear all roommates, expenses, and historical settlements', () => {
    splitter.addRoommate('Alice');
    splitter.addExpense('Test', 10, splitter.getRoommates()[0].id, [{ roommateId: splitter.getRoommates()[0].id, amount: 10 }]);
    splitter.startNewSettlementPeriod();

    expect(splitter.getRoommates()).toHaveLength(1);
    expect(splitter.getHistoricalSettlements()).toHaveLength(1);

    splitter.clearAllData();

    expect(splitter.getRoommates()).toHaveLength(0);
    expect(splitter.getExpenses()).toHaveLength(0);
    expect(splitter.getHistoricalSettlements()).toHaveLength(0);
    expect(localStorage.getItem('roommates')).toBeNull();
    expect(localStorage.getItem('expenses')).toBeNull();
    expect(localStorage.getItem('historicalSettlements')).toBeNull();
  });
});