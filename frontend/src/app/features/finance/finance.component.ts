import { LocaleService } from '../../core/services/locale.service';
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
        <h2 class="text-2xl font-bold">{{ i18n.t('مالی') }}</h2>
        <div class="flex gap-2">
          <select [(ngModel)]="selectedMonth" (ngModelChange)="loadMonth()" class="select-field w-40">
            @for (month of months; track month) {
              <option [value]="month">{{ month }}</option>
            }
          </select>
          <button (click)="loadMonth(); showEntryModal.set(true)" class="btn-primary">
            {{ i18n.t('+ ورودی جدید') }}
          </button>
        </div>
      </div>

      @if (saveError()) { <p role="alert" class="text-red-400 text-sm">{{ i18n.t(saveError()) }}</p> }

      @if (currentEntry()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="card animate-slide-up">
            <h3 class="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>💰</span> {{ i18n.t('درآمد') }}
            </h3>
            <p class="text-2xl font-bold text-green-400">{{ i18n.t('{p0} تومان', { p0: formatNumber(currentEntry()!.income) }) }}</p>
          </div>

          <div class="card animate-slide-up">
            <h3 class="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>📊</span> {{ i18n.t('تخصیص') }}
            </h3>
            @if (currentEntry()!.allocations) {
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-slate-400">{{ i18n.t('بدهی') }}</span>
                  <span>{{ formatNumber(currentEntry()!.allocations!.debt) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-400">{{ i18n.t('پس‌انداز') }}</span>
                  <span>{{ formatNumber(currentEntry()!.allocations!.savings) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-400">{{ i18n.t('شخصی') }}</span>
                  <span>{{ formatNumber(currentEntry()!.allocations!.self) }}</span>
                </div>
              </div>
            } @else {
              <p class="text-slate-500 text-sm">{{ i18n.t('تخصیصی ثبت نشده') }}</p>
            }
          </div>

          <div class="card animate-slide-up">
            <h3 class="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>📈</span> {{ i18n.t('نمودار تخصیص') }}
            </h3>
            @if (allocationTotal() > 0) {
              <div class="flex h-4 rounded-full overflow-hidden">
                <div class="bg-red-500" [style.width.%]="getAllocationPercent('debt')" [title]="i18n.t('بدهی: ') + formatNumber(allocationValue('debt')) + i18n.t(' تومان')"></div>
                <div class="bg-green-500" [style.width.%]="getAllocationPercent('savings')" [title]="i18n.t('پس‌انداز: ') + formatNumber(allocationValue('savings')) + i18n.t(' تومان')"></div>
                <div class="bg-blue-500" [style.width.%]="getAllocationPercent('self')" [title]="i18n.t('شخصی: ') + formatNumber(allocationValue('self')) + i18n.t(' تومان')"></div>
              </div>
              <div class="flex justify-between mt-2 text-xs text-slate-400">
                <span>{{ i18n.t('بدهی {p0}٪', { p0: formatNumber(getAllocationPercent('debt')) }) }}</span>
                <span>{{ i18n.t('پس‌انداز {p0}٪', { p0: formatNumber(getAllocationPercent('savings')) }) }}</span>
                <span>{{ i18n.t('شخصی {p0}٪', { p0: formatNumber(getAllocationPercent('self')) }) }}</span>
              </div>
              <p class="text-xs text-slate-400 mt-3">{{ i18n.t('مجموع تخصیص: {p0} تومان', { p0: formatNumber(allocationTotal()) }) }}</p>
            } @else {
              <p class="text-slate-400 text-sm">{{ i18n.t('برای نمایش نمودار، مبلغ بدهی، پس‌انداز یا شخصی را در ورودی مالی ثبت کنید.') }}</p>
            }
          </div>
        </div>

        @if (currentEntry()!.expenses && currentEntry()!.expenses!.length > 0) {
          <div class="card">
            <h3 class="text-lg font-semibold mb-4">{{ i18n.t('هزینه‌ها') }}</h3>
            <div class="space-y-2">
              @for (expense of currentEntry()!.expenses!; track expense.title) {
                <div class="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <span>{{ expense.title }}</span>
                  <span class="text-red-400">{{ i18n.t('{p0} تومان', { p0: formatNumber(expense.amount) }) }}</span>
                </div>
              }
            </div>
          </div>
        }

        @if (currentEntry()!.notes) {
          <div class="card">
            <h3 class="text-lg font-semibold mb-2">{{ i18n.t('یادداشت') }}</h3>
            <p class="text-slate-400">{{ currentEntry()!.notes }}</p>
          </div>
        }
      } @else {
        <app-empty-state [message]="i18n.t('داده‌ای برای این ماه ثبت نشده')" icon="💰"></app-empty-state>
      }

      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">{{ i18n.t('بدهی‌ها') }}</h3>
          <button (click)="showDebtModal.set(true)" class="btn-secondary text-sm">{{ i18n.t('+ بدهی جدید') }}</button>
        </div>
        @if (debts().length === 0) {
          <p class="text-slate-500 text-center py-4">{{ i18n.t('بدهی ثبت نشده') }}</p>
        } @else {
          <div class="space-y-3">
            @for (debt of debts(); track debt.id) {
              <div class="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{{ debt.title }}</span>
                    @if (debt.done) {
                      <span class="badge badge-success">{{ i18n.t('پرداخت شده') }}</span>
                    }
                  </div>
                  <div class="flex gap-4 mt-2 text-sm text-slate-400">
                    <span>{{ i18n.t('کل: {p0}', { p0: formatNumber(debt.totalAmount) }) }}</span>
                    <span>{{ i18n.t('پرداخت شده: {p0}', { p0: formatNumber(debt.paidAmount) }) }}</span>
                    <span>{{ i18n.t('ماهانه: {p0}', { p0: formatNumber(debt.monthlyPay) }) }}</span>
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
                <div class="flex gap-1 ms-4">
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
            <h3 class="text-lg font-semibold mb-4">{{ i18n.t('ورودی مالی') }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">{{ i18n.t('درآمد') }}</label>
                <input [(ngModel)]="entryForm.income" type="number" class="input-field" [placeholder]="i18n.t('مبلغ درآمد')">
              </div>
              <div>
                <label class="label">{{ i18n.t('بدهی') }}</label>
                <input [(ngModel)]="allocationForm.debt" type="number" class="input-field" [placeholder]="i18n.t('مبلغ بدهی')">
              </div>
              <div>
                <label class="label">{{ i18n.t('پس‌انداز') }}</label>
                <input [(ngModel)]="allocationForm.savings" type="number" class="input-field" [placeholder]="i18n.t('مبلغ پس‌انداز')">
              </div>
              <div>
                <label class="label">{{ i18n.t('شخصی') }}</label>
                <input [(ngModel)]="allocationForm.self" type="number" class="input-field" [placeholder]="i18n.t('مبلغ شخصی')">
              </div>
              <div>
                <label class="label">{{ i18n.t('یادداشت') }}</label>
                <textarea [(ngModel)]="entryForm.notes" class="input-field" rows="3" [placeholder]="i18n.t('یادداشت')"></textarea>
              </div>
              <div class="flex gap-3 justify-end">
                <button (click)="closeEntryModal()" class="btn-secondary">{{ i18n.t('لغو') }}</button>
                <button (click)="saveEntry()" class="btn-primary">{{ i18n.t('ذخیره') }}</button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (showDebtModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4 animate-slide-up">
            <h3 class="text-lg font-semibold mb-4">{{ editingDebt() ? i18n.t('ویرایش بدهی') : i18n.t('بدهی جدید') }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">{{ i18n.t('عنوان') }}</label>
                <input [(ngModel)]="debtForm.title" class="input-field" [placeholder]="i18n.t('عنوان بدهی')">
              </div>
              <div>
                <label class="label">{{ i18n.t('مبلغ کل') }}</label>
                <input [(ngModel)]="debtForm.totalAmount" type="number" class="input-field">
              </div>
              <div>
                <label class="label">{{ i18n.t('مبلغ پرداخت شده') }}</label>
                <input [(ngModel)]="debtForm.paidAmount" type="number" class="input-field">
              </div>
              <div>
                <label class="label">{{ i18n.t('پرداخت ماهانه') }}</label>
                <input [(ngModel)]="debtForm.monthlyPay" type="number" class="input-field">
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  [(ngModel)]="debtForm.done"
                  class="w-4 h-4 rounded border-dark-border text-primary-500 focus:ring-primary-500"
                >
                <label class="label mb-0">{{ i18n.t('پرداخت شده') }}</label>
              </div>
              <div class="flex gap-3 justify-end">
                <button (click)="closeDebtModal()" class="btn-secondary">{{ i18n.t('لغو') }}</button>
                <button (click)="saveDebt()" class="btn-primary">{{ i18n.t('ذخیره') }}</button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (confirmDelete()) {
        <app-confirm-dialog
          [message]="i18n.t('آیا از حذف مطمئن هستید؟')"
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
  i18n = inject(LocaleService);
  private api = inject(ApiService);

  entries = signal<FinanceEntry[]>([]);
  debts = signal<Debt[]>([]);
  currentEntry = signal<FinanceEntry | null>(null);
  showEntryModal = signal(false);
  showDebtModal = signal(false);
  editingDebt = signal<Debt | null>(null);
  confirmDelete = signal(false);
  saveError = signal('');
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
    this.entryForm = { income: 0, notes: '' };
    this.allocationForm = { debt: 0, savings: 0, self: 0 };
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
    return this.i18n.number(num);
  }

  allocationValue(type: 'debt' | 'savings' | 'self'): number {
    const value = Number(this.currentEntry()?.allocations?.[type]);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  allocationTotal(): number {
    return this.allocationValue('debt') + this.allocationValue('savings') + this.allocationValue('self');
  }

  getAllocationPercent(type: 'debt' | 'savings' | 'self'): number {
    const entry = this.currentEntry();
    if (!entry?.allocations) return 0;
    const total = this.allocationTotal();
    if (total === 0) return 0;
    return (this.allocationValue(type) / total) * 100;
  }

  saveEntry() {
    this.saveError.set('');
    const entry: Partial<FinanceEntry> = {
      month: this.selectedMonth,
      income: this.entryForm.income || 0,
      allocations: this.allocationForm,
      notes: this.entryForm.notes
    };

    if (this.currentEntry()) {
      this.api.updateFinanceEntry(this.currentEntry()!.id, entry).subscribe({
        next: () => {
          this.loadEntries();
          this.closeEntryModal();
        },
        error: () => this.saveError.set('ذخیره اطلاعات مالی انجام نشد؛ دوباره تلاش کنید.')
      });
    } else {
      this.api.createFinanceEntry(entry).subscribe({
        next: () => {
          this.loadEntries();
          this.closeEntryModal();
        },
        error: () => this.saveError.set('ذخیره اطلاعات مالی انجام نشد؛ دوباره تلاش کنید.')
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
