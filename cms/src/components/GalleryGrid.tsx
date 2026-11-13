'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { type GalleryJob, serviceLabel } from './gallery-types'

export function GalleryGrid({ jobs }: { jobs: GalleryJob[] }) {
  const [selected, setSelected] = useState('all')
  const services = [...new Set(jobs.flatMap(job => job.services))].sort()
  const visible = selected === 'all' ? jobs : jobs.filter(job => job.services.includes(selected))
  return (
    <section aria-labelledby="all-jobs-heading" className="gallery-section">
      <div className="section-heading"><h2 id="all-jobs-heading">Explore the work</h2><p role="status" aria-live="polite">{visible.length} {visible.length === 1 ? 'job' : 'jobs'}</p></div>
      <div className="gallery-filters" role="group" aria-label="Filter jobs by service">
        {[['all', 'All services'], ...services.map(service => [service, serviceLabel(service)])].map(([value, label]) => (
          <button key={value} type="button" aria-pressed={selected === value} onClick={() => setSelected(value)}>{label}</button>
        ))}
      </div>
      <div className="job-grid">
        {visible.map(job => (
          <article key={job.id} className="job-card">
            <Link href={`/gallery/${job.slug}`} className="job-card-link">
              <div className="job-card-image"><Image src={job.after.sizes?.card?.url || job.after.url} alt={job.after.alt} fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw" /></div>
              <div className="job-card-copy"><p className="eyebrow">{job.services.map(serviceLabel).join(' · ')}</p><h3>{job.title}</h3><p>{job.summary}</p><span className="text-link">See this installation <span aria-hidden="true">↗</span></span></div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
