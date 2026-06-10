import {
  hasWidgetBlock,
  parseMessageSegments,
  parseWidgetManifest,
} from '../parseWidgetBlock';

const WIDGET_HTML = `<!--widget-manifest {"title":"Часы","description":"Виджет часов","permissions":["profile","camera"]}-->
<!DOCTYPE html>
<html><head><style>body{margin:0}</style></head><body><div id="clock"></div></body></html>`;

const MESSAGE = `Вот ваш виджет:

\`\`\`widget
${WIDGET_HTML}
\`\`\`

Сохраните его, если всё устраивает.`;

describe('parseWidgetManifest', () => {
  it('parses title, description and permissions from the manifest comment', () => {
    const manifest = parseWidgetManifest(WIDGET_HTML);
    expect(manifest.title).toBe('Часы');
    expect(manifest.description).toBe('Виджет часов');
    expect(manifest.permissions).toEqual(['profile', 'camera']);
  });

  it('drops unknown permissions', () => {
    const manifest = parseWidgetManifest(
      '<!--widget-manifest {"title":"X","permissions":["profile","hack","eval"]}--><html></html>'
    );
    expect(manifest.permissions).toEqual(['profile']);
  });

  it('falls back to defaults without a manifest', () => {
    const manifest = parseWidgetManifest('<html><body>hi</body></html>');
    expect(manifest.title).toBe('Widget');
    expect(manifest.permissions).toEqual([]);
  });

  it('falls back to defaults on broken manifest JSON', () => {
    const manifest = parseWidgetManifest('<!--widget-manifest {broken--><html></html>');
    expect(manifest.title).toBe('Widget');
  });
});

describe('parseMessageSegments', () => {
  it('splits a message into text and widget segments', () => {
    const segments = parseMessageSegments(MESSAGE);
    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({ type: 'text', content: 'Вот ваш виджет:' });
    expect(segments[1].type).toBe('widget');
    if (segments[1].type === 'widget') {
      expect(segments[1].widget.manifest.title).toBe('Часы');
      expect(segments[1].widget.html).toContain('<!DOCTYPE html>');
    }
    expect(segments[2]).toEqual({
      type: 'text',
      content: 'Сохраните его, если всё устраивает.',
    });
  });

  it('returns a single text segment for plain messages', () => {
    const segments = parseMessageSegments('Просто ответ без виджета');
    expect(segments).toEqual([{ type: 'text', content: 'Просто ответ без виджета' }]);
  });

  it('keeps regular code blocks as text', () => {
    const message = 'Пример:\n```js\nconsole.log(1)\n```';
    const segments = parseMessageSegments(message);
    expect(segments).toEqual([{ type: 'text', content: message }]);
  });
});

describe('hasWidgetBlock', () => {
  it('detects widget blocks', () => {
    expect(hasWidgetBlock(MESSAGE)).toBe(true);
    expect(hasWidgetBlock('обычный текст ```js\ncode\n```')).toBe(false);
  });
});
