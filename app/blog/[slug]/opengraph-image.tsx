import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

function getSiteOrigin(): string {
  const deploymentHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL

  return deploymentHost ? `https://${deploymentHost}` : 'https://gareev.de'
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }

  return btoa(binary)
}

async function getCoverDataUrl(value: string | null): Promise<string | null> {
  if (!value) return null

  try {
    const siteOrigin = getSiteOrigin()
    const coverUrl = new URL(value, siteOrigin)
    const allowedOrigins = new Set([
      siteOrigin,
      'https://gareev.de',
      'https://www.gareev.de',
    ])
    const isVercelBlob = coverUrl.hostname.endsWith('.blob.vercel-storage.com')

    // The image route can fetch only this site's own assets or Vercel Blob files.
    if (coverUrl.protocol !== 'https:' || (!allowedOrigins.has(coverUrl.origin) && !isVercelBlob)) {
      return null
    }

    const response = await fetch(coverUrl)
    const mime = response.headers.get('content-type')?.split(';')[0] || ''
    if (!response.ok || !['image/png', 'image/jpeg', 'image/webp'].includes(mime)) {
      return null
    }

    const bytes = await response.arrayBuffer()
    if (bytes.byteLength === 0 || bytes.byteLength > 10 * 1024 * 1024) {
      return null
    }

    return `data:${mime};base64,${toBase64(bytes)}`
  } catch {
    return null
  }
}

function fallbackImage(title: string, excerpt: string | null) {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg,rgb(48, 176, 125) 0%,rgb(8, 86, 70) 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: excerpt ? '40px' : '0',
            lineHeight: 1.2,
            maxWidth: '1000px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {title}
        </div>
        {excerpt && (
          <div
            style={{
              fontSize: 32,
              textAlign: 'center',
              opacity: 0.9,
              maxWidth: '900px',
              lineHeight: 1.4,
              marginTop: '20px',
            }}
          >
            {excerpt}
          </div>
        )}
      </div>
    ),
    { ...size },
  )
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('title, excerpt, featured_image')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (error || !post) {
    return fallbackImage('Post Not Found', null)
  }

  const coverDataUrl = await getCoverDataUrl(post.featured_image)
  if (coverDataUrl) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex' }}>
          <img
            src={coverDataUrl}
            width={size.width}
            height={size.height}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ),
      { ...size },
    )
  }

  const title = truncateText(post.title, 80)
  const excerpt = post.excerpt ? truncateText(post.excerpt, 150) : null
  return fallbackImage(title, excerpt)
}
