const { decodeVIN } = require("../lib/dealer/vin");
const { Pool, types } = require("pg");
const { timingSafeEqual } = require("node:crypto");
const {
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
} = require("../lib/dealer/quotes");
types.setTypeParser(1082, (value) => value);
let pool;
const cookie = "cu_dealer";
const stripDealer = "id,name,contact,email,phone,address";
const adminKey = () => process.env.DEALER_ADMIN_KEY || "";
async function transaction(fn) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const result = await fn(db);
    await db.query("COMMIT");
    return result;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
async function rows(sql, args = [], db = pool) {
  return (await db.query(sql, args)).rows;
}
async function one(sql, args = [], db = pool) {
  return (await rows(sql, args, db))[0];
}
function sessionCookie(res, key, age) {
  res.setHeader(
    "Set-Cookie",
    cookie +
      "=" +
      key +
      "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" +
      age,
  );
}
async function login(req, res, data) {
  const key = field(data.key, "access key", 160);
  const ip = String(
    req.headers["x-vercel-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "unknown",
  ).split(",")[0];
  const hit = await one(
    `INSERT INTO login_attempt VALUES ($1,1,now()) ON CONFLICT(identity) DO UPDATE SET
    attempts=CASE WHEN login_attempt.started<now()-interval '15 minutes' THEN 1 ELSE login_attempt.attempts+1 END,
    started=CASE WHEN login_attempt.started<now()-interval '15 minutes' THEN now() ELSE login_attempt.started END RETURNING attempts`,
    [hash(ip)],
  );
  if (hit.attempts > 25)
    throw new Fault("Too many attempts. Try again in 15 minutes.", 429);
  const admin =
    adminKey().length >= 24 &&
    timingSafeEqual(Buffer.from(hash(adminKey())), Buffer.from(hash(key)));
  const dealer = admin
    ? null
    : await one("SELECT id FROM dealer WHERE key_hash=$1", [hash(key)]);
  if (!admin && !dealer) throw new Fault("Access key was not recognized.", 401);
  const secret = token();
  await rows("INSERT INTO session VALUES ($1,$2,now()+interval '8 hours')", [
    hash(secret),
    dealer?.id || null,
  ]);
  sessionCookie(res, secret, 28800);
  return { signedIn: true };
}
async function history(s, before) {
  const page = await rows(
    `SELECT q.id,q.snapshot,q.created,q.day,q.status,q.credit,q.document->>'filename' AS filename,
    EXISTS(SELECT 1 FROM notice n WHERE n.quote_id=q.id AND n.sent_at IS NULL) AS mail_pending
    FROM quote q WHERE ($1::uuid IS NULL OR q.dealer_id=$1) AND ($2::uuid IS NULL OR (q.created,q.id)<(SELECT created,id FROM quote WHERE id=$2 AND ($1::uuid IS NULL OR dealer_id=$1))) ORDER BY q.created DESC,q.id DESC LIMIT 51`,
    [s.dealer_id, before],
  );
  return { quotes: page.slice(0, 50), more: page.length > 50 };
}
async function state(s) {
  const admin = !s.dealer_id;
  const dealer = admin
    ? null
    : await one("SELECT " + stripDealer + " FROM dealer WHERE id=$1", [
        s.dealer_id,
      ]);
  const { quotes, more } = await history(s, null);
  const slots =
    await rows(`SELECT s.day,s.capacity,(s.capacity-count(q.id))::int AS remaining FROM slot s
    LEFT JOIN quote q ON q.day=s.day AND q.status IN ('scheduled','completed')
    WHERE s.day >= (now() AT TIME ZONE 'America/New_York')::date GROUP BY s.day ORDER BY s.day`);
  const items = await rows("SELECT * FROM item ORDER BY vehicle,category,id");
  return {
    admin,
    dealer,
    quotes,
    more,
    slots,
    items,
    dealers: admin
      ? await rows("SELECT " + stripDealer + " FROM dealer ORDER BY name")
      : [],
    reps: admin
      ? []
      : await rows(
          "SELECT id,name,email FROM rep WHERE dealer_id=$1 ORDER BY name",
          [s.dealer_id],
        ),
  };
}
async function queue(db, q, event) {
  const subject =
    "CU dealer | " + event + " | " + q.snapshot.dealer.name + " | " + q.id;
  const body = JSON.stringify(
    {
      source: "dealer_portal",
      event,
      quoteId: q.id,
      status: q.status,
      appointment: q.day,
      rebateStatus: q.credit,
      document: q.document?.filename || null,
      ...q.snapshot,
    },
    null,
    2,
  );
  await db.query(
    "INSERT INTO notice(quote_id,subject,body) VALUES ($1,$2,$3)",
    [q.id, subject, body],
  );
}
async function deliver(id) {
  const pending = await rows(
    "SELECT n.*,q.document FROM notice n JOIN quote q ON q.id=n.quote_id WHERE quote_id=$1 AND sent_at IS NULL ORDER BY n.id",
    [id],
  );
  if (!process.env.RESEND_API_KEY) return { pending: pending.length };
  for (const n of pending) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(7000),
        headers: {
          Authorization: "Bearer " + process.env.RESEND_API_KEY,
          "Content-Type": "application/json",
          "Idempotency-Key": "dealer-" + n.id,
        },
        body: JSON.stringify({
          from: process.env.LEAD_FROM_EMAIL || "leads@capitalupfitters.com",
          to: [process.env.LEAD_TO_EMAIL || "capitalupfitters@gmail.com"],
          subject: n.subject.replace(/[\r\n]/g, " "),
          text: n.body,
          attachments: n.document
            ? [{ filename: n.document.filename, content: n.document.data }]
            : [],
        }),
      });
      if (!response.ok) break;
      await rows("UPDATE notice SET sent_at=now() WHERE id=$1", [n.id]);
    } catch {
      break;
    }
  }
  return {
    pending: (
      await one(
        "SELECT count(*)::int AS n FROM notice WHERE quote_id=$1 AND sent_at IS NULL",
        [id],
      )
    ).n,
  };
}
async function saveQuote(s, d) {
  const id = uuid(d.id),
    car = vehicle(d.vehicle || {}),
    doc = file(d.document);
  const person = {
    name: field(d.repName, "salesperson name", 120),
    email: email(d.repEmail),
  };
  const po = field(d.po, "PO number", 100, false),
    notes = field(d.notes, "notes", 1600, false);
  const fingerprint = hash(
    JSON.stringify([car, person, po, notes, d.ids, doc]),
  );
  await transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [id]);
    const existing = await one(
      "SELECT dealer_id,request_hash FROM quote WHERE id=$1",
      [id],
      db,
    );
    if (existing) {
      if (
        existing.dealer_id !== s.dealer_id ||
        existing.request_hash !== fingerprint
      )
        throw new Fault("Start a new quote for changed selections.", 409);
      return;
    }
    const dealer = await one(
      "SELECT " + stripDealer + " FROM dealer WHERE id=$1",
      [s.dealer_id],
      db,
    );
    const items = lines(await rows("SELECT * FROM item", [], db), car, d.ids);
    if (!dealer) throw new Fault("Unknown dealer.");
    if (
      !Array.isArray(d.prices) ||
      JSON.stringify(items.map((i) => i.price)) !== JSON.stringify(d.prices)
    )
      throw new Fault(
        "Prices have changed. Reopen Build quote to review the current prices.",
        409,
      );
    const rep = await one(
      `INSERT INTO rep(dealer_id,name,email) VALUES ($1,$2,$3)
      ON CONFLICT(dealer_id,lower(name),lower(email)) DO UPDATE SET name=EXCLUDED.name RETURNING id,name,email`,
      [dealer.id, person.name, person.email],
      db,
    );
    const snap = {
      dealer,
      rep,
      vehicle: car,
      items,
      po,
      notes,
      rebateCents: items.reduce((a, i) => a + (i.rebate || 0), 0),
    };
    const q = await one(
      "INSERT INTO quote(id,dealer_id,rep_id,snapshot,document,request_hash) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [id, dealer.id, rep.id, snap, doc, fingerprint],
      db,
    );
    await queue(db, q, "Quote submitted");
  });
  return { id, ...(await deliver(id)) };
}
async function change(s, d) {
  const id = uuid(d.id),
    admin = s.dealer_id === null;
  await transaction(async (db) => {
    const q = await one(
      "SELECT * FROM quote WHERE id=$1 AND ($2::uuid IS NULL OR dealer_id=$2) FOR UPDATE",
      [id, s.dealer_id],
      db,
    );
    if (!q) throw new Fault("Quote not found.", 404);
    let status = q.status,
      credit = q.credit,
      day = q.day;
    if (d.action === "book") {
      if (!["quoted", "scheduled"].includes(status))
        throw new Fault("This job is closed.", 409);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.day))
        throw new Fault("Select an open drop-off day.");
      if (day === d.day && status === "scheduled") return;
      const slot = await one(
        "SELECT capacity FROM slot WHERE day=$1 AND day >= (now() AT TIME ZONE 'America/New_York')::date FOR UPDATE",
        [d.day],
        db,
      );
      const used = await one(
        "SELECT count(*)::int AS n FROM quote WHERE day=$1 AND status IN ('scheduled','completed') AND id<>$2",
        [d.day, id],
        db,
      );
      if (!slot || used.n >= slot.capacity)
        throw new Fault(
          "That day is full or unavailable. Choose another.",
          409,
        );
      status = "scheduled";
      credit = "pending";
      day = d.day;
    } else if (
      d.action === "cancel" &&
      ["scheduled", "quoted"].includes(status)
    ) {
      status = "cancelled";
      credit = "cancelled";
    } else if (admin && d.action === "complete" && status === "scheduled") {
      status = "completed";
      credit = q.snapshot.rebateCents ? "review" : "no rebate";
    } else if (admin && d.action === "earn" && credit === "review") {
      credit = "earned";
    } else if (admin && d.action === "paid" && credit === "earned") {
      credit = "paid";
    } else throw new Fault("This change is unavailable.", 409);
    const updated = await one(
      "UPDATE quote SET status=$2,credit=$3,day=$4 WHERE id=$1 RETURNING *",
      [id, status, credit, day],
      db,
    );
    await queue(db, updated, d.action);
  });
  return { id, ...(await deliver(id)) };
}
async function manage(d) {
  if (d.action === "dealer") {
    const key = token();
    const values = [
      field(d.name, "dealership"),
      field(d.contact, "contact"),
      email(d.email),
      field(d.phone, "phone"),
      field(d.address, "address", 300, false),
      hash(key),
    ];
    await rows(
      "INSERT INTO dealer(name,contact,email,phone,address,key_hash) VALUES ($1,$2,$3,$4,$5,$6)",
      values,
    );
    return { key };
  }
  if (d.action === "rotate") {
    const key = token(),
      id = uuid(d.id);
    await transaction(async (db) => {
      if (
        !(await one(
          "UPDATE dealer SET key_hash=$2 WHERE id=$1 RETURNING id",
          [id, hash(key)],
          db,
        ))
      )
        throw new Fault("Dealer not found.");
      await db.query("DELETE FROM session WHERE dealer_id=$1", [id]);
    });
    return { key };
  }
  if (d.action === "price") {
    const p = [
      d.id,
      ...["msrp", "dealer_price", "bundle_price", "rebate"].map((k) =>
        money(d[k]),
      ),
    ];
    if (
      !(await one(
        "UPDATE item SET msrp=$2,dealer_price=$3,bundle_price=$4,rebate=$5 WHERE id=$1 RETURNING id",
        p,
      ))
    )
      throw new Fault("Unknown service.");
    return {};
  }
  if (d.action === "slot") {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(d.day) ||
      !Number.isInteger(d.capacity) ||
      d.capacity < 1 ||
      d.capacity > 100
    )
      throw new Fault("Check day and capacity.");
    await rows(
      "INSERT INTO slot VALUES ($1,$2) ON CONFLICT(day) DO UPDATE SET capacity=EXCLUDED.capacity",
      [d.day, d.capacity],
    );
    return {};
  }
  if (d.action === "retry") return deliver(uuid(d.id));
  throw new Fault("Unknown action.");
}
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  try {
    if (!process.env.DEALER_DATABASE_URL || adminKey().length < 24)
      throw new Fault(
        "Dealer desk setup is incomplete. Call (301) 304-1419.",
        503,
      );
    if (!pool)
      pool = new Pool({
        connectionString: process.env.DEALER_DATABASE_URL,
        max: 3,
        connectionTimeoutMillis: 8000,
        idleTimeoutMillis: 10000,
      });
    if (req.method !== "POST") throw new Fault("POST required.", 405);
    const origin = req.headers.origin;
    if (!origin || new URL(origin).host !== req.headers.host)
      throw new Fault("Open the dealer desk on this site.", 403);
    if (!/^application\/json\b/i.test(req.headers["content-type"] || ""))
      throw new Fault("JSON required.", 415);
    const d = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!d || typeof d !== "object") throw new Fault("Invalid request.");
    let result;
    if (d.action === "login") result = await login(req, res, d);
    else {
      const secret =
        (req.headers.cookie || "").match(/(?:^|;\s*)cu_dealer=([\w-]+)/)?.[1] ||
        "";
      const s = await one(
        "SELECT dealer_id FROM session WHERE token=$1 AND expires>now()",
        [hash(secret)],
      );
      if (!s) throw new Fault("Enter your access key.", 401);
      if (d.action === "decodeVIN") result = await decodeVIN(d.vin);
      else if (d.action === "state") result = await state(s);
      else if (d.action === "older") result = await history(s, uuid(d.before));
      else if (d.action === "document") {
        const q = await one(
          "SELECT document FROM quote WHERE id=$1 AND ($2::uuid IS NULL OR dealer_id=$2)",
          [uuid(d.id), s.dealer_id],
        );
        if (!q?.document) throw new Fault("Document not found.", 404);
        result = q.document;
      } else if (d.action === "dealerProfile" && !s.dealer_id) {
        const id = uuid(d.id);
        result = {
          dealer: await one(
            "SELECT " + stripDealer + " FROM dealer WHERE id=$1",
            [id],
          ),
          reps: await rows(
            "SELECT id,name,email FROM rep WHERE dealer_id=$1 ORDER BY name",
            [id],
          ),
        };
      } else if (d.action === "logout") {
        await rows("DELETE FROM session WHERE token=$1", [hash(secret)]);
        sessionCookie(res, "", 0);
        result = {};
      } else if (d.action === "quote")
        result = await saveQuote(
          { dealer_id: s.dealer_id || uuid(d.dealerId) },
          d,
        );
      else if (
        ["book", "cancel", "complete", "earn", "paid"].includes(d.action)
      )
        result = await change(s, d);
      else if (s.dealer_id === null) result = await manage(d);
      else throw new Fault("Staff access required.", 403);
    }
    res.end(JSON.stringify(result));
  } catch (e) {
    res.statusCode = e.status || 500;
    res.end(
      JSON.stringify({
        error: e.status
          ? e.message
          : "Could not complete the request. Please try again.",
      }),
    );
  }
};
