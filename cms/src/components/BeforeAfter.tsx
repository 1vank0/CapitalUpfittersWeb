'use client'

import Image from 'next/image'
import { useId, useState } from 'react'
import type { GalleryMedia } from './gallery-types'

export function BeforeAfter({ before, after, title, priority = false }: {
  before: GalleryMedia; after: GalleryMedia; title: string; priority?: boolean
}) {
  const [position, setPosition] = useState(50)
  const controlID = useId()
  return (
    <figure className="comparison">
      <div className="comparison-images">
        <Image src={after.url} alt={`After: ${after.alt}`} fill sizes="(max-width: 760px) 100vw, 1100px" priority={priority} />
        <div className="comparison-before" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <Image src={before.url} alt={`Before: ${before.alt}`} fill sizes="(max-width: 760px) 100vw, 1100px" priority={priority} />
        </div>
        <span className="comparison-label comparison-label-before" aria-hidden="true">Before</span>
        <span className="comparison-label comparison-label-after" aria-hidden="true">After</span>
        <span className="comparison-divider" style={{ left: `${position}%` }} aria-hidden="true"><span>↔</span></span>
      </div>
      <figcaption className="comparison-control">
        <label htmlFor={controlID}>Compare before and after<span className="sr-only">: {title}</span></label>
        <input id={controlID} type="range" min="0" max="100" value={position}
          aria-valuetext={`${position}% before image visible`}
          onChange={event => setPosition(Number(event.target.value))} />
        <span className="comparison-help">Drag the slider or use the arrow keys.</span>
      </figcaption>
    </figure>
  )
}
