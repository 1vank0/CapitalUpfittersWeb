const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Exercise the real mapper without exporting internal helpers in production or
// making network requests. Existing contract tests cover the HTTP boundary.
const source = fs.readFileSync(path.join(__dirname, '../api/lead.js'), 'utf8');
const sandbox = { require, process, console, module: { exports: {} } };
vm.runInNewContext(source + '\nmodule.exports = buildPersistencePayload;', sandbox);
const map = body => JSON.parse(JSON.stringify(sandbox.module.exports(body)));
const base = {
  form_id: 'quote-fleet', form_type: 'fleet',
  'Business Name': 'Example Fleet', 'Contact Name': 'Test Contact',
  'Business Email': 'test@example.com', services: ['Bedliners'],
  'Vehicle Count': '6–15 vehicles', Timeline: '1–3 months',
  Message: 'Keep two vehicles available.'
};

test('dealer organization field is preserved in durable storage', () => {
  const payload = map({
    form_id: 'quote-dealer', form_type: 'dealer',
    'Organization Name': 'Example Municipality',
    'Organization Type': 'Government / Municipal',
    'Contact Name': 'Test Contact', 'Work Email': 'test@example.com',
    'Monthly Volume': '6–15 units / month', services: ['Bedliners']
  });
  assert.equal(payload.organization.name, 'Example Municipality');
  assert.equal(payload.kind, 'commercial');
  assert.equal(payload.requestType, 'government');
  assert.equal(payload.assets.description, 'Government / Municipal');
  assert.equal(payload.assets.quantity, 6);
});

test('fleet vehicle types describe the assets without replacing notes or organization', () => {
  const payload = map({ ...base, 'Vehicle Types': 'Ford Transit, F-150, Sprinter' });
  assert.equal(payload.assets.description, 'Ford Transit, F-150, Sprinter');
  assert.equal(payload.organization.name, 'Example Fleet');
  assert.equal(payload.assets.quantity, 6);
  assert.equal(payload.scope.notes, base.Message);
  assert.equal(payload.logistics.timing, base.Timeline);
});

test('blank vehicle types retain the existing fleet fallback', () => {
  assert.equal(map({ ...base, 'Vehicle Types': '   ' }).assets.description, 'Example Fleet');
  assert.equal(map({ ...base, 'Business Name': '', 'Vehicle Types': '' }).assets.description, 'Fleet upfit inquiry');
});

test('vehicle types are bounded and only affect fleet quotes', () => {
  assert.equal(map({ ...base, 'Vehicle Types': 'X'.repeat(250) }).assets.description.length, 200);
  const dealer = map({ ...base, form_id: 'quote-dealer', 'Organization Type': 'Independent Dealer', 'Vehicle Types': 'Ignored' });
  assert.equal(dealer.assets.description, 'Independent Dealer');
});

test('existing business name aliases retain precedence', () => {
  assert.equal(map({ ...base, 'Organization Name': 'Other Name' }).organization.name, 'Example Fleet');
  assert.equal(map({ ...base, 'Business Name': '', business: 'Legacy Name', 'Organization Name': 'Other Name' }).organization.name, 'Legacy Name');
});
