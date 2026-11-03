"use strict";
const el = (id) => document.getElementById(id);
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const cash = (c) =>
  c == null
    ? "Shop quote required"
    : (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const vehicles = {
  pickup: "Pickup truck",
  van: "Cargo van",
  other: "Car, SUV or other",
};
let state,
  tab = "Build quote",
  draftId,
  quoteType = "",
  activeId = "",
  busy = false;
function message(s) {
  el("message").textContent = s;
}
async function api(action, details = {}) {
  const response = await fetch("/api/dealer-desk", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...details }),
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      el("desk").hidden = true;
      el("logout").hidden = true;
      el("login").hidden = false;
    }
    throw Error(data.error || "Desk unavailable.");
  }
  return data;
}
async function refresh() {
  state = await api("state");
  el("desk").hidden = false;
  el("login").hidden = true;
  el("logout").hidden = false;
  el("office").textContent = state.admin
    ? "Capital Upfitters · Staff access"
    : "Capital Upfitters · Dealer services";
  el("title").textContent = state.admin ? "Shop desk" : state.dealer.name;
  const tabs = state.admin
    ? [
        "Jobs & rebates",
        "Build quote",
        "Dealer cards",
        "Pricing",
        "Drop-off days",
      ]
    : ["Build quote", "Quotes & bookings"];
  if (!tabs.includes(tab)) tab = tabs[0];
  el("tabs").innerHTML = tabs
    .map(
      (t) =>
        '<button data-tab="' +
        t +
        '" aria-current="' +
        (t === tab ? "page" : "false") +
        '">' +
        t +
        "</button>",
    )
    .join("");
  render();
}
function input(label, name, type = "text", required = true, value = "") {
  return (
    "<label>" +
    label +
    '<input name="' +
    name +
    '" type="' +
    type +
    '" value="' +
    escapeHtml(value) +
    '" ' +
    (required ? "required" : "") +
    "></label>"
  );
}
const card = (title, body) =>
  '<section class="card"><h2>' + title + "</h2>" + body + "</section>";
const grid = (body) => '<div class="grid">' + body + "</div>";
const button = (action, label, id = "") =>
  '<button type="button" data-action="' +
  action +
  '" data-id="' +
  escapeHtml(id) +
  '">' +
  label +
  "</button>";
