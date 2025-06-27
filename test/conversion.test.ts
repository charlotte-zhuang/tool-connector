import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapUriWithServer, unwrapUri } from '@/main/mcp/conversion';

const serverName = 'myServer';
const originalUri = 'https://example.com/path';

test('wrapUriWithServer and unwrapUri round-trip', () => {
  const wrapped = wrapUriWithServer({ serverName, uri: originalUri });
  const unwrapped = unwrapUri({ uri: wrapped });
  assert.equal(unwrapped.serverName, serverName);
  assert.equal(unwrapped.uri, originalUri);
});

test('wrapUriWithServer leaves invalid URI unchanged', () => {
  const invalidUri = 'not-a-uri';
  const wrapped = wrapUriWithServer({ serverName, uri: invalidUri });
  assert.equal(wrapped, invalidUri);
});

test('unwrapUri returns input for invalid URI', () => {
  const invalidUri = 'not-a-uri';
  const result = unwrapUri({ uri: invalidUri });
  assert.deepEqual(result, { uri: invalidUri });
});

test('unwrapUri returns input when no server prefix is present', () => {
  const uriWithoutServer = 'https://domain-only';
  const result = unwrapUri({ uri: uriWithoutServer });
  assert.deepEqual(result, { uri: uriWithoutServer });
});
