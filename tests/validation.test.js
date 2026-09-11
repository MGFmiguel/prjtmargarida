import test from 'node:test';
import assert from 'node:assert/strict';
import { validCPF, escapeHTML } from '../js/utils.js';
test('CPF validation accepts formatted valid values and rejects repeated, missing and wrong digits', () => {
  assert.equal(validCPF('529.982.247-25'), true);
  for (const cpf of ['11111111111', '52998224724', '123', '', '529982247250'])
    assert.equal(validCPF(cpf), false);
});
test('user text is escaped before HTML rendering', () => {
  assert.equal(
    escapeHTML('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
  );
});
