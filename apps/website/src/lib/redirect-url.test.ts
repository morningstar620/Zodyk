import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toAbsolute } from './redirect-url';

describe('storefront redirect destinations', () => {
  const request = 'https://store.example/old?email=ada%40example.com';

  it('does not forward visitor parameters to absolute destinations', () => {
    assert.equal(toAbsolute('https://partner.example/landing', request), 'https://partner.example/landing');
    assert.equal(toAbsolute('https://store.example/new', request), 'https://store.example/new');
    assert.equal(toAbsolute('//partner.example/landing', request), 'https://partner.example/landing');
  });

  it('preserves visitor parameters on relative destinations', () => {
    assert.equal(toAbsolute('/new', request), 'https://store.example/new?email=ada%40example.com');
  });

  it('does not overwrite explicit destination parameters', () => {
    assert.equal(toAbsolute('/new?campaign=spring', request), 'https://store.example/new?campaign=spring');
    assert.equal(toAbsolute('https://partner.example/landing?campaign=spring', request), 'https://partner.example/landing?campaign=spring');
  });
});
