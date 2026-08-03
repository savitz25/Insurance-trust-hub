/** Ask Trust Hub network constants for Insurance standalone chrome. */

export const ASK_TRUST_HUB = {
  name: 'Ask Trust Hub',
  url: 'https://www.asktrusthub.com',
  promiseUrl: 'https://www.asktrusthub.com/promise',
  methodologyUrl: 'https://www.asktrusthub.com/methodology',
  revenueUrl: 'https://www.asktrusthub.com/how-we-make-money',
  trustCenterUrl: 'https://www.asktrusthub.com/trust',
  email: 'hello@asktrusthub.com',
} as const;

export const NETWORK_HUBS = [
  {
    id: 'move' as const,
    shortLabel: 'Move',
    proseName: 'Move Trust Hub',
    url: 'https://www.movetrusthub.com',
  },
  {
    id: 'insurance' as const,
    shortLabel: 'Insurance',
    proseName: 'Insurance Trust Hub',
    url: 'https://www.insurancetrusthub.com',
  },
  {
    id: 'lender' as const,
    shortLabel: 'Lending',
    proseName: 'Lender Trust Hub',
    url: 'https://www.lendertrusthub.com',
  },
] as const;
