const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../quote-assist.js'), 'utf8');
function receipt(detail) {
  let listener;
  const slots = Object.fromEntries(['confirmation-copy', 'ref-slot', 'warning-slot'].map(key => [key, { textContent: '', hidden: false, classList: { toggle() {} } }]));
  const panel = { querySelector: selector => slots[selector.slice(9, -1)] };
  const document = { addEventListener: (_, fn) => listener = fn, getElementById: id =>
    id === detail.formId ? { getAttribute: () => 'receipt' } : ['receipt', 'done'].includes(id) ? panel : null };
  vm.runInNewContext(source, { document });
  listener({ detail });
  return slots;
}
for (const formId of ['quote-retail', 'quote-fleet', 'quote-dealer']) {
  test(`${formId} reflects saved-only receipts without claiming an email was sent`, () => {
    const slots = receipt({ formId, reference: 'CU-123', deliveryMode: 'persisted_only', customerConfirmation: false });
    assert.match(slots['confirmation-copy'].textContent, /confirmation email was not sent/);
    assert.match(slots['warning-slot'].textContent, /saved.*notification was delayed/);
    assert.equal(slots['warning-slot'].hidden, false);
    assert.equal(slots['ref-slot'].textContent, 'Reference: CU-123');
  });
}
test('confirmed customer email and healthy delivery show correct next steps', () => {
  const slots = receipt({ formId: 'quote-fleet', reference: 'CU-124', customerConfirmation: true, deliveryMode: 'persisted_and_emailed' });
  assert.match(slots['confirmation-copy'].textContent, /Reply to your confirmation email/);
  assert.equal(slots['warning-slot'].hidden, true);
});
