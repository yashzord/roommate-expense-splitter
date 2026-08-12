export type Roommate = { id: string; name: string; };
export type Expense = { id: string; description: string; amount: number; paidBy: string; splits: { roommateId: string; amount: number; }[]; };
export type Settlement = { debtor: string; creditor: string; amount: number; transactions: Expense[]; };
export type HistoricalSettlement = { timestamp: number; settlements: Settlement[]; expenses: Expense[]; };

export class ValidationError extends Error { constructor(message: string) { super(message); this.name = 'ValidationError'; } }

export class RoommateExpenseSplitter {
  private roommates: Roommate[] = [];
  private expenses: Expense[] = [];
  private historicalSettlements: HistoricalSettlement[] = [];
  // Timestamps alone collide when entities are created within the same
  // millisecond — a monotonic counter keeps every id unique.
  private idCounter = 0;

  private nextId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${(++this.idCounter).toString(36)}`;
  }

  constructor() {
    this.loadState();
  }

  private saveState() {
    localStorage.setItem('roommates', JSON.stringify(this.roommates));
    localStorage.setItem('expenses', JSON.stringify(this.expenses));
    localStorage.setItem('historicalSettlements', JSON.stringify(this.historicalSettlements));
  }

  private loadState() {
    const storedRoommates = localStorage.getItem('roommates');
    const storedExpenses = localStorage.getItem('expenses');
    const storedHistoricalSettlements = localStorage.getItem('historicalSettlements');
    if (storedRoommates) this.roommates = JSON.parse(storedRoommates);
    if (storedExpenses) this.expenses = JSON.parse(storedExpenses);
    if (storedHistoricalSettlements) this.historicalSettlements = JSON.parse(storedHistoricalSettlements);
  }

  getRoommates(): Roommate[] { return [...this.roommates]; }
  getExpenses(): Expense[] { return [...this.expenses]; }
  getHistoricalSettlements(): HistoricalSettlement[] { return [...this.historicalSettlements]; }

  addRoommate(name: string): Roommate {
    if (!name || name.trim() === '') throw new ValidationError('Roommate name cannot be empty.');
    if (this.roommates.some(r => r.name === name)) throw new ValidationError('Roommate with this name already exists.');
    const newRoommate: Roommate = { id: this.nextId('rm'), name: name.trim() };
    this.roommates.push(newRoommate);
    this.saveState();
    return newRoommate;
  }

  addExpense(description: string, amount: number, paidBy: string, splits: { roommateId: string; amount: number; }[]): Expense {
    if (!description || description.trim() === '') throw new ValidationError('Expense description cannot be empty.');
    if (amount <= 0) throw new ValidationError('Expense amount must be positive.');
    if (!this.roommates.some(r => r.id === paidBy)) throw new ValidationError('Paid by roommate not found.');
    if (splits.length === 0) throw new ValidationError('At least one split is required.');

    const totalSplitAmount = splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(totalSplitAmount - amount) > 0.01) throw new ValidationError('Total split amount does not match expense amount.');
    if (splits.some(s => s.amount < 0)) throw new ValidationError('Split amounts cannot be negative.');
    if (splits.some(s => !this.roommates.some(r => r.id === s.roommateId))) throw new ValidationError('One or more split roommates not found.');

    const newExpense: Expense = { id: this.nextId('exp'), description: description.trim(), amount, paidBy, splits };
    this.expenses.push(newExpense);
    this.saveState();
    return newExpense;
  }

  calculateSettlements(): Settlement[] {
    const balances: { [roommateId: string]: number } = {};
    this.roommates.forEach(r => balances[r.id] = 0);

    this.expenses.forEach(expense => {
      balances[expense.paidBy] += expense.amount;
      expense.splits.forEach(split => {
        balances[split.roommateId] -= split.amount;
      });
    });

    const creditors = Object.entries(balances).filter(([, balance]) => balance > 0).sort((a, b) => b[1] - a[1]);
    const debtors = Object.entries(balances).filter(([, balance]) => balance < 0).sort((a, b) => a[1] - b[1]);

    const settlements: Settlement[] = [];

    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < creditors.length && dIdx < debtors.length) {
      const [creditorId, creditorBalance] = creditors[cIdx];
      const [debtorId, debtorBalance] = debtors[dIdx];

      const amountToSettle = Math.min(creditorBalance, Math.abs(debtorBalance));

      if (amountToSettle > 0.01) {
        creditors[cIdx][1] = creditorBalance - amountToSettle;
        debtors[dIdx][1] = debtorBalance + amountToSettle;

        // Expenses involving both parties, shown in the UI as the settlement's context.
        const relevantExpenses = this.expenses.filter(exp => {
          const isCreditorInvolved = exp.paidBy === creditorId || exp.splits.some(s => s.roommateId === creditorId);
          const isDebtorInvolved = exp.paidBy === debtorId || exp.splits.some(s => s.roommateId === debtorId);
          return isCreditorInvolved && isDebtorInvolved;
        });

        settlements.push({ debtor: debtorId, creditor: creditorId, amount: amountToSettle, transactions: relevantExpenses });
      }

      if (creditors[cIdx][1] < 0.01) cIdx++;
      if (debtors[dIdx][1] > -0.01) dIdx++;
    }

    return settlements;
  }

  startNewSettlementPeriod(): HistoricalSettlement {
    if (this.expenses.length === 0) throw new ValidationError('No expenses to archive for a new settlement period.');
    const currentSettlements = this.calculateSettlements();
    const archivedData: HistoricalSettlement = {
      timestamp: Date.now(),
      settlements: currentSettlements,
      expenses: [...this.expenses]
    };
    this.historicalSettlements.push(archivedData);
    this.expenses = []; // Clear current expenses
    this.saveState();
    return archivedData;
  }

  clearAllData(): void {
    localStorage.clear();
    this.roommates = [];
    this.expenses = [];
    this.historicalSettlements = [];
  }
}
