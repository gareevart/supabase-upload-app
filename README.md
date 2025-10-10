This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

### 🤖 AI-Powered Chat with Image Understanding
- Chat interface with YandexGPT integration
- **NEW**: Image analysis using Yandex Vision API
  - Automatic text extraction (OCR) from images
  - Image content classification
  - Context-aware responses based on image content
- File attachments support (images, PDFs, documents)
- Reasoning mode for step-by-step analysis
- Multiple AI model selection

### 📝 Blog Management
- Create and edit blog posts with rich text editor
- Image upload and management
- Tag system
- Public and private posts

### 📢 Broadcasting System
- Send emails to subscribers
- Broadcast groups management
- Scheduling support

### 🔐 Authentication
- Supabase authentication
- Role-based access control
- Protected routes

## Image Understanding Setup

To enable image analysis in chat:

1. **Configure Yandex Cloud**:
   - Create a Yandex Cloud account
   - Set up a service account with `ai.vision.user` role
   - Generate API key

2. **Add environment variables** to `.env.local`:
   ```env
   YANDEX_API_KEY=your_api_key
   YANDEX_FOLDER_ID=your_folder_id
   ```

3. **Restart the server**

For detailed setup instructions, see [IMAGE_UNDERSTANDING_SETUP.md](./docs/IMAGE_UNDERSTANDING_SETUP.md)

For complete technical documentation, see [FINAL_SUMMARY_IMAGE_UNDERSTANDING.md](./docs/FINAL_SUMMARY_IMAGE_UNDERSTANDING.md)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
