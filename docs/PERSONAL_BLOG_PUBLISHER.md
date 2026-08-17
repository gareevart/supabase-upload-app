# Personal Blog Publisher

This small command-line client publishes posts to `gareev.de` through the already verified `POST /api/blog-posts` endpoint. It is intended for **your personal use**: it reads the API key from your local terminal environment and never writes the key into the repository, post files, or command output.

> **Security rule:** Keep `GAREEV_BLOG_API_KEY` only in local secret storage. Do not add it to `package.json`, Markdown post files, GitHub Actions variables visible in logs, or any `NEXT_PUBLIC_*` environment variable.

## Create a post file

Write the post body in a local Markdown file, for example `my-post.md`:

```markdown
# A useful headline

Write your post content here.
```

## Check a request before sending it

The dry-run command validates the title, slug, file, and payload while redacting the API key. It does not contact gareev.de or create a post.

```bash
npm run publish:blog -- \
  --title "A useful headline" \
  --file ./my-post.md \
  --draft \
  --dry-run
```

## Create an unpublished draft

Export the API key only in the terminal session that will run the command. Draft mode is the default, but it is shown explicitly below for clarity.

```bash
export GAREEV_BLOG_API_KEY='sk_replace_with_your_new_key'

npm run publish:blog -- \
  --title "A useful headline" \
  --file ./my-post.md \
  --excerpt "A short summary for the blog list." \
  --slug "a-useful-headline" \
  --draft
```

The command returns a compact JSON response with the post ID, slug, and `published: false` status. Review the draft in the gareev.de blog interface before making it public.

## Publish immediately

Use `--publish` only when the post is final:

```bash
export GAREEV_BLOG_API_KEY='sk_replace_with_your_new_key'

npm run publish:blog -- \
  --title "A useful headline" \
  --file ./my-post.md \
  --publish
```

## Optional fields

| Option | Purpose |
|---|---|
| `--excerpt "…"` | Adds a brief post summary. |
| `--slug "my-post"` | Sets the URL slug. It may contain only lowercase letters, numbers, and hyphens. |
| `--featured-image "https://…"` | Sets a public featured-image URL. |
| `--hide-featured-image` | Hides the featured image on the post page. |
| `--endpoint "https://…"` | Uses another endpoint, for example a local development server. |
| `--dry-run` | Validates and previews a redacted request without publishing. |

## Rotate the previous test key

The API key shared earlier in this session was used for a controlled live test. Revoke it in the gareev.de profile and create a replacement before using this publishing client.
