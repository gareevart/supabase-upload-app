# Infrastructure Design Brief covers

For every issue, first write an English excerpt of at most 500 characters. Generate one landscape 16:9 editorial image from that exact excerpt using the built-in image generation tool and the style reference at docs/assets/infrastructure-brief-style-reference.jpeg.

## Visual direction

Electric violet #6E35FF, near-black #090518, cobalt #0753C7, magenta #DA43CF, lavender-white #EEEBF8. Use smooth gradients, fine grain/dithering, strong perspective, and simple monumental geometric or architectural forms. Derive the subject from that issue's excerpt. No copied Farcaster logo, name, or symbol; no unrelated company marks, watermark, generic business stock icons, or text. This is a style reference, not an affiliation.

## Files

Commit these together to main in one atomic Git commit:
- content/briefs/YYYY-MM-DD-infrastructure-design-brief.md: H1 title and complete brief.
- content/briefs/YYYY-MM-DD-infrastructure-design-brief.cover.png (or .jpg/.webp): the actual generated cover, at most 2 MiB.
- content/briefs/YYYY-MM-DD-infrastructure-design-brief.cover.json:

```json
{
  "excerpt": "The short description used to generate the image.",
  "image": "YYYY-MM-DD-infrastructure-design-brief.cover.png",
  "prompt": "The full generation prompt, including the exact excerpt."
}
```

Do not add the Markdown file before the image and metadata. GitHub's create_blob (encoding base64), create_tree, create_commit, and update_ref support atomic submission of all files. Keep API keys out of Git and chat. The existing Actions secret GAREEV_BLOG_API_KEY is sufficient; no separate image API key is required for the built-in generator.

The workflow sends the cover as a data URL in featured_image and sets show_featured_image=true. The site API uploads it to Vercel Blob and stores the /api/storage/file URL. The publisher verifies that the returned image URL is a site-hosted asset and serves image content. A post is created with its cover in the same API request. Existing posts without covers can receive one without creating a duplicate. Existing published posts with covers are left unchanged.

Verify the workflow, public post, and public cover before reporting success. If generation fails, do not silently publish without a cover. Report the blocker and keep prepared work available for retry.
