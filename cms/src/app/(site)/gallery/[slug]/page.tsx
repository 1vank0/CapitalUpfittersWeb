import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublishedContent } from '@/lib/content'
import { BeforeAfter } from '@/components/BeforeAfter'
import { serviceLabel } from '@/components/gallery-types'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }> }
const origin = 'https://www.capitalupfitters.com'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { jobs } = await getPublishedContent()
  const job = jobs.find(job => job.slug === slug)
  if (!job) return { title: 'Job not found', robots: { index: false, follow: false } }
  return { title: job.title, description: job.summary, alternates: { canonical: `${origin}/gallery/${job.slug}` }, robots: { index: false, follow: false }, openGraph: { title: job.title, description: job.summary, images: [{ url: job.after.url, alt: job.after.alt }] } }
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params
  const { jobs, business } = await getPublishedContent()
  const job = jobs.find(job => job.slug === slug)
  if (!job) notFound()
  const canonical = `${origin}/gallery/${job.slug}`
  const photos = [job.before, job.after, ...job.photos].filter((photo, index, all) => all.findIndex(candidate => candidate.id === photo.id) === index)
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CreativeWork', '@id': `${canonical}#job`, url: canonical, name: job.title, description: job.summary, dateCreated: job.date, dateModified: job.updatedAt, image: photos.map(photo => ({ '@type': 'ImageObject', contentUrl: photo.url, caption: photo.alt, width: photo.width, height: photo.height })), isPartOf: job.serviceURLs.map(url => ({ '@id': `${url}#service` })) },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: origin }, { '@type': 'ListItem', position: 2, name: 'Gallery', item: `${origin}/gallery` }, { '@type': 'ListItem', position: 3, name: job.title, item: canonical } ] },
  ] }
  return <main id="main" className="page-shell job-detail">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/gallery">Gallery</Link><span aria-hidden="true">/</span><span aria-current="page">{job.title}</span></nav>
    <header className="page-intro"><p className="eyebrow">{job.services.map(serviceLabel).join(' · ')}</p><h1>{job.title}</h1><p className="intro">{job.summary}</p></header>
    <BeforeAfter before={job.before} after={job.after} title={job.title} priority />
    <dl className="job-facts"><div><dt>Vehicle</dt><dd>{job.vehicle.year} {job.vehicle.make} {job.vehicle.model}</dd></div><div><dt>Service</dt><dd>{job.services.map(serviceLabel).join(', ')}</dd></div><div><dt>Completed</dt><dd><time dateTime={job.date}>{new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(job.date))}</time></dd></div>{business?.address && <div><dt>Shop</dt><dd>{business.address.city}, {business.address.state}</dd></div>}</dl>
    <section className="process-section" aria-labelledby="install-details"><h2 id="install-details">Inside this installation</h2><ol>{job.processNotes.map((note, index) => <li key={index}><span className="process-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><p>{note}</p></li>)}</ol></section>
    <section className="gallery-section" aria-labelledby="photos-heading"><div className="section-heading"><h2 id="photos-heading">A closer look</h2><p>From this installation.</p></div><div className="detail-photos">{photos.map(photo => <figure key={photo.id}><Image src={photo.url} alt={photo.alt} width={photo.width} height={photo.height} sizes="(max-width: 700px) 100vw, 50vw" />{photo.caption && <figcaption>{photo.caption}</figcaption>}</figure>)}</div></section>
    <section className="job-cta"><p className="eyebrow">Your vehicle. Your use case.</p><h2>What are you planning?</h2><p>Tell the shop what you need. The quote link opens the live website with this service selected.</p><a className="button" href={job.quoteURL}>Get a quote for your vehicle ↗</a><div className="service-links">{job.serviceURLs.map((url, index) => <a href={url} key={url}>Explore {serviceLabel(job.services[index] || 'this service')} ↗</a>)}</div></section>
  </main>
}
