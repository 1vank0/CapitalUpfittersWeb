import Link from 'next/link'

export default function JobNotFound() {
  return <main id="main" className="page-shell empty-state"><h1>This job is not available.</h1><p>Only verified, published jobs appear in this preview.</p><Link className="button" href="/gallery">Back to the gallery</Link></main>
}
