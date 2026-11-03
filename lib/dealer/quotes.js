const crypto = require("node:crypto");
class Fault extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
function field(value, label, max = 180, required = true) {
  if (value != null && typeof value !== "string")
    throw new Fault("Check " + label + ".");
  const s = (value || "").trim();
  if ((required && !s) || s.length > max)
    throw new Fault("Check " + label + ".");
  return s;
}
function email(value) {
  const s = field(value, "salesperson email", 250);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s))
    throw new Fault("Enter a valid email.");
  return s.toLowerCase();
}
function uuid(s) {
  if (
    !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(s)
  )
    throw new Fault("Invalid record.");
  return s;
}
function money(s) {
  if (s == null || s === "") return null;
  if (!Number.isSafeInteger(s) || s < 0 || s > 100000000)
    throw new Fault("Invalid price.");
  return s;
}
function file(d) {
  if (!d) return null;
  if (
    typeof d.data !== "string" ||
    d.data.length > 2800000 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(d.data)
  )
    throw new Fault("Upload a PDF, JPG or PNG under 2 MB.");
  const b = Buffer.from(d.data, "base64");
  const ext =
    b.subarray(0, 5).toString() === "%PDF-"
      ? "pdf"
      : b[0] === 255 && b[1] === 216 && b[2] === 255
        ? "jpg"
        : b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
          ? "png"
          : null;
  if (!ext || b.length > 2 * 1024 * 1024)
    throw new Fault("Upload a PDF, JPG or PNG under 2 MB.");
  const kind = field(d.kind, "document type");
  if (!["PO", "We Owe"].includes(kind))
    throw new Fault("Choose a document type.");
  return {
    kind,
    filename: kind.replace(/ /g, "-") + "." + ext,
    data: b.toString("base64"),
  };
}
function lines(catalog, vehicle, ids) {
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > 20 ||
    new Set(ids).size !== ids.length
  )
    throw new Fault("Choose at least one service.");
  const rows = ids.map((id) =>
    catalog.find((i) => i.id === id && i.vehicle === vehicle),
  );
  if (rows.includes(undefined))
    throw new Fault("A service does not match the vehicle.");
  if (new Set(rows.map((r) => r.category)).size !== rows.length)
    throw new Fault("Choose one option per service.");
  const liner = rows.some((r) => r.category === "Bedliner");
  if (!liner && ids.includes("uv"))
    throw new Fault("UV Plus requires a bedliner.");
  return rows.map((r) => {
    const cover = r.category === "Bed cover";
    const bundled = cover && liner && r.bundle_price != null;
    return {
      id: r.id,
      label: r.label,
      msrp: r.msrp,
      price: cover
        ? bundled
          ? r.bundle_price
          : r.msrp
        : (r.dealer_price ?? r.msrp),
      bundled,
      rebate: r.rebate,
    };
  });
}
function vehicle(data) {
  if (!["pickup", "van", "other"].includes(data.type))
    throw new Fault("Choose a vehicle type.");
  const year = Number(data.year);
  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > new Date().getFullYear() + 2
  )
    throw new Fault("Check vehicle year.");
  return {
    type: data.type,
    year,
    make: field(data.make, "make"),
    model: field(data.model, "model"),
    details: field(data.details, "configuration", 160, false),
    vin: field(data.vin, "VIN", 17, false),
    stock: field(data.stock, "stock number", 80, false),
  };
}
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const token = () => crypto.randomBytes(32).toString("base64url");
module.exports = {
  Fault,
  field,
  email,
  uuid,
  money,
  file,
  lines,
  vehicle,
  hash,
  token,
};
