/** Client-side prescription drug basket — structured for future My Health account sync. */

export const PRESCRIPTION_BASKET_STORAGE_KEY = 'ith:prescription-basket:v1';

export const MEDICATION_FORMS = [
  'Tablet',
  'Capsule',
  'Liquid',
  'Injection',
  'Inhaler',
  'Cream',
  'Patch',
  'Other',
] as const;

export type MedicationForm = (typeof MEDICATION_FORMS)[number];

export type PrescriptionItem = {
  id: string;
  name: string;
  strength: string;
  form: MedicationForm;
  dosage: string;
  quantity?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type PrescriptionBasketDraft = {
  name: string;
  strength: string;
  form: MedicationForm;
  dosage: string;
  quantity: string;
  notes: string;
};

export const EMPTY_DRAFT: PrescriptionBasketDraft = {
  name: '',
  strength: '',
  form: 'Tablet',
  dosage: '',
  quantity: '',
  notes: '',
};

/** Common meds for quick-add (name only — user fills strength/dose). */
export const COMMON_MEDICATIONS = [
  'Lisinopril',
  'Metformin',
  'Atorvastatin',
  'Amlodipine',
  'Levothyroxine',
  'Metoprolol',
  'Omeprazole',
  'Losartan',
  'Gabapentin',
  'Sertraline',
] as const;

export function createPrescriptionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `rx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeDraft(draft: PrescriptionBasketDraft): Omit<
  PrescriptionItem,
  'id' | 'createdAt' | 'updatedAt'
> | null {
  const name = draft.name.trim();
  const strength = draft.strength.trim();
  const dosage = draft.dosage.trim();
  if (!name || !strength || !dosage) return null;

  return {
    name,
    strength,
    form: draft.form,
    dosage,
    quantity: draft.quantity.trim() || undefined,
    notes: draft.notes.trim() || undefined,
  };
}

export function formatPrescriptionLine(item: PrescriptionItem): string {
  const parts = [
    `${item.name} ${item.strength} (${item.form})`,
    item.dosage,
  ];
  if (item.quantity) parts.push(`Qty/supply: ${item.quantity}`);
  if (item.notes) parts.push(`Notes: ${item.notes}`);
  return parts.join(' — ');
}

export function formatBasketForEmail(items: PrescriptionItem[]): string {
  const header = [
    'My Prescription Drug List',
    `Generated: ${new Date().toLocaleString()}`,
    `Medications: ${items.length}`,
    '',
    '—'.repeat(40),
    '',
  ].join('\n');

  const body = items
    .map((item, i) => {
      const lines = [
        `${i + 1}. ${item.name}`,
        `   Strength: ${item.strength}`,
        `   Form: ${item.form}`,
        `   Dosage: ${item.dosage}`,
      ];
      if (item.quantity) lines.push(`   Quantity / days supply: ${item.quantity}`);
      if (item.notes) lines.push(`   Notes: ${item.notes}`);
      return lines.join('\n');
    })
    .join('\n\n');

  const footer = [
    '',
    '—'.repeat(40),
    'Created with InsuranceTrustHub.',
    'Educational organization tool only — not medical advice.',
    'Always verify medications with your pharmacist or doctor.',
  ].join('\n');

  return header + body + footer;
}

export function loadBasketFromStorage(): PrescriptionItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRESCRIPTION_BASKET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPrescriptionItem);
  } catch {
    return [];
  }
}

export function saveBasketToStorage(items: PrescriptionItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRESCRIPTION_BASKET_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota or private mode — fail silently; UI still works for session
  }
}

function isPrescriptionItem(value: unknown): value is PrescriptionItem {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.strength === 'string' &&
    typeof v.form === 'string' &&
    typeof v.dosage === 'string'
  );
}
