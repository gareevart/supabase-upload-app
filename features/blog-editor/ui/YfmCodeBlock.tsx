'use client';

import React from 'react';
import { ClipboardButton } from '@gravity-ui/uikit';

type YfmCodeBlockProps = {
  codeClassName: string;
  highlightedHtml: string;
  text: string;
  copyLabel: string;
  copiedLabel: string;
};

export const YfmCodeBlock: React.FC<YfmCodeBlockProps> = ({
  codeClassName,
  highlightedHtml,
  text,
  copyLabel,
  copiedLabel,
}) => (
  <div className="yfm-clipboard">
    <pre>
      <code
        className={codeClassName || undefined}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    </pre>
    <span className="markdown-renderer__clipboard-mount">
      <ClipboardButton
        text={text}
        view="flat-secondary"
        size="s"
        className="markdown-renderer__clipboard-button"
        tooltipInitialText={copyLabel}
        tooltipSuccessText={copiedLabel}
      />
    </span>
  </div>
);
