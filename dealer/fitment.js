// US pickup quoting rules. Lengths are nominal feet, not part fitment guarantees.
// Sources: Ford bed-cover fitment (2019–26 Ranger, 2022–27 Maverick),
// Ford F-150 and Super Duty technical specifications and order guides, Toyota Tacoma fleet guide.
"use strict";
const DealerFitment = (() => {
  const norm = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const serviceLengths = [7, 8, 9, 10, 11, 12];
  function cabFor(v) {
    if (["regular", "extended", "crew"].includes(v.cab)) return v.cab;
    const model = norm(v.model),
      year = Number(v.year);
    if (norm(v.make) !== "ford") return "";
    if (
      (model === "maverick" && year >= 2022 && year <= 2027) ||
      (/^ranger(raptor)?$/.test(model) && year >= 2024 && year <= 2026)
    )
      return "crew";
    // Ford's 2026 Part 565 guide identifies the cab in the series/body code (positions 5–7).
    if (
      year === 2026 &&
      /^1F[TD][A-HJ-NPR-Z0-9]{14}$/.test(v.vin || "") &&
      /^f(150|250|350)(superduty)?$/.test(model)
    )
      return { F: "regular", X: "extended", W: "crew" }[v.vin[4]] || "";
    return "";
  }
  function cabLabel(v) {
    const cab = cabFor(v);
    if (cab === "crew")
      return norm(v.make) === "ford" &&
        ["f150", "f150lightning", "ranger", "maverick"].includes(norm(v.model))
        ? "SuperCrew"
        : "Crew cab";
    if (cab === "extended")
      return norm(v.make) === "ford" ? "SuperCab" : "Extended cab";
    return cab === "regular" ? "Regular cab" : "";
  }
  function profile(v) {
    const make = norm(v.make),
      model = norm(v.model),
      year = Number(v.year),
      cab = cabFor(v);
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
    if (
      ford &&
      model === "f150" &&
      year === 2026 &&
      /^1FT[A-HJ-NPR-Z0-9]{14}$/.test(v.vin || "")
    ) {
      const series = v.vin.slice(4, 7);
      if (["W4L", "W1R"].includes(series) || ["U", "7", "M"].includes(v.vin[7]))
        return { beds: [5.5], duty: "light" };
    }
    if (ford && model === "f150" && year >= 2024 && year <= 2027)
      return {
        beds:
          cab === "crew"
            ? [5.5, 6.5]
            : cab === "regular"
              ? [6.5, 8]
              : cab === "extended"
                ? [6.5]
                : [5.5, 6.5, 8],
        duty: "light",
      };
    if (
      ford &&
      /^f(250|350|450)(superduty)?$/.test(model) &&
      year >= 2024 &&
      year <= 2027
    ) {
      const dualF350 =
        year === 2026 &&
        /^1FT[A-HJ-NPR-Z0-9]{14}$/.test(v.vin || "") &&
        /^[FXW]3[CD]$/.test(v.vin.slice(4, 7));
      return {
        beds:
          cab === "regular" || model.startsWith("f450") || dualF350
            ? [8]
            : [6.75, 8],
        duty: "heavy",
      };
    }
    // For other generations keep the measured length instead of assigning a bed by name.
    const heavy =
      (ford && /^f(250|350|450|550|600)(superduty)?$/.test(model)) ||
      (["chevrolet", "gmc", "ram", "dodge"].includes(make) &&
        /(?:2500|3500)(?:hd)?$/.test(model));
    const light =
      (ford &&
        ["f150", "f150lightning", "ranger", "maverick"].includes(model)) ||
      (["chevrolet", "gmc", "ram", "dodge"].includes(make) &&
        /1500(?:classic)?$/.test(model)) ||
      (make === "toyota" && ["tacoma", "tundra"].includes(model));
    return { beds: [], duty: heavy ? "heavy" : light ? "light" : "" };
  }
  function liner(v) {
    if (!v.bedFeet) return "";
    if (v.bedFeet <= 5) return "liner-short";
    if (v.bedFeet >= 7.5) return "liner-long";
    if (!v.duty) return "liner-review";
    return v.duty === "heavy" ? "liner-hd" : "liner-standard";
  }
  function permits(v, item) {
    const serviceBody = v.type === "pickup" && v.bodyStyle === "service";
    if (item.vehicle === "service-body") {
      const id = serviceLengths.includes(v.bodyLengthFeet)
        ? "service-body-" + v.bodyLengthFeet
        : "service-body-other";
      return serviceBody && item.id === id;
    }
    if (item.vehicle === "pickup-review")
      return (
        v.type === "pickup" &&
        !v.duty &&
        (item.id === "rust-review" || (!serviceBody && item.id === liner(v)))
      );
    if (item.vehicle !== v.type) return false;
    if (
      serviceBody &&
      (["Bed cover", "Bedliner"].includes(item.category) || item.id === "uv")
    )
      return false;
    if (v.type !== "pickup") return true;
    if (item.category === "Bedliner") return item.id === liner(v);
    if (
      item.category === "Bed cover" ||
      item.category.startsWith("Cover upgrade") ||
      item.id === "uv"
    )
      return Boolean(v.bedFeet);
    if (item.id === "rust-hd") return v.duty === "heavy";
    if (item.id === "rust") return v.duty === "light";
    return true;
  }
  return { profile, permits, cabFor, cabLabel, serviceLengths };
})();
if (typeof module !== "undefined") module.exports = DealerFitment;
