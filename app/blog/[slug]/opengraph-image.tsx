import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

// Image metadata
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

// Helper function to truncate text
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

// Image generation
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Create Supabase client with service role for server-side access
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Fetch post data
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('title, excerpt')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  // Fallback if post not found
  if (error || !post) {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 64,
            background: 'white',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#333',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          Post Not Found
        </div>
      ),
      {
        ...size,
      }
    )
  }

  // Truncate text to fit in image
  const title = truncateText(post.title, 80)
  const excerpt = post.excerpt ? truncateText(post.excerpt, 150) : null

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
    {
      ...size,
    }
  )
}

