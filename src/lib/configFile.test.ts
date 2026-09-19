import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, DEFAULT_FILE_NAME, serializeConfigDocument } from '@/core';
import { configFileName, MAX_IMPORT_BYTES, MAX_NAME_LENGTH, readConfigText } from './configFile';

function readOk(text: string) {
  const result = readConfigText(text);
  if (!result.ok) throw new Error(`expected this text to parse: ${text}`);
  return result;
}

describe('configFileName', () => {
  it.each([
    ['a plain name', 'button', 'button.9patch.json'],
    ['a name with illegal characters', 'my/asset:v2', 'my_asset_v2.9patch.json'],
    ['a blank name', '   ', `${DEFAULT_FILE_NAME}.9patch.json`],
    ['a name that already carries the png suffix', 'button.9.png', 'button.9patch.json'],
  ])('names the file for %s', (_label, name, expected) => {
    expect(configFileName(name)).toBe(expected);
  });
});

describe('readConfigText', () => {
  it('reads back a document written by serializeConfigDocument', () => {
    const config = { ...DEFAULT_CONFIG, contentWidth: 123 };
    expect(readConfigText(serializeConfigDocument('button', config))).toEqual({
      ok: true,
      name: 'button',
      config,
      issues: [],
    });
  });

  it.each([
    ['text that is not JSON', 'not json at all'],
    ['an empty file', ''],
    ['a JSON array', '[1, 2, 3]'],
    ['a JSON string', '"button"'],
    ['a document whose config is not an object', '{ "version": 1, "name": "x", "config": 5 }'],
  ])('rejects %s', (_label, text) => {
    expect(readConfigText(text)).toEqual({ ok: false });
  });

  it.each([
    ['an invalid field', '{ "config": { "shape": "blob" } }', 'shape'],
    ['a version it does not know', '{ "version": 9, "config": {} }', 'version'],
    ['a name of the wrong type', '{ "name": 5, "config": {} }', 'name'],
  ])('keeps the defaults and reports %s', (_label, text, prefix) => {
    const result = readOk(text);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].startsWith(prefix)).toBe(true);
    expect(result.config).toEqual(DEFAULT_CONFIG);
  });

  it('takes a bare config, with the default name and no issues', () => {
    const result = readOk('{ "contentWidth": 123 }');
    expect(result.name).toBe(DEFAULT_FILE_NAME);
    expect(result.config.contentWidth).toBe(123);
    expect(result.issues).toEqual([]);
  });

  it('keeps a name exactly at the cap', () => {
    const name = 'x'.repeat(MAX_NAME_LENGTH);
    expect(readOk(serializeConfigDocument(name, DEFAULT_CONFIG))).toMatchObject({ name, issues: [] });
  });

  it('replaces a name past the cap with the default, and says so', () => {
    const result = readOk(serializeConfigDocument('x'.repeat(MAX_NAME_LENGTH + 1), DEFAULT_CONFIG));
    expect(result.name).toBe(DEFAULT_FILE_NAME);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].startsWith('name')).toBe(true);
  });

  it('caps an import at 256 KiB', () => {
    expect(MAX_IMPORT_BYTES).toBe(256 * 1024);
  });
});
