// US pickup quoting rules. Lengths are nominal feet, not part fitment guarantees.
// Sources: Ford bed-cover fitment (2019–26 Ranger, 2022–27 Maverick),
// Ford 2024–26 F-150 specifications, Toyota 2024–25 Tacoma fleet guide.
"use strict";
const DealerFitment = (() => {
  const norm = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  function profile(v) {
    const make = norm(v.make),
      model = norm(v.model),
      year = Number(v.year),
      cab = norm(v.cab);
    const ford = make === "ford";
    if (ford && model === "maverick" && year >= 2022 && year <= 2027)
      return { beds: [4.5], duty: "light" };
    if (ford && /^ranger(raptor)?$/.test(model)) {
      if (year >= 2024 && year <= 2026) return { beds: [5], duty: "light" };
      if (year >= 2019 && year <= 2023)
        return {
          beds: cab === "crew" ? [5] : cab === "extended" ? [6] : [5, 6],
          duty: "light",
        };
    }
    if (make === "toyota" && model === "tacoma" && year >= 2024 && year <= 2025)
      return { beds: cab === "extended" ? [6] : [5, 6], duty: "light" };
    if (ford && model === "f150lightning" && year === 2025)
      return { beds: [5.5], duty: "light" };
    if (ford && model === "f150" && year >= 2024 && year <= 2026)
      return {
        beds:
          cab === "crew"
            ? [5.5, 6.5]
            : cab === "regular"
              ? [6.5, 8]
              : [5.5, 6.5, 8],
        duty: "light",
      };
    // For other generations keep the measured length instead of assigning a bed by name.
    const heavy =
      (ford && /^f(250|350)(superduty)?$/.test(model)) ||
      (["chevrolet", "gmc", "ram", "dodge"].includes(make) &&
        /(?:2500|3500)(?:hd)?$/.test(model));
    return { beds: [], duty: heavy ? "heavy" : "" };
  }
  function liner(v) {
    if (!v.bedFeet) return "";
    if (v.bedFeet <= 5) return "liner-short";
    if (v.bedFeet >= 7.5) return "liner-long";
    return v.duty === "heavy" ? "liner-hd" : "liner-standard";
  }
  function permits(v, item) {
    if (item.vehicle !== v.type) return false;
    if (v.type !== "pickup") return true;
    if (item.category === "Bedliner") return item.id === liner(v);
    if (item.category === "Bed cover" || item.id === "uv")
      return Boolean(v.bedFeet);
    if (item.id === "rust-hd") return v.duty === "heavy";
    if (item.id === "rust") return v.duty === "light";
    return true;
  }
  return { profile, permits };
})();
if (typeof module !== "undefined") module.exports = DealerFitment;
