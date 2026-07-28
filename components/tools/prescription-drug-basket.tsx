'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import {
  Pill,
  Plus,
  Pencil,
  Trash2,
  Mail,
  Printer,
  Shield,
  Sparkles,
  X,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  COMMON_MEDICATIONS,
  EMPTY_DRAFT,
  MEDICATION_FORMS,
  createPrescriptionId,
  formatBasketForEmail,
  loadBasketFromStorage,
  normalizeDraft,
  saveBasketToStorage,
  type MedicationForm,
  type PrescriptionBasketDraft,
  type PrescriptionItem,
} from '@/lib/tools/prescription-basket';
import { SaveDrugBasketButton } from '@/components/my-insurance/save-drug-basket-button';

export function PrescriptionDrugBasket() {
  const formId = useId();
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState<PrescriptionBasketDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof PrescriptionBasketDraft, string>>>({});
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setItems(loadBasketFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveBasketToStorage(items);
  }, [items, hydrated]);

  useEffect(() => {
    if (!feedback) return;
    const t = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(t);
  }, [feedback]);

  const updateDraft = useCallback(
    <K extends keyof PrescriptionBasketDraft>(key: K, value: PrescriptionBasketDraft[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  function validate(): boolean {
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = 'Enter the medication name';
    if (!draft.strength.trim()) next.strength = 'Enter the strength (e.g. 10 mg)';
    if (!draft.dosage.trim()) next.dosage = 'Enter how you take it';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const normalized = normalizeDraft(draft);
    if (!normalized) return;

    const now = new Date().toISOString();

    if (editingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, ...normalized, updatedAt: now }
            : item
        )
      );
      setFeedback(`Updated ${normalized.name}`);
      setEditingId(null);
    } else {
      const item: PrescriptionItem = {
        id: createPrescriptionId(),
        ...normalized,
        createdAt: now,
        updatedAt: now,
      };
      setItems((prev) => [...prev, item]);
      setFeedback(`Added ${normalized.name} to your list`);
    }

    setDraft(EMPTY_DRAFT);
    document.getElementById(`${formId}-name`)?.focus();
  }

  function startEdit(item: PrescriptionItem) {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      strength: item.strength,
      form: item.form,
      dosage: item.dosage,
      quantity: item.quantity ?? '',
      notes: item.notes ?? '',
    });
    setErrors({});
    setConfirmClear(false);
    document.getElementById(`${formId}-name`)?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setErrors({});
  }

  function removeItem(id: string) {
    const target = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (editingId === id) cancelEdit();
    setFeedback(target ? `Removed ${target.name}` : 'Medication removed');
  }

  function clearAll() {
    setItems([]);
    setConfirmClear(false);
    cancelEdit();
    setFeedback('Your list has been cleared');
  }

  function quickAdd(name: string) {
    setDraft((prev) => ({ ...prev, name }));
    setEditingId(null);
    document.getElementById(`${formId}-strength`)?.focus();
  }

  function emailList() {
    if (items.length === 0) return;
    const subject = encodeURIComponent(
      `My Prescription List (${items.length} medication${items.length === 1 ? '' : 's'})`
    );
    const body = encodeURIComponent(formatBasketForEmail(items));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function printList() {
    window.print();
  }

  const fieldClass =
    'h-12 text-base rounded-xl border-slate-200 bg-white shadow-sm focus-visible:ring-teal-500/30 focus-visible:border-teal-500';
  const labelClass = 'mb-1.5 block text-sm font-medium text-slate-800';

  return (
    <div className="space-y-8">
      {/* Success toast */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="print:hidden flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900 shadow-sm"
        >
          <Check className="h-4 w-4 shrink-0 text-teal-600" aria-hidden />
          {feedback}
        </div>
      )}

      {/* Add form */}
      <section
        className="print:hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100 md:p-7"
        aria-labelledby={`${formId}-heading`}
      >
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 id={`${formId}-heading`} className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Pill className="h-5 w-5 text-teal-600" aria-hidden />
            {editingId ? 'Edit medication' : 'Add a medication'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <X className="h-4 w-4" aria-hidden />
              Cancel edit
            </button>
          )}
        </div>

        <p className="mb-4 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Tip:</span> Include the exact strength and how
          often you take each medication for the most useful list.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor={`${formId}-name`} className={labelClass}>
              Medication name <span className="text-rose-600">*</span>
            </label>
            <Input
              id={`${formId}-name`}
              list={`${formId}-suggestions`}
              autoComplete="off"
              placeholder="e.g. Lisinopril"
              value={draft.name}
              onChange={(e) => updateDraft('name', e.target.value)}
              className={cn(fieldClass, errors.name && 'border-rose-400')}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? `${formId}-name-err` : undefined}
            />
            <datalist id={`${formId}-suggestions`}>
              {COMMON_MEDICATIONS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            {errors.name && (
              <p id={`${formId}-name-err`} className="mt-1 text-sm text-rose-600">
                {errors.name}
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={`${formId}-strength`} className={labelClass}>
                Strength <span className="text-rose-600">*</span>
              </label>
              <Input
                id={`${formId}-strength`}
                placeholder="e.g. 10 mg, 500 mg/5 mL"
                value={draft.strength}
                onChange={(e) => updateDraft('strength', e.target.value)}
                className={cn(fieldClass, errors.strength && 'border-rose-400')}
                aria-invalid={Boolean(errors.strength)}
              />
              {errors.strength && (
                <p className="mt-1 text-sm text-rose-600">{errors.strength}</p>
              )}
            </div>
            <div>
              <label htmlFor={`${formId}-form`} className={labelClass}>
                Form
              </label>
              <select
                id={`${formId}-form`}
                value={draft.form}
                onChange={(e) => updateDraft('form', e.target.value as MedicationForm)}
                className={cn(
                  fieldClass,
                  'w-full border px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30'
                )}
              >
                {MEDICATION_FORMS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor={`${formId}-dosage`} className={labelClass}>
              Dosage / instructions <span className="text-rose-600">*</span>
            </label>
            <Input
              id={`${formId}-dosage`}
              placeholder='e.g. 1 tablet twice daily, take with food'
              value={draft.dosage}
              onChange={(e) => updateDraft('dosage', e.target.value)}
              className={cn(fieldClass, errors.dosage && 'border-rose-400')}
              aria-invalid={Boolean(errors.dosage)}
            />
            {errors.dosage && (
              <p className="mt-1 text-sm text-rose-600">{errors.dosage}</p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={`${formId}-qty`} className={labelClass}>
                Quantity or days supply <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <Input
                id={`${formId}-qty`}
                placeholder="e.g. 30-day supply, 90 tablets"
                value={draft.quantity}
                onChange={(e) => updateDraft('quantity', e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor={`${formId}-notes`} className={labelClass}>
                Personal notes <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <Input
                id={`${formId}-notes`}
                placeholder="e.g. Take in the morning"
                value={draft.notes}
                onChange={(e) => updateDraft('notes', e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full gap-2 rounded-xl bg-teal-600 text-base font-semibold text-white hover:bg-teal-700 sm:w-auto sm:min-w-[200px]"
          >
            {editingId ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                Save changes
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" aria-hidden />
                Add to My List
              </>
            )}
          </Button>
        </form>

        {/* Quick-add */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-teal-600" aria-hidden />
            Quick-add common medications
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMON_MEDICATIONS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => quickAdd(name)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Basket list */}
      <section
        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100 md:p-7"
        aria-labelledby={`${formId}-list-heading`}
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id={`${formId}-list-heading`}
              className="text-lg font-semibold text-slate-900"
            >
              Your prescription list
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {!hydrated
                ? 'Loading your listâ€¦'
                : items.length === 0
                  ? '0 medications in your list'
                  : `${items.length} medication${items.length === 1 ? '' : 's'} in your list`}
            </p>
          </div>
          {items.length > 0 && (
            <div className="print:hidden">
              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="text-sm font-medium text-slate-500 hover:text-rose-700"
                >
                  Clear all
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-slate-700">Clear entire list?</span>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white hover:bg-rose-700"
                  >
                    Yes, clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Print-only title */}
        <div className="mb-4 hidden print:block">
          <h1 className="text-2xl font-semibold">My Prescription Drug List</h1>
          <p className="text-sm text-slate-600">
            {items.length} medication{items.length === 1 ? '' : 's'} Â· Printed{' '}
            {new Date().toLocaleString()}
          </p>
        </div>

        {hydrated && items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
            <Pill className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
            <p className="mt-3 font-medium text-slate-800">Your list is empty</p>
            <p className="mt-1 text-sm text-slate-600">
              Start by adding your first medication above.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100" aria-label="Prescription medications">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between',
                  editingId === item.id && 'rounded-xl bg-teal-50/50 px-3 ring-1 ring-teal-100'
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {item.strength} Â· {item.form}
                  </p>
                  <p className="mt-1 text-sm text-slate-800">{item.dosage}</p>
                  {item.quantity && (
                    <p className="mt-0.5 text-sm text-slate-500">Qty / supply: {item.quantity}</p>
                  )}
                  {item.notes && (
                    <p className="mt-1 text-sm italic text-slate-500">Note: {item.notes}</p>
                  )}
                </div>
                <div className="print:hidden flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900"
                    aria-label={`Edit ${item.name}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Actions */}
        <div className="print:hidden mt-6 sticky bottom-4 z-10 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/95 p-4 shadow-lg backdrop-blur-sm sm:static sm:shadow-none">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <SaveDrugBasketButton
              items={items.map((item, index) => ({
                name: item.name,
                strength: item.strength,
                form: item.form,
                dosage: item.dosage,
                quantity: item.quantity,
                notes: item.notes,
                sort_order: index,
              }))}
              className="h-12 flex-1 sm:flex-none sm:min-w-[200px]"
              disabled={items.length === 0}
            />
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={items.length === 0}
              onClick={emailList}
              className="h-12 flex-1 gap-2 rounded-xl border-slate-300 bg-white sm:flex-none sm:min-w-[160px]"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Email My List
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={items.length === 0}
              onClick={printList}
              className="h-12 flex-1 gap-2 rounded-xl border-slate-300 bg-white sm:flex-none sm:min-w-[160px]"
            >
              <Printer className="h-4 w-4" aria-hidden />
              Print / Download PDF
            </Button>
          </div>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden />
            Draft stays on this device until you save. Saving to My Insurance syncs your list across
            devices â€” we never sell your data. Educational only â€” not medical advice.
          </p>
        </div>
      </section>

    </div>
  );
}

