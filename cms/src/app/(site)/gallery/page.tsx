import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublishedContent } from '@/lib/content'
import { BeforeAfter } from '@/components/BeforeAfter'
import { GalleryGrid } from '@/components/GalleryGrid'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Installation gallery',
  description: 'Approved installation stories and before-and-after photography from Capital Upfitters.',
  alternates: { canonical: 'https://www.capitalupfitters.com/gallery' },
  robots: { index: false, follow: false },
}

export default async function GalleryPage() {
  const { jobs } = await getPublishedContent()
  return <main id="main" className="page-shell">
    <header className="page-intro"><p className="eyebrow">The installation gallery</p><h1>Real work.<br />Every detail matters.</h1><p className="intro">Before, after, and the decisions in between. Explore approved installations and the details that made each job its own.</p></header>
    {jobs.length ? <>
      <section className="gallery-section" aria-labelledby="transformations-heading"><div className="section-heading"><h2 id="transformations-heading">Before &amp; after</h2><p>See what changed.</p></div><div className="transformation-grid">{jobs.slice(0, 4).map(job => <article key={job.id}><BeforeAfter before={job.before} after={job.after} title={job.title} /><h3><Link href={`/gallery/${job.slug}`}>{job.title} <span aria-hidden="true">↗</span></Link></h3></article>)}</div></section>
      <GalleryGrid jobs={jobs} />
    </> : <section className="empty-state"><h2>No approved jobs in staging yet.</h2><p>Publish a verified job with real before-and-after photographs and installation-specific notes to see it here. Drafts and incomplete records are not shown.</p><Link className="text-link" href="/admin/collections/jobs">Review jobs in the admin ↗</Link></section>}
  </main>
}
