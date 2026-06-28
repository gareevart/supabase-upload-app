import type { CSSProperties } from 'react';
import type { ImageProps } from 'next/image';

export default function NextImage({ src, alt, fill, className, style, ...rest }: ImageProps) {
  const resolvedSrc = typeof src === 'string' ? src : '';

  const fillStyle: CSSProperties | undefined = fill
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }
    : undefined;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={{ ...fillStyle, ...style }}
      {...rest}
    />
  );
}
