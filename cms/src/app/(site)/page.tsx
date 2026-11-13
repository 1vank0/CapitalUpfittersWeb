import Link from 'next/link'

export default function StagingHome() {
  return <main id="main" className="page-shell home-preview"><p className="eyebrow">Payload CMS · Staging</p><h1>A home for the facts<br />behind the website.</h1><p className="intro">Manage business information, offers, installation stories, media, reviews and FAQs in one place. This isolated preview does not change the live website.</p><div className="button-row"><Link className="button" href="/admin">Open content admin</Link><Link className="button button-secondary" href="/gallery">Preview the gallery</Link></div><aside className="staging-note"><h2>Before anything goes live</h2><p>Content must be verified and published in the CMS. Live-site integration is a separate release, after the measurement baseline and deployment review. No example jobs, prices or holiday hours are seeded here.</p></aside></main>
}
