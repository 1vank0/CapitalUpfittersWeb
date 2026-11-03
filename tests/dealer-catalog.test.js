const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { lines } = require("../lib/dealer/quotes");
const { permits } = require("../dealer/fitment");

const root = path.join(__dirname, "..");
const schema = fs.readFileSync(path.join(root, "docs/dealer/schema.sql"), "utf8");
const desk = fs.readFileSync(path.join(root, "dealer/desk.js"), "utf8");

const catalog = [...schema.matchAll(/\('([^']+)','([^']+)','([^']+)','([^']+)',(\d+|NULL)\)/g)].map(
  ([, id, vehicle, category, label, msrp]) => ({
    id,
    vehicle,
    category,
    label,
    msrp: msrp === "NULL" ? null : Number(msrp),
    dealer_price: null,
    bundle_price: null,
    rebate: null,
  }),
);

const pickup = {
  type: "pickup",
  year: 2025,
  make: "Ford",
  model: "Maverick",
  cab: "crew",
  bedFeet: 4.5,
  bodyStyle: "factory",
  bodyLengthFeet: null,
  duty: "light",
};

test("pickup cover catalog is ordered from fast budget choices to premium", () => {
  const ids = ["truxport", "x15", "westin-hard-trifold", "mx4", "retraxpro-mx"];
  for (const id of ids) assert(catalog.some((item) => item.id === id));
  const positions = ids.map((id) => desk.indexOf('id: "' + id + '"'));
  assert(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});

test("cover upgrades require a factory pickup bed and can quote with one cover", () => {
  const ids = [
    "cover-upgrade-tailgate-seal",
    "cover-upgrade-bed-mat",
    "cover-upgrade-bed-lighting",
    "cover-upgrade-bakbox2",
    "cover-upgrade-xr-rails",
  ];
  for (const id of ids) {
    const item = catalog.find((row) => row.id === id);
    assert(item);
    assert(permits(pickup, item));
    assert(!permits({ ...pickup, bedFeet: null }, item));
    assert(!permits({ ...pickup, bodyStyle: "service", bedFeet: null, bodyLengthFeet: 9 }, item));
  }
  assert.equal(lines(catalog, pickup, ["retraxpro-mx", "cover-upgrade-xr-rails"]).length, 2);
  assert.throws(() => lines(catalog, pickup, ["mx4", "retraxpro-mx"]));
});

test("pickup flow presents Patriot Liner before add-on accessories", () => {
  assert(desk.indexOf('"Patriot Liner"') < desk.indexOf('"Add-on accessories"'));
  assert.match(desk, /syncCoverUpgrades\(\)/);
});
