"use strict";
const { Fault } = require("./quotes");
const { profile, cabFor } = require("../../dealer/fitment");
function normalizeVIN(input) {
  const vin = String(input || "")
    .trim()
    .toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin))
    throw new Fault(
      "Use the full 17-character VIN. VINs do not contain I, O or Q.",
    );
  return vin;
}
function interpret(row, vin) {
  // vPIC returns a 200 even for malformed or partially decoded VINs.
  const codes = String(row?.ErrorCode ?? "")
    .split(",")
    .map((s) => s.trim());
  if (
    !row?.Make ||
    !row.Model ||
    !/^\d{4}$/.test(row.ModelYear) ||
    !codes.includes("0") ||
    codes.some((code) => code !== "0" && !["400"].includes(code))
  )
    throw new Fault(
      "This VIN could not be decoded reliably. Check the number or enter the vehicle manually.",
      422,
    );
  const body = row.BodyClass || "";
  const rawCab =
    row.BodyCabType ||
    [row.Series, row.Trim, row.Series2, row.Trim2].filter(Boolean).join(" ");
  const cab = /crew/i.test(rawCab)
    ? "crew"
    : /extra|extended|supercab|xtracab/i.test(rawCab)
      ? "extended"
      : /regular|standard|single/i.test(rawCab)
        ? "regular"
        : /double cab/i.test(rawCab)
          ? "crew"
          : "";
  const v = {
    vin,
    make: row.Make,
    model: row.Model,
    year: Number(row.ModelYear),
    cab,
    body,
    details: [row.Trim || row.Series, body]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 160),
  };
  // Passenger vans/minivans must not silently inherit cargo-van service suggestions.
  const cargo =
    /cargo van/i.test(body) ||
    (/\bvan\b/i.test(body) &&
      /cargo/i.test([row.Trim, row.Series, row.Trim2, row.Series2].join(" ")));
  v.type =
    profile(v).beds.length || /pickup/i.test(body)
      ? "pickup"
      : cargo
        ? "van"
        : /van/i.test(body)
          ? ""
          : body
            ? "other"
            : "";
  v.cab = cabFor(v);
  if (
    /chassis cab|cab chassis/i.test(body) ||
    (row.VehicleType === "INCOMPLETE VEHICLE" && /chassis|cab/i.test(body))
  ) {
    v.type = "pickup";
    v.chassisCab = true;
  }
  const inches = Number(row.BedLengthIN);
  v.reportedBedFeet =
    inches >= 36 && inches <= 120
      ? Math.round((inches / 12) * 100) / 100
      : null;
  return v;
}
async function decodeVIN(input) {
  const vin = normalizeVIN(input);
  let row;
  try {
    const response = await fetch(
      "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/" +
        vin +
        "?format=json",
      {
        signal: AbortSignal.timeout(8500),
        headers: { Accept: "application/json" },
      },
    );
    if (!response.ok) throw Error("Decoder unavailable");
    row = (await response.json()).Results?.[0];
  } catch {
    throw new Fault(
      "The VIN lookup service is unavailable. Try again or enter the vehicle manually.",
      503,
    );
  }
  return interpret(row, vin);
}
module.exports = { decodeVIN };
