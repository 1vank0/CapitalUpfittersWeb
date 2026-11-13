// Existing service slugs and quote audience contracts, not the plan's sample values.
export const SITE_ORIGIN = 'https://www.capitalupfitters.com';
export const serviceOptions = [
  'bedliner', 'tonneau', 'hitches', 'stealth-hitches', 'ecohitch', 'undercoating',
  'ceramic-coating', 'camper-shells', 'wheels-tires', 'suspension', 'lighting',
  'commercial-wraps', 'industrial-coatings', 'fleet',
] as const;
export const audiences = ['retail', 'fleet', 'dealer', 'project'] as const;
const routes: Record<string, string> = {
  bedliner: '/services/bedliner', tonneau: '/services/tonneau', hitches: '/services/hitches',
  'stealth-hitches': '/services/stealth-hitches', ecohitch: '/services/ecohitch', undercoating: '/services/undercoating',
  'ceramic-coating': '/services/ceramic-coating', 'camper-shells': '/services/camper-shells', 'wheels-tires': '/services/wheels-tires',
  suspension: '/services/suspension', lighting: '/services/lighting', 'commercial-wraps': '/services/commercial-wraps',
  'industrial-coatings': '/services/industrial-coatings', fleet: '/fleet',
};
export const serviceURL = (service: string) => `${SITE_ORIGIN}${routes[service] || '/services'}`;
export const quoteURL = (service: string, audience: string) => {
  if (!(serviceOptions as readonly string[]).includes(service) || !(audiences as readonly string[]).includes(audience)) throw new Error('Invalid quote selection.');
  return `${SITE_ORIGIN}/quote?${new URLSearchParams({ service, audience })}`;
};
