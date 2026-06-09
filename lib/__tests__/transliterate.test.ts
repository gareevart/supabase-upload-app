import { transliterate } from '../transliterate';

describe('transliterate', () => {
  it('converts basic lowercase Cyrillic to Latin', () => {
    expect(transliterate('привет')).toBe('privet');
  });

  it('converts uppercase Cyrillic to lowercase Latin', () => {
    expect(transliterate('ПРИВЕТ')).toBe('privet');
  });

  it('leaves Latin characters unchanged', () => {
    expect(transliterate('hello')).toBe('hello');
  });

  it('leaves numbers and punctuation unchanged', () => {
    expect(transliterate('123 !@#')).toBe('123 !@#');
  });

  it('converts multi-char sequences correctly', () => {
    expect(transliterate('ж')).toBe('zh');
    expect(transliterate('ш')).toBe('sh');
    expect(transliterate('щ')).toBe('shch');
    expect(transliterate('ц')).toBe('ts');
    expect(transliterate('ч')).toBe('ch');
    expect(transliterate('ю')).toBe('yu');
    expect(transliterate('я')).toBe('ya');
    expect(transliterate('ё')).toBe('yo');
  });

  it('drops soft sign', () => {
    expect(transliterate('ь')).toBe('');
    expect(transliterate('мать')).toBe('mat');
  });

  it('drops hard sign', () => {
    expect(transliterate('ъ')).toBe('');
  });

  it('handles mixed Cyrillic and Latin', () => {
    expect(transliterate('React компонент')).toBe('React komponent');
  });

  it('returns empty string for empty input', () => {
    expect(transliterate('')).toBe('');
  });

  it('converts a full sentence correctly', () => {
    expect(transliterate('Новый пост')).toBe('novyy post');
  });
});