const field = (form, name) => form.elements.namedItem(name).value.trim();
function render() {
  const panel = el("panel");
  if (tab === "Build quote") {
    if (state.admin && !state.dealer) {
      panel.innerHTML = card(
        "Quote for a dealership",
        "<p>Select the dealership that referred the job.</p>" +
          state.dealers
            .map((d) => button("onbehalf", escapeHtml(d.name), d.id))
            .join(" "),
      );
      return;
    }
    draftId = crypto.randomUUID();
    quoteType = "";
    panel.innerHTML =
      card(
        "Choose a vehicle type",
        '<div class="grid">' +
          Object.entries(vehicles)
            .map(([k, v]) => button("type", v, k))
            .join("") +
          "</div>",
      ) + '<div id="builder"></div>';
  } else if (tab === "Dealer cards") {
    panel.innerHTML =
      card(
        "Add dealership",
        '<form id="dealerForm">' +
          grid(
            input("Dealership", "name") +
              input("Contact name", "contact") +
              input("Email", "email", "email") +
              input("Phone", "phone", "tel") +
              input("Address", "address", "text", false),
          ) +
          '<button class="primary">Create dealer access key</button></form><div id="issued"></div>',
      ) +
      card(
        "Saved dealerships",
        state.dealers
          .map(
            (d) =>
              '<div class="row"><strong>' +
              escapeHtml(d.name) +
              "</strong><p>" +
              escapeHtml(d.contact) +
              " · " +
              escapeHtml(d.email) +
              "</p>" +
              button("rotate", "Replace access key", d.id) +
              "</div>",
          )
          .join("") || "No dealer cards yet.",
      );
  } else if (tab === "Pricing") {
    panel.innerHTML = card(
      "Service pricing",
      "<p>Enter dollar amounts. Leave unknown prices blank. A cover uses MSRP unless a bedliner is selected and a bundle price is set. Changes apply to future quotes.</p>" +
        state.items
          .map((item) => {
            const amount = (label, key) =>
              "<label>" +
              label +
              '<input type="number" step=".01" min="0" max="1000000" name="' +
              key +
              '" value="' +
              (item[key] == null ? "" : item[key] / 100) +
              '"></label>';
            return (
              '<form class="row priceForm" data-id="' +
              item.id +
              '"><h3>' +
              escapeHtml(item.label) +
              "</h3><small>" +
              vehicles[item.vehicle] +
              "</small>" +
              grid(
                amount("MSRP", "msrp") +
                  (item.category === "Bed cover"
                    ? amount("Cover in liner bundle", "bundle_price")
                    : amount("Dealer price", "dealer_price")) +
                  amount("Potential rep rebate", "rebate"),
              ) +
              "<button>Save price</button></form>"
            );
          })
          .join(""),
    );
  } else if (tab === "Drop-off days") {
    panel.innerHTML =
      card(
        "Open a drop-off day",
        '<form id="slotForm">' +
          grid(
            input("Date", "day", "date") +
              input("Vehicles accepted", "capacity", "number", true, "1"),
          ) +
          '<button class="primary">Save availability</button></form>',
      ) +
      card(
        "Upcoming availability",
        state.slots
          .map(
            (d) =>
              '<div class="row">' +
              d.day +
              " · " +
              d.remaining +
              " of " +
              d.capacity +
              " available</div>",
          )
          .join("") || "No days open.",
      );
  } else {
    panel.innerHTML = card(
      state.admin ? "Jobs & rebates" : "Quotes & bookings",
      "<p>Open a quote to print it, view credit, or manage its drop-off.</p>" +
        input(
          "Find by dealer, salesperson, vehicle, stock or quote number",
          "filter",
          "search",
          false,
        ) +
        '<div id="list"></div><div id="pages"></div>',
    );
    renderList("");
  }
}
function build(type) {
  quoteType = type;
  draftId = crypto.randomUUID();
  document
    .querySelectorAll('[data-action="type"]')
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.id === type)),
    );
  const items = state.items.filter((i) => i.vehicle === type);
  const groups = [...new Set(items.map((i) => i.category))];
  el("builder").innerHTML =
    '<form id="quoteForm">' +
    card(
      vehicles[type],
      grid(
        input("Year", "year", "number") +
          input("Make", "make") +
          input("Model", "model") +
          input(
            type === "pickup"
              ? "Bed length and cab"
              : type === "van"
                ? "Wheelbase and roof height"
                : "Trim or configuration",
            "details",
            "text",
            false,
          ) +
          input("VIN or last eight", "vin", "text", false) +
          input("Stock number", "stock", "text", false),
      ),
    ) +
    card(
      "Select services",
      groups
        .map(
          (g) =>
            "<h3>" +
            escapeHtml(g) +
            "</h3>" +
            grid(
              items
                .filter((i) => i.category === g)
                .map(
                  (i) =>
                    '<label class="choice"><input type="checkbox" name="service" value="' +
                    i.id +
                    '" data-category="' +
                    escapeHtml(g) +
                    '"><span>' +
                    escapeHtml(i.label) +
                    '<br><small data-price="' +
                    i.id +
                    '"></small></span></label>',
                )
                .join(""),
            ),
        )
        .join("") + '<p id="estimate" aria-live="polite"></p>',
    ) +
    card(
      "Who gets referral credit?",
      "<p>" +
        escapeHtml(state.dealer.name) +
        " · New reps are saved for your next quote.</p>" +
        grid(
          '<label>Salesperson<input required name="repName" list="reps" autocomplete="off"><datalist id="reps">' +
            state.reps
              .map(
                (r) =>
                  '<option value="' +
                  escapeHtml(r.name) +
                  '">' +
                  escapeHtml(r.email) +
                  "</option>",
              )
              .join("") +
            "</datalist></label>" +
            input("Salesperson email", "repEmail", "email"),
        ) +
        '<div id="matches"></div>',
    ) +
    card(
      "Dealer paperwork",
      grid(
        input("PO number", "po", "text", false) +
          '<label>Document type<select name="kind"><option>PO</option><option>We Owe</option></select></label>',
      ) +
        '<label>Attach document · PDF, JPG or PNG, up to 2 MB<input type="file" name="doc" accept=".pdf,.jpg,.jpeg,.png"></label><label>Job notes<textarea name="notes" maxlength="1600"></textarea></label>',
    ) +
    '<button class="primary">Submit quote to Capital Upfitters</button></form>';
  updateEstimate();
}
function updateEstimate() {
  const form = el("quoteForm");
  const checked = [...form.querySelectorAll('[name="service"]:checked')].map(
    (b) => b.value,
  );
  const bundle = checked.some(
    (id) => state.items.find((i) => i.id === id).category === "Bedliner",
  );
  let total = 0,
    unknown = false;
  state.items
    .filter((i) => i.vehicle === quoteType)
    .forEach((i) => {
      const bundled =
        i.category === "Bed cover" && bundle && i.bundle_price != null;
      const price =
        i.category === "Bed cover"
          ? bundled
            ? i.bundle_price
            : i.msrp
          : (i.dealer_price ?? i.msrp);
      form.querySelector('[data-price="' + i.id + '"]').dataset.cents =
        price == null ? "" : String(price);
      form.querySelector('[data-price="' + i.id + '"]').textContent =
        cash(price) + (bundled ? " · Bundle" : "");
      if (checked.includes(i.id)) {
        total += price || 0;
        unknown ||= price == null;
      }
    });
  el("estimate").textContent = checked.length
    ? "Dealer subtotal before tax · " +
      cash(total) +
      (unknown ? " + items awaiting shop pricing" : "")
    : "Choose the services to include.";
}
function repMatches(f) {
  const matches = state.reps.filter(
    (r) => r.name.toLowerCase() === field(f, "repName").toLowerCase(),
  );
  f.elements.repEmail.value = matches.length === 1 ? matches[0].email : "";
  el("matches").innerHTML =
    matches.length > 1
      ? matches.map((r) => button("rep", escapeHtml(r.email), r.id)).join("")
      : "";
}
function renderList(query) {
  const term = query.toLowerCase().trim();
  const list = state.quotes.filter((q) =>
    JSON.stringify([
      q.id,
      q.snapshot.rep,
      q.snapshot.dealer.name,
      q.snapshot.vehicle,
      q.status,
      q.credit,
    ])
      .toLowerCase()
      .includes(term),
  );
  el("list").innerHTML =
    list
      .map((q) => {
        const s = q.snapshot,
          v = s.vehicle;
        return (
          '<section class="row"><div class="flex"><button data-action="open" data-id="' +
          q.id +
          '">' +
          escapeHtml(v.year + " " + v.make + " " + v.model) +
          "</button><strong>" +
          escapeHtml(q.status) +
          '</strong></div><p class="meta">' +
          escapeHtml(s.dealer.name + " · " + s.rep.name) +
          (q.day ? " · " + q.day : "") +
          "</p>" +
          (activeId === q.id ? detail(q) : "") +
          "</section>"
        );
      })
      .join("") || "<p>No matching quotes.</p>";
  el("pages").innerHTML = state.more ? button("more", "Load older quotes") : "";
}
function detail(q) {
  const s = q.snapshot,
    open = ["quoted", "scheduled"].includes(q.status);
  const slots = state.slots.filter((d) => d.remaining > 0 || d.day === q.day);
  return (
    '<div class="card"><p>Quote ' +
    q.id +
    "</p><p>" +
    escapeHtml(s.rep.email) +
    " · " +
    escapeHtml(s.vehicle.stock || "No stock number") +
    "</p>" +
    s.items
      .map(
        (i) =>
          '<div class="row">' +
          escapeHtml(i.label) +
          " · " +
          cash(i.price) +
          (i.bundled ? " · Bundle" : "") +
          "</div>",
      )
      .join("") +
    "<p>Referral credit · " +
    escapeHtml(q.credit) +
    (s.rebateCents ? " · " + cash(s.rebateCents) : "") +
    "</p>" +
    (q.filename
      ? button("document", "Download " + escapeHtml(q.filename), q.id)
      : "") +
    (q.mail_pending ? "<p>Shop email awaiting delivery.</p>" : "") +
    '<div class="flex">' +
    ["Dealer price", "MSRP", "No prices"]
      .map((m) => button("print", m, q.id))
      .join("") +
    "</div>" +
    (open && slots.length
      ? '<form class="bookForm row" data-id="' +
        q.id +
        '"><label>Available drop-off day<select name="day" required><option value="">Select a date</option>' +
        slots.map((d) => "<option>" + d.day + "</option>").join("") +
        '</select></label><button class="primary">' +
        (q.day ? "Reschedule" : "Book drop-off") +
        "</button></form>"
      : open
        ? "<p>Call (301) 304-1419 for drop-off availability.</p>"
        : "") +
    '<div class="flex row">' +
    (open ? button("cancel", "Cancel job", q.id) : "") +
    (state.admin && q.status === "scheduled"
      ? button("complete", "Mark completed", q.id)
      : "") +
    (state.admin && q.credit === "review"
      ? button("earn", "Approve rebate", q.id)
      : "") +
    (state.admin && q.credit === "earned"
      ? button("paid", "Record payment", q.id)
      : "") +
    (state.admin && q.mail_pending
      ? button("retry", "Retry email", q.id)
      : "") +
    "</div></div>"
  );
}
function printQuote(q, mode) {
  const s = q.snapshot,
    k = mode === "MSRP" ? "msrp" : "price",
    show = mode !== "No prices";
  const total = s.items.every((i) => i[k] != null)
    ? s.items.reduce((sum, i) => sum + i[k], 0)
    : null;
  el("ticket").innerHTML =
    "<h1>Capital Upfitters</h1><p>12019 Nebel Street · Rockville, MD · (301) 304-1419</p><h2>" +
    escapeHtml(
      mode === "Dealer price"
        ? "Dealer quote"
        : mode === "MSRP"
          ? "Retail quote"
          : "Work summary",
    ) +
    "</h2><p>" +
    q.id +
    " · " +
    escapeHtml(q.created.slice(0, 10)) +
    "</p><section><strong>" +
    escapeHtml(s.dealer.name) +
    "</strong><p>" +
    escapeHtml(s.rep.name + " · " + s.rep.email) +
    "</p><p>" +
    escapeHtml(
      [s.vehicle.year, s.vehicle.make, s.vehicle.model, s.vehicle.details]
        .filter(Boolean)
        .join(" "),
    ) +
    "</p><p>" +
    escapeHtml(
      [s.vehicle.vin, s.vehicle.stock, s.po].filter(Boolean).join(" · "),
    ) +
    "</p></section><table>" +
    s.items
      .map(
        (i) =>
          "<tr><td>" +
          escapeHtml(i.label) +
          "</td>" +
          (show ? "<td>" + cash(i[k]) + "</td>" : "") +
          "</tr>",
      )
      .join("") +
    "</table>" +
    (show
      ? "<p><strong>Subtotal before tax · " + cash(total) + "</strong></p>"
      : "") +
    (q.day ? "<p>Drop-off · " + q.day + "</p>" : "");
  window.print();
}
async function readDocument(f) {
  const file = f.elements.doc.files[0];
  if (!file) return null;
  if (file.size > 2 * 1024 * 1024) throw Error("Choose a file under 2 MB.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(Error("Could not read attachment."));
    reader.onload = () =>
      resolve({ kind: field(f, "kind"), data: reader.result.split(",")[1] });
    reader.readAsDataURL(file);
  });
}
async function submit(f) {
  if (f.id === "loginForm") {
    await api("login", { key: field(f, "key") });
    f.reset();
    await refresh();
    return;
  }
  let result;
  if (f.id === "quoteForm") {
    const vehicle = { type: quoteType };
    for (const k of ["year", "make", "model", "details", "vin", "stock"])
      vehicle[k] = field(f, k);
    result = await api("quote", {
      id: draftId,
      dealerId: state.dealer.id,
      vehicle,
      prices: [...f.querySelectorAll('[name="service"]:checked')].map((box) => {
        const n = f.querySelector('[data-price="' + box.value + '"]').dataset
          .cents;
        return n === "" ? null : Number(n);
      }),
      ids: [...f.querySelectorAll('[name="service"]:checked')].map(
        (x) => x.value,
      ),
      repName: field(f, "repName"),
      repEmail: field(f, "repEmail"),
      po: field(f, "po"),
      notes: field(f, "notes"),
      document: await readDocument(f),
    });
    tab = state.admin ? "Jobs & rebates" : "Quotes & bookings";
    activeId = result.id;
  } else if (f.id === "dealerForm") {
    result = await api("dealer", Object.fromEntries(new FormData(f)));
    await refresh();
    el("issued").textContent = "Copy this dealership key now: " + result.key;
    return;
  } else if (f.classList.contains("priceForm")) {
    const p = { id: f.dataset.id };
    for (const k of ["msrp", "dealer_price", "bundle_price", "rebate"]) {
      const val = f.elements[k]?.value;
      p[k] = val ? Math.round(Number(val) * 100) : null;
    }
    result = await api("price", p);
  } else if (f.id === "slotForm") {
    result = await api("slot", {
      day: field(f, "day"),
      capacity: Number(field(f, "capacity")),
    });
  } else if (f.classList.contains("bookForm")) {
    result = await api("book", { id: f.dataset.id, day: field(f, "day") });
  }
  await refresh();
  message(result?.pending ? "Saved. Shop email is pending." : "Saved.");
}
async function act(b) {
  const id = b.dataset.id,
    a = b.dataset.action;
  if (b.id === "logout") {
    await api("logout");
    location.reload();
    return;
  }
  if (b.dataset.tab) {
    tab = b.dataset.tab;
    await refresh();
    return;
  }
  if (a === "onbehalf") {
    Object.assign(state, await api("dealerProfile", { id }));
    render();
    return;
  }
  if (a === "document") {
    const doc = await api("document", { id });
    const a = document.createElement("a");
    a.href = "data:application/octet-stream;base64," + doc.data;
    a.download = doc.filename;
    a.click();
    return;
  }
  if (a === "type") {
    build(id);
    return;
  }
  if (a === "rep") {
    el("quoteForm").elements.repEmail.value = state.reps.find(
      (r) => r.id === id,
    ).email;
    return;
  }
  if (a === "open") {
    activeId = activeId === id ? "" : id;
    renderList(document.querySelector('[name="filter"]').value);
    return;
  }
  if (a === "more") {
    const next = await api("older", { before: state.quotes.at(-1).id });
    state.quotes.push(...next.quotes);
    state.more = next.more;
    renderList(document.querySelector('[name="filter"]').value);
    return;
  }
  if (a === "print") {
    printQuote(
      state.quotes.find((q) => q.id === id),
      b.textContent,
    );
    return;
  }
  if (["rotate", "cancel", "paid"].includes(a) && !confirm(b.textContent + "?"))
    return;
  const result = await api(a, { id });
  await refresh();
  if (result.key)
    el("issued").textContent = "Replacement access key: " + result.key;
  else message(result.pending ? "Saved. Shop email is pending." : "Saved.");
}
async function run(fn) {
  if (busy) return;
  busy = true;
  message("");
  try {
    await fn();
  } catch (e) {
    message(e.message);
  } finally {
    busy = false;
  }
}
document.addEventListener("submit", (e) => {
  e.preventDefault();
  run(() => submit(e.target));
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b && (b.dataset.action || b.dataset.tab || b.id === "logout"))
    run(() => act(b));
});
document.addEventListener("input", (e) => {
  if (e.target.name === "filter") renderList(e.target.value);
  if (e.target.name === "repName") repMatches(e.target.form);
});
document.addEventListener("change", (e) => {
  if (e.target.name === "service") {
    if (e.target.checked) {
      for (const b of e.target.form.querySelectorAll('[name="service"]'))
        if (b !== e.target && b.dataset.category === e.target.dataset.category)
          b.checked = false;
    }
    updateEstimate();
  }
});
refresh().catch((e) => {
  if (e.message !== "Enter your access key.") message(e.message);
});
