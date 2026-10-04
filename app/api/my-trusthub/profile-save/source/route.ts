import type { NonceStore } from '@/lib/my-insurance/insurance-assertion';
import { askVerifyKey, handleInsuranceSource } from '@/lib/my-insurance/source-callback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const seen = new Map<string, number>();
const nonces: NonceStore = {
  async claim(key, expiresAt) {
    const now = Date.now();
    for (const [id, exp] of seen) if (exp <= now) seen.delete(id);
    if (seen.has(key)) return false;
    seen.set(key, expiresAt);
    return true;
  },
};

export async function POST(request: Request) {
  return handleInsuranceSource(request, { key: askVerifyKey(), nonces });
}
