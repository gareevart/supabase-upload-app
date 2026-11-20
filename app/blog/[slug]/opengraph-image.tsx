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

function getCoverUrl(value: string | null): string | null {
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

    // Restrict server-side image fetches to this site and Vercel Blob.
    if (coverUrl.protocol !== 'https:' || (!allowedOrigins.has(coverUrl.origin) && !isVercelBlob)) {
      return null
    }

    return coverUrl.href
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

  const coverUrl = getCoverUrl(post.featured_image)
  if (coverUrl) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex' }}>
          <img
            src={coverUrl}
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
