import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, DEFAULT_FILE_NAME, encodeConfig } from '@/core';
import type { NinePatchConfig } from '@/core';
import { buildShareHash, parseShareHash } from './shareLink';

const changed: NinePatchConfig = { ...DEFAULT_CONFIG, contentWidth: 123 };
const encodedChanged = encodeConfig(changed);

/** Base64url of arbitrary JSON, so a test can plant a payload `encodeConfig` would never write. */
const plant = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

describe('buildShareHash', () => {
  it.each([
    ['nothing for the defaults', DEFAULT_CONFIG, DEFAULT_FILE_NAME, ''],
    ['only c for a changed config', changed, DEFAULT_FILE_NAME, `c=${encodedChanged}`],
    ['only n for a custom name', DEFAULT_CONFIG, 'my name', 'n=my%20name'],
    ['both, c first', changed, 'my name', `c=${encodedChanged}&n=my%20name`],
    ['nothing for a blank name', DEFAULT_CONFIG, '   ', ''],
    ['an escaped name', DEFAULT_CONFIG, 'a&b=c#d%e', 'n=a%26b%3Dc%23d%25e'],
  ])('carries %s', (_label, config, name, expected) => {
    expect(buildShareHash(config, name)).toBe(expected);
  });
});

describe('parseShareHash', () => {
  it.each([
    ['an empty hash', ''],
    ['a bare hash mark', '#'],
    ['only unknown parameters', '#x=1&y&z=2'],
    ['an empty config parameter', '#c='],
    ['a blank name', `#n=${encodeURIComponent('   ')}`],
  ])('gives the defaults and no issues for %s', (_label, hash) => {
    expect(parseShareHash(hash)).toEqual({ config: DEFAULT_CONFIG, name: DEFAULT_FILE_NAME, issues: [] });
  });

  it.each([
    ['with the leading hash', `#c=${encodedChanged}&n=button`],
    ['without the leading hash', `c=${encodedChanged}&n=button`],
    ['in the other order', `n=button&c=${encodedChanged}`],
    ['around an unknown parameter', `#z=1&c=${encodedChanged}&n=button`],
    ['from the first of a repeated key', `#c=${encodedChanged}&n=button&n=other&c=${plant({ shape: 'pill' })}`],
  ])('reads config and name %s', (_label, hash) => {
    expect(parseShareHash(hash)).toEqual({ config: changed, name: 'button', issues: [] });
  });

  it.each([
    ['a malformed percent sequence in the name', '#n=%E0%A4%A', 'name'],
    ['a name past the length cap', `#n=${'x'.repeat(101)}`, 'name'],
    ['a config outside the base64url alphabet', '#c=!!!', 'config'],
    ['a config that is not JSON', '#c=aGVsbG8', 'config'],
    ['a config field that is invalid', `#c=${plant({ shape: 'blob' })}`, 'shape'],
  ])('falls back and reports %s', (_label, hash, prefix) => {
    const result = parseShareHash(hash);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].startsWith(prefix)).toBe(true);
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.name).toBe(DEFAULT_FILE_NAME);
  });

  it.each([
    ['a plain name', 'button'],
    ['spaces', 'my button'],
    ['unicode', 'bouton café 九'],
    ['url separators', 'a&b=c#d%e'],
    ['a name at the length cap', 'n'.repeat(100)],
  ])('round trips %s', (_label, name) => {
    expect(parseShareHash(`#${buildShareHash(changed, name)}`)).toEqual({ config: changed, name, issues: [] });
  });
});
