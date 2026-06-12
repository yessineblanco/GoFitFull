import {
  sanitizeForDatabase,
  sanitizeObject,
  sanitizeString,
  sanitizeText,
} from '../sanitize';

describe('sanitization utilities', () => {
  test('removes script and style contents before escaping text', () => {
    const input = '<script>alert("xss")</script><style>body{display:none}</style>Hello <b>world</b> & "friends"';

    expect(sanitizeString(input)).toBe('Hello world &amp; &quot;friends&quot;');
  });

  test('preserves normal punctuation in text mode', () => {
    const input = '<script>alert(1)</script>John\'s <b>goal</b> is: improve!';

    expect(sanitizeText(input)).toBe("John's goal is: improve!");
  });

  test('recursively sanitizes nested objects and objects inside arrays', () => {
    const input = {
      name: '<b>Ada</b>',
      profile: { goal: '<script>bad()</script>Build strength' },
      notes: ['<i>Ready</i>', { text: '<style>x{}</style>Safe' }],
      count: 2,
    };

    expect(sanitizeObject(input)).toEqual({
      name: 'Ada',
      profile: { goal: 'Build strength' },
      notes: ['Ready', { text: 'Safe' }],
      count: 2,
    });
    expect(input.profile.goal).toBe('<script>bad()</script>Build strength');
  });

  test('uses the strict string sanitizer for database values', () => {
    expect(sanitizeForDatabase('<b>A/B</b>')).toBe('A&#x2F;B');
  });
});
