export interface FinanceEntry {
  id: number;
  month: string;
  income: number;
  expenses: ExpenseItem[] | null;
  allocations: Allocation | null;
  notes: string | null;
}

export interface ExpenseItem {
  title: string;
  amount: number;
}

export interface Allocation {
  debt: number;
  savings: number;
  self: number;
}

export interface Debt {
  id: number;
  title: string;
  totalAmount: number;
  paidAmount: number;
  monthlyPay: number;
  dueDate: string | null;
  done: boolean;
}
