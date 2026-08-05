import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { FinanceEntry, ExpenseItem, Allocation, Debt } from '../../shared/models/finance.model';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [FormsModule, EmptyStateComponent, ConfirmDialogComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">مالی</h2>
        <div class="flex gap-2">
          <select [(ngModel)]="selectedMonth" (ngModelChange)="loadMonth()" class="select-field w-40">
            @for (month of months; track month) {
              <option [value]="month">{{ month }}</option>
            }
          </select>
          <button (click)="showEntryModal.set(true)" class="btn-primary">
            + ورودی جدید
          </button>
        </div>
      </div>

      @if (currentEntry()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="card animate-slide-up">
            <h3 class="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>💰</span> درآمد
            </h3>
            <p class="text-2xl font-bold text-green-400">{{ formatNumber(currentEntry()!.income) }} تومان</p>
          </div>

          <div class="card animate-slide-up">
            <h3 class="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>📊</span> تخصیص
            </h3>
            @if (currentEntry()!.allocations) {
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-slate-400">بدهی</span>
                  <span>{{ formatNumber(currentEntry()!.allocations!.debt) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-400">پس‌انداز</span>
                  <span>{{ formatNumber(currentEntry()!.allocations!.savings) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-400">شخصی</span>
                  <span>{{ formatNumber(currentEntry()!.allocations!.self) }}</span>
                </div>
              </div>
            } @else {
              <p class="text-slate-500 text-sm">تخصیصی ثبت نشده</p>
            }
          </div>

          <div class="card animate-slide-up">
            <h3 class="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>📈</span> نمودار
            </h3>
            @if (currentEntry()!.allocations) {
              <div class="flex h-4 rounded-full overflow-hidden">
                <div class="bg-red-500" [style.width.%]="getAllocationPercent('debt')"></div>
                <div class="bg-green-500" [style.width.%]="getAllocationPercent('savings')"></div>
                <div class="bg-blue-500" [style.width.%]="getAllocationPercent('self')"></div>
              </div>
              <div class="flex justify-between mt-2 text-xs text-slate-400">
                <span>بدهی</span>
                <span>پس‌انداز</span>
                <span>شخصی</span>
              </div>
            } @else {
              <p class="text-slate-500 text-sm">داده‌ای موجود نیست</p>
            }
          </div>
        </div>

        @if (currentEntry()!.expenses && currentEntry()!.expenses!.length > 0) {
          <div class="card">
            <h3 class="text-lg font-semibold mb-4">هزینه‌ها</h3>
            <div class="space-y-2">
              @for (expense of currentEntry()!.expenses!; track expense.title) {
                <div class="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <span>{{ expense.title }}</span>
                  <span class="text-red-400">{{ formatNumber(expense.amount) }} تومان</span>
                </div>
              }
            </div>
          </div>
        }

        @if (currentEntry()!.notes) {
          <div class="card">
            <h3 class="text-lg font-semibold mb-2">یادداشت</h3>
            <p class="text-slate-400">{{ currentEntry()!.notes }}</p>
          </div>
        }
      } @else {
        <app-empty-state message="داده‌ای برای این ماه ثبت نشده" icon="💰"></app-empty-state>
      }

      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">بدهی‌ها</h3>
          <button (click)="showDebtModal.set(true)" class="btn-secondary text-sm">+ بدهی جدید</button>
        </div>
        @if (debts().length === 0) {
          <p class="text-slate-500 text-center py-4">بدهی ثبت نشده</p>
        } @else {
          <div class="space-y-3">
            @for (debt of debts(); track debt.id) {
              <div class="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{{ debt.title }}</span>
                    @if (debt.done) {
                      <span class="badge badge-success">پرداخت شده</span>
                    }
                  </div>
                  <div class="flex gap-4 mt-2 text-sm text-slate-400">
                    <span>کل: {{ formatNumber(debt.totalAmount) }}</span>
                    <span>پرداخت شده: {{ formatNumber(debt.paidAmount) }}</span>
                    <span>ماهانه: {{ formatNumber(debt.monthlyPay) }}</span>
                  </div>
                  <div class="mt-2">
                    <div class="w-full bg-slate-700 rounded-full h-2">
                      <div
                        class="h-full rounded-full bg-green-500 transition-all duration-500"
                        [style.width.%]="(debt.paidAmount / debt.totalAmount) * 100"
                      ></div>
                    </div>
                  </div>
                </div>
                <div class="flex gap-1 mr-4">
                  <button (click)="editDebt(debt)" class="p-2 hover:bg-dark-hover rounded-lg">✏️</button>
                  <button (click)="deleteDebt(debt.id)" class="p-2 hover:bg-dark-hover rounded-lg">🗑️</button>
                </div>
              </div>
            }
          </div>
        }
      </div>

      @if (showEntryModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4 animate-slide-up">
            <h3 class="text-lg font-semibold mb-4">ورودی مالی</h3>
            <div class="space-y-4">
              <div>
                <label class="label">درآمد</label>
                <input [(ngModel)]="entryForm.income" type="number" class="input-field" placeholder="مبلغ درآمد">
              </div>
              <div>
                <label class="label">بدهی</label>
                <input [(ngModel)]="allocationForm.debt" type="number" class="input-field" placeholder="مبلغ بدهی">
              </div>
              <div>
                <label class="label">پس‌انداز</label>
                <input [(ngModel)]="allocationForm.savings" type="number" class="input-field" placeholder="مبلغ پس‌انداز">
              </div>
              <div>
                <label class="label">شخصی</label>
                <input [(ngModel)]="allocationForm.self" type="number" class="input-field" placeholder="مبلغ شخصی">
              </div>
              <div>
                <label class="label">یادداشت</label>
                <textarea [(ngModel)]="entryForm.notes" class="input-field" rows="3" placeholder="یادداشت"></textarea>
              </div>
              <div class="flex gap-3 justify-end">
                <button (click)="closeEntryModal()" class="btn-secondary">لغو</button>
                <button (click)="saveEntry()" class="btn-primary">ذخیره</button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (showDebtModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4 animate-slide-up">
            <h3 class="text-lg font-semibold mb-4">{{ editingDebt() ? 'ویرایش بدهی' : 'بدهی جدید' }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">عنوان</label>
                <input [(ngModel)]="debtForm.title" class="input-field" placeholder="عنوان بدهی">
              </div>
              <div>
                <label class="label">مبلغ کل</label>
                <input [(ngModel)]="debtForm.totalAmount" type="number" class="input-field">
              </div>
              <div>
                <label class="label">مبلغ پرداخت شده</label>
                <input [(ngModel)]="debtForm.paidAmount" type="number" class="input-field">
              </div>
              <div>
                <label class="label">پرداخت ماهانه</label>
                <input [(ngModel)]="debtForm.monthlyPay" type="number" class="input-field">
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  [(ngModel)]="debtForm.done"
                  class="w-4 h-4 rounded border-dark-border text-primary-500 focus:ring-primary-500"
                >
                <label class="label mb-0">پرداخت شده</label>
              </div>
              <div class="flex gap-3 justify-end">
                <button (click)="closeDebtModal()" class="btn-secondary">لغو</button>
                <button (click)="saveDebt()" class="btn-primary">ذخیره</button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (confirmDelete()) {
        <app-confirm-dialog
          message="آیا از حذف مطمئن هستید؟"
          (confirmed)="confirmDeleteAction()"
          (cancelled)="confirmDelete.set(false)"
        ></app-confirm-dialog>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class FinanceComponent implements OnInit {
  private api = inject(ApiService);

  entries = signal<FinanceEntry[]>([]);
  debts = signal<Debt[]>([]);
  currentEntry = signal<FinanceEntry | null>(null);
  showEntryModal = signal(false);
  showDebtModal = signal(false);
  editingDebt = signal<Debt | null>(null);
  confirmDelete = signal(false);
  private pendingDeleteAction: (() => void) | null = null;

  selectedMonth = this.getCurrentMonth();
  months: string[] = [];
  entryForm: Partial<FinanceEntry> = { income: 0, notes: '' };
  allocationForm: Allocation = { debt: 0, savings: 0, self: 0 };
  debtForm: Partial<Debt> = { title: '', totalAmount: 0, paidAmount: 0, monthlyPay: 0, done: false };

  constructor() {
    this.generateMonths();
  }

  ngOnInit() {
    this.loadEntries();
    this.loadDebts();
  }

  private generateMonths() {
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      this.months.push(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
    }
  }

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  private loadEntries() {
    this.api.getFinanceEntries().subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loadMonth();
      }
    });
  }

  loadMonth() {
    const entry = this.entries().find(e => e.month === this.selectedMonth);
    this.currentEntry.set(entry || null);
    if (entry) {
      this.entryForm = { income: entry.income, notes: entry.notes };
      if (entry.allocations) {
        this.allocationForm = { ...entry.allocations };
      }
    }
  }

  private loadDebts() {
    this.api.getDebts().subscribe({
      next: (debts) => this.debts.set(debts)
    });
  }

  formatNumber(num: number): string {
    return num.toLocaleString('fa-IR');
  }

  getAllocationPercent(type: 'debt' | 'savings' | 'self'): number {
    const entry = this.currentEntry();
    if (!entry?.allocations) return 0;
    const total = entry.allocations.debt + entry.allocations.savings + entry.allocations.self;
    if (total === 0) return 0;
    return (entry.allocations[type] / total) * 100;
  }

  saveEntry() {
    const entry: Partial<FinanceEntry> = {
      month: this.selectedMonth,
      income: this.entryForm.income || 0,
      allocations: this.allocationForm,
      notes: this.entryForm.notes
    };

    if (this.currentEntry()) {
      this.api.updateFinanceEntry(this.selectedMonth, entry).subscribe({
        next: () => {
          this.loadEntries();
          this.closeEntryModal();
        }
      });
    } else {
      this.api.createFinanceEntry(entry).subscribe({
        next: () => {
          this.loadEntries();
          this.closeEntryModal();
        }
      });
    }
  }

  closeEntryModal() {
    this.showEntryModal.set(false);
    this.entryForm = { income: 0, notes: '' };
    this.allocationForm = { debt: 0, savings: 0, self: 0 };
  }

  editDebt(debt: Debt) {
    this.editingDebt.set(debt);
    this.debtForm = {
      title: debt.title,
      totalAmount: debt.totalAmount,
      paidAmount: debt.paidAmount,
      monthlyPay: debt.monthlyPay,
      done: debt.done
    };
    this.showDebtModal.set(true);
  }

  deleteDebt(id: number) {
    this.pendingDeleteAction = () => {
      this.api.deleteDebt(id).subscribe({
        next: () => this.loadDebts()
      });
    };
    this.confirmDelete.set(true);
  }

  confirmDeleteAction() {
    this.pendingDeleteAction?.();
    this.confirmDelete.set(false);
    this.pendingDeleteAction = null;
  }

  saveDebt() {
    if (this.editingDebt()) {
      this.api.updateDebt(this.editingDebt()!.id, this.debtForm).subscribe({
        next: () => {
          this.loadDebts();
          this.closeDebtModal();
        }
      });
    } else {
      this.api.createDebt(this.debtForm).subscribe({
        next: () => {
          this.loadDebts();
          this.closeDebtModal();
        }
      });
    }
  }

  closeDebtModal() {
    this.showDebtModal.set(false);
    this.editingDebt.set(null);
    this.debtForm = { title: '', totalAmount: 0, paidAmount: 0, monthlyPay: 0, done: false };
  }
}
