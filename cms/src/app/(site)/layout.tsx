import type { Metadata } from 'next'
import Link from 'next/link'
import './site.css'

export const metadata: Metadata = {
  title: { default: 'Capital Upfitters | Content staging', template: '%s | Capital Upfitters' },
  robots: { index: false, follow: false },
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="staging-banner">Content staging · Not the live website</div>
    <header className="site-header"><Link href="/" className="site-brand">Capital Upfitters<span>Content preview</span></Link><nav aria-label="Preview navigation"><Link href="/gallery">Gallery</Link><Link href="/admin">Admin</Link></nav></header>
    {children}
    <footer className="site-footer"><span>Capital Upfitters · Content staging</span><a href="https://www.capitalupfitters.com">Visit the live website ↗</a></footer>
  </body></html>
}
