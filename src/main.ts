import { RoommateExpenseSplitter, ValidationError, Roommate, Expense, Settlement, HistoricalSettlement } from './app';

const app = new RoommateExpenseSplitter();

const roommateForm = document.getElementById('roommate-form') as HTMLFormElement;
const roommateNameInput = document.getElementById('roommate-name') as HTMLInputElement;
const roommateList = document.getElementById('roommate-list') as HTMLUListElement;

const expenseForm = document.getElementById('expense-form') as HTMLFormElement;
const expenseDescriptionInput = document.getElementById('expense-description') as HTMLInputElement;
const expenseAmountInput = document.getElementById('expense-amount') as HTMLInputElement;
const expensePaidBySelect = document.getElementById('expense-paid-by') as HTMLSelectElement;
const expenseSplitsContainer = document.getElementById('expense-splits') as HTMLDivElement;
const addSplitButton = document.getElementById('add-split-btn') as HTMLButtonElement;

const settlementsSection = document.getElementById('settlements-section') as HTMLElement;
const settlementsList = document.getElementById('settlements-list') as HTMLUListElement;
const newPeriodButton = document.getElementById('new-period-btn') as HTMLButtonElement;
const historicalSettlementsList = document.getElementById('historical-settlements-list') as HTMLUListElement;
const clearAllButton = document.getElementById('clear-all-btn') as HTMLButtonElement;

function renderRoommates() {
  roommateList.innerHTML = '';
  expensePaidBySelect.innerHTML = '<option value="">Select Roommate</option>';
  app.getRoommates().forEach(roommate => {
    const li = document.createElement('li');
    li.textContent = roommate.name;
    roommateList.appendChild(li);

    const option = document.createElement('option');
    option.value = roommate.id;
    option.textContent = roommate.name;
    expensePaidBySelect.appendChild(option);
  });
  renderExpenseSplits();
}

function renderExpenseSplits() {
  expenseSplitsContainer.innerHTML = '';
  app.getRoommates().forEach(roommate => {
    const div = document.createElement('div');
    div.className = 'split-item';
    div.innerHTML = `
      <label for="split-${roommate.id}">${roommate.name}:</label>
      <input type="number" id="split-${roommate.id}" data-roommate-id="${roommate.id}" value="0" min="0" step="0.01">
    `;
    expenseSplitsContainer.appendChild(div);
  });
}

function renderSettlements() {
  settlementsList.innerHTML = '';
  const settlements = app.calculateSettlements();
  if (settlements.length === 0) {
    settlementsList.innerHTML = '<li>No settlements needed.</li>';
    return;
  }
  settlements.forEach(s => {
    const li = document.createElement('li');
    const debtorName = app.getRoommates().find(r => r.id === s.debtor)?.name || 'Unknown';
    const creditorName = app.getRoommates().find(r => r.id === s.creditor)?.name || 'Unknown';
    li.innerHTML = `
      <strong>${debtorName} owes ${creditorName} $${s.amount.toFixed(2)}</strong>
      <details>
        <summary>View Transactions</summary>
        <ul>
          ${s.transactions.map(t => `<li>${t.description} (Paid by ${app.getRoommates().find(r => r.id === t.paidBy)?.name || 'Unknown'})</li>`).join('')}
        </ul>
      </details>
    `;
    settlementsList.appendChild(li);
  });
}

function renderHistoricalSettlements() {
  historicalSettlementsList.innerHTML = '';
  const historical = app.getHistoricalSettlements();
  if (historical.length === 0) {
    historicalSettlementsList.innerHTML = '<li>No past settlement periods.</li>';
    return;
  }
  historical.forEach(h => {
    const li = document.createElement('li');
    const date = new Date(h.timestamp).toLocaleString();
    li.innerHTML = `
      <h3>Settlement Period: ${date}</h3>
      <details>
        <summary>View Details</summary>
        <h4>Expenses:</h4>
        <ul>
          ${h.expenses.map(exp => `<li>${exp.description} - $${exp.amount.toFixed(2)} (Paid by ${app.getRoommates().find(r => r.id === exp.paidBy)?.name || 'Unknown'})</li>`).join('')}
        </ul>
        <h4>Settlements:</h4>
        <ul>
          ${h.settlements.map(s => {
            const debtorName = app.getRoommates().find(r => r.id === s.debtor)?.name || 'Unknown';
            const creditorName = app.getRoommates().find(r => r.id === s.creditor)?.name || 'Unknown';
            return `<li>${debtorName} owed ${creditorName} $${s.amount.toFixed(2)}</li>`;
          }).join('')}
        </ul>
      </details>
    `;
    historicalSettlementsList.appendChild(li);
  });
}

roommateForm.addEventListener('submit', (e) => {
  e.preventDefault();
  try {
    app.addRoommate(roommateNameInput.value);
    roommateNameInput.value = '';
    renderAll();
  } catch (error) {
    alert((error as Error).message);
  }
});

expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  try {
    const description = expenseDescriptionInput.value;
    const amount = parseFloat(expenseAmountInput.value);
    const paidBy = expensePaidBySelect.value;
    const splits: { roommateId: string; amount: number; }[] = [];

    expenseSplitsContainer.querySelectorAll('input[type="number"]').forEach(input => {
      const roommateId = (input as HTMLInputElement).dataset.roommateId;
      const splitAmount = parseFloat((input as HTMLInputElement).value);
      if (roommateId && !isNaN(splitAmount) && splitAmount > 0) {
        splits.push({ roommateId, amount: splitAmount });
      }
    });

    app.addExpense(description, amount, paidBy, splits);
    expenseForm.reset();
    renderAll();
  } catch (error) {
    alert((error as Error).message);
  }
});

newPeriodButton.addEventListener('click', () => {
  if (confirm('Are you sure you want to start a new settlement period? This will archive current expenses.')) {
    try {
      app.startNewSettlementPeriod();
      renderAll();
    } catch (error) {
      alert((error as Error).message);
    }
  }
});

clearAllButton.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear ALL data (roommates, expenses, historical settlements)? This action cannot be undone.')) {
    app.clearAllData();
    renderAll();
  }
});

function renderAll() {
  renderRoommates();
  renderSettlements();
  renderHistoricalSettlements();
}

renderAll();
