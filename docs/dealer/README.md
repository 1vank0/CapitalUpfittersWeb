# Dealer desk
Open /dealer/desk. Each dealership has its own generated access key and saved rep directory. Staff use the same sign-in with DEALER_ADMIN_KEY. Staff can create cards, rotate keys (revokes current sessions), enter a quote for a dealership, set prices and rebate amounts in dollars, and open drop-off dates.

## Environment
Use a separate Postgres database or schema for each environment. Create the cu_desk schema, apply schema.sql once as its owner, and give the runtime role usage on cu_desk and SELECT, INSERT, UPDATE, DELETE on its tables. Set its search_path to cu_desk, pg_catalog. Set DEALER_DATABASE_URL to the TLS Postgres connection and DEALER_ADMIN_KEY to a unique secret at least 24 characters long. Keep these server-side.

Set RESEND_API_KEY, LEAD_FROM_EMAIL (verified sender) and LEAD_TO_EMAIL (Grok Bot's monitored inbox) on the same deployment. Redeploy after changing environment settings. The staff desk shows unsent notifications and offers a retry. Every message contains the quote ID, dealership, referring salesperson, vehicle, line items, booking and rebate status. A submitted PO or We Owe travels with the email. Use the quote ID to link Shopmonkey follow-up to the dealer record. Drop-off availability is owned by this desk and does not automatically sync to Shopmonkey.

## Operating rules
Bed covers use MSRP. Selecting a Patriot Liner unlocks a configured cover bundle price. Unknown prices stay blank and require shop review. Each saved quote keeps a price and attribution snapshot, and supports dealer, MSRP and price-free printouts. Gross subtotals exclude tax. The job receives one rebate record when booked. Rescheduling preserves credit. Staff review completed jobs for eligibility, approve the amount captured on the quote, and record payment after payout. No funds move automatically. Seeded rebate rates are blank pending shop setup.

## Pickup configuration
Use the VIN decoder for cab style. The form displays the cab when the VIN or a single-cab model rule identifies it. Where the cab is unknown, the form offers the model’s verified box lengths. Unsupported models can use a measured length.

Factory box rules for recent U.S. F-150 and Super Duty pickups follow [Ford F-150 technical specifications](https://www.fromtheroad.ford.com/content/dam/fordmediasite/us/en/library/2026/specs/2026_Ford_F150_Specs.pdf), [Super Duty technical specifications](https://www.fromtheroad.ford.com/content/dam/fordmediasite/us/en/library/2026/specs/2026_Super_Duty_Pickups_Technical_Specifications_FINAL.pdf) and [Ford's 2026 VIN guide](https://vpic.nhtsa.dot.gov/mid/home/displayfile/36bc8391-095b-4e79-b076-b0b8f130dc6e).

Choose Service body for an installed utility body. The length describes that body and travels on the quote, printout and shop notification. Each preset length has its own editable coating price. Custom lengths share a shop-review item. To upgrade an existing database, apply service-body-catalog.sql once. A fresh database receives the same catalog from schema.sql.
