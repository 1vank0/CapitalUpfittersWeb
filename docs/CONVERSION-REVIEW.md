# Customer experience and lead conversion review

## Changes in this pass

1. Coordinated service images show what each service relates to. Captions and controls remain HTML. Generated images are visibly classified as illustration and can be replaced with actual shop photos from the backend.
2. Every homepage and directory service card has a direct quote action as well as its detail link. The link carries the existing wizard's exact service ID. Descriptive service-page aliases that did not match the quote tiles now point to supported IDs, including tint, lighting, detailing, wraps and camper shells.
3. The vehicle step explains that a selected service is already carried forward. It reads the wizard's real selection state and never changes the submitted payload.
4. The homepage explains the sequence: needs → written installed quote → approval and scheduling. The quote introduction states that requesting a quote needs no payment. This does not change deposits or mobile hitch prepayment at booking.
5. Shared action and service icons clarify their meaning. Telephone, arrows, receipt, calendar and service symbols remain accessible vector assets; paragraph text is not decorated with unnecessary icons.
6. The retail success view offers shop contact and directions. Existing reference numbers, failure recovery, validations and lead handling remain intact.

## Why these changes

Nielsen Norman Group's [four form principles](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/) emphasize clear structure, expectations and support. Baymard's [product image research](https://baymard.com/research-articles/product-images-descriptive-text) explains why useful imagery and readable descriptions work together. The changes above apply those principles to service selection and quoting; they are design hypotheses, not evidence of a measured increase in this site's close rate.

## Measure after release

Existing analytics already record `cta_click`, `phone_click`, `quote_start`, `quote_step` and confirmed `quote_submit`. Direct card actions use the existing CTA tracking class. No contact details or free-text form content are added to analytics by this pass.

Compare completed quote requests / quote starts by device and service. Separately track qualified leads → written estimates → authorized estimates → booked installs in the shop's existing workflow. Track median first-response time and reasons estimates are declined. A prettier site can improve clarity and lead completion; actual closure also depends on price, response quality, availability and follow-up.

## Next priorities requiring business evidence

- Replace illustrations with consistent actual installation photos and verified project detail.
- Review existing turnaround, exclusivity and warranty statements against current shop policies before release; do not introduce additional claims to manufacture trust.
- Keep service-specific written estimates concise: fitment, exact scope, exclusions, full installed total, parts availability, deposit and next action.
- Use verified reviews from the existing feed. Avoid adding invented testimonials, review counts, project counts or artificial urgency.
