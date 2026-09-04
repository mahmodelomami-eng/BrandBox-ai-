import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const componentPath = path.join(process.cwd(), 'src/components/AdminSettingsHub.jsx');
const source = fs.readFileSync(componentPath, 'utf8');

assert.equal(
  source.includes("throw new Error(payload.error || 'تعذر تحميل الإعدادات.');"),
  false,
  'Admin settings GET failures must not surface raw backend/provider errors.',
);
assert.equal(
  source.includes("throw new Error(payload.error || 'تعذر حفظ الإعدادات.');"),
  false,
  'Admin settings PATCH failures must not surface raw backend/provider errors.',
);
assert.match(source, /if \(!response\.ok\) throw new Error\('تعذر تحميل الإعدادات\.'\);/);
assert.match(source, /if \(!response\.ok\) throw new Error\('تعذر حفظ الإعدادات\.'\);/);

console.log('Admin settings error redaction regression test passed.');
