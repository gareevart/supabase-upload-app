'use client';

import React, { useEffect, useState } from 'react';

interface PreviewData {
  url: string;
  image: string;
  title: string;
  description: string | null;
  hostname: string;
}

const previewCache = new Map<string, PreviewData | null>();
const pendingRequests = new Map<string, Promise<PreviewData | null>>();

async function fetchPreview(url: string): Promise<PreviewData | null> {
  if (previewCache.has(url)) return previewCache.get(url) ?? null;
  const existing = pendingRequests.get(url);
  if (existing) return existing;

  const request = fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
    .then((response) => (response.ok ? response.json() : { preview: null }))
    .then((data) => {
      const preview = (data.preview as PreviewData | null) ?? null;
      previewCache.set(url, preview);
      return preview;
    })
    .catch(() => {
      previewCache.set(url, null);
      return null;
    })
    .finally(() => pendingRequests.delete(url));

  pendingRequests.set(url, request);
  return request;
}

interface LinkPreviewProps {
  href: string;
  children: React.ReactNode;
}

export function LinkPreview({ href, children }: LinkPreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(previewCache.get(href) ?? null);
  const [resolved, setResolved] = useState(previewCache.has(href));

  useEffect(() => {
    let active = true;
    fetchPreview(href).then((data) => {
      if (!active) return;
      setPreview(data);
      setResolved(true);
    });
    return () => {
      active = false;
    };
  }, [href]);

  if (!resolved || !preview) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <a
      className="markdown-link-preview"
      href={preview.url}
      target="_blank"
      rel="noreferrer"
      aria-label={preview.title}
    >
      <img className="markdown-link-preview__image" src={preview.image} alt="" loading="lazy" />
      <span className="markdown-link-preview__body">
        <strong className="markdown-link-preview__title">{preview.title}</strong>
        {preview.description && <span className="markdown-link-preview__description">{preview.description}</span>}
        <span className="markdown-link-preview__hostname">{preview.hostname}</span>
      </span>
    </a>
  );
}
