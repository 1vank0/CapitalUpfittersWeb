# Capital Upfitters Homepage Redesign Report

## Executive recommendation

The homepage should move from a long, text-heavy collection of gradient cards to a shorter, image-led editorial sequence. The strongest existing asset is the site's conversion architecture; the weakest is its visual proof and card typography. The redesign therefore keeps every route and business section while replacing placeholder surfaces with a coherent illustrative media system.

## Why this direction fits

Vehicle upfitting is both technical and aspirational. Personal buyers want confidence that their vehicle will look considered; fleet and government buyers want evidence of fitment discipline, consistency, and readiness. A restrained black/porcelain/aged-metal system can serve both without splitting the brand into retail and commercial personalities.

The user-selected Next.js reference validates an image-first hero, a compact fit finder, asymmetric audience modules, and a featured-service mosaic. Apple-aligned typography and spacing soften that structure: sentence case, tighter display tracking, concise copy, fewer decorative labels, and larger areas of calm negative space.

## Media governance

The previous gallery wiring is not suitable for homepage use: its authoring source is dormant, the external endpoint is stale, and remote values are interpolated unsafely. The replacement is a same-origin registry and validated serverless response. This centralizes media paths, disclosure, alt text, dimensions, crops, and responsive variants while leaving HTML path-free.

Generated images are labeled illustrative. They support art direction and service explanation but cannot prove that Capital Upfitters completed a depicted project. Approved real project media can replace any semantic slot later without changing homepage markup.

## Expected improvements

- Stronger first-load offer and image contrast.
- Better card scanning through sentence case, tighter tracking, consistent padding, and aligned actions.
- Lower below-fold memory and transfer cost with responsive AVIF/WebP derivatives and native lazy loading, while retaining the current homepage video for this owner-approved phase.
- Easier maintenance through one gallery registry instead of image paths scattered through HTML/CSS.
- Less page fatigue through varied module scale and a shorter overall rhythm.

## Release posture

This work should ship to a Vercel Preview on a dedicated branch. Production remains unchanged until desktop/mobile visual review, media disclosure review, lead-flow regression testing, and explicit approval.
