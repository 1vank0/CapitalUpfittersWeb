/* Shared, owner-approved rates. No vehicle fitment or parts prices are inferred. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CUHitchPricing = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var rates = Object.freeze({ standard: 165, csp: 195, minimum: 220 });
  function labor(hours, supply) {
    if (!Number.isFinite(hours) || hours <= 0) throw new Error('Positive labor hours required');
    if (supply !== 'parts-labor' && supply !== 'csp') throw new Error('Invalid supply choice');
    return Math.max(rates.minimum, Math.round(hours * (supply === 'csp' ? rates.csp : rates.standard) * 100) / 100);
  }
  function estimate(supply, style, use, location) {
    var rate = supply === 'csp' ? rates.csp : rates.standard;
    // Published typical installation durations are planning guidance, never fitment approval.
    var hours = style === 'standard' ? [2, 3] : style === 'stealth' ? [2, 4] : null;
    if (use !== 'rack') hours = null; // wiring / tow configuration requires review
    return {
      rate: rate, minimum: rates.minimum,
      laborLow: hours ? labor(hours[0], supply) : null,
      laborHigh: hours ? labor(hours[1], supply) : null,
      hours: hours,
      mobileLow: location === 'mobile' ? 150 : 0,
      mobileHigh: location === 'mobile' ? 200 : 0,
      partsPending: supply !== 'csp'
    };
  }
  return Object.freeze({ rates: rates, labor: labor, estimate: estimate });
}));
