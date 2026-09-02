const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const lifecycle = read('src/lib/social/connection-lifecycle.ts');
const refreshRoute = read('src/app/api/v1/social/connections/[connectionId]/refresh/route.ts');
const disconnectRoute = read('src/app/api/v1/social/connections/[connectionId]/route.ts');
const providersRoute = read('src/app/api/v1/social/providers/route.ts');
const mobile = read('apps/mobile/src/app/social.tsx');

assert.match(lifecycle, /decryptSocialSecret/, 'credential decrypt must stay server-side');
assert.match(lifecycle, /encryptSocialSecret/, 'refreshed credentials must be re-encrypted before storage');
assert.match(lifecycle, /\.eq\('user_id', userId\)/, 'connection mutations must be owner-scoped');
assert.match(lifecycle, /https:\/\/open\.tiktokapis\.com\/v2\/oauth\/token\//, 'TikTok refresh must use OAuth v2 token endpoint');
assert.match(lifecycle, /grant_type: 'refresh_token'/, 'refresh flows must use refresh-token grant');
assert.match(lifecycle, /https:\/\/oauth2\.googleapis\.com\/token/, 'YouTube refresh must use Google OAuth token endpoint');
assert.match(lifecycle, /https:\/\/www\.linkedin\.com\/oauth\/v2\/accessToken/, 'LinkedIn refresh must use LinkedIn OAuth token endpoint');
assert.match(lifecycle, /provider === 'meta'\) return false/, 'Meta must not invent a refresh-token flow');
assert.match(lifecycle, /https:\/\/open\.tiktokapis\.com\/v2\/oauth\/revoke\//, 'TikTok disconnect should attempt provider revoke');
assert.match(lifecycle, /https:\/\/oauth2\.googleapis\.com\/revoke/, 'Google disconnect should use the official revoke endpoint');
assert.match(lifecycle, /if \(\(count \|\| 0\) <= 1\)/, 'Google grant revoke must be limited to the last YouTube connection');
assert.match(lifecycle, /\.delete\(\)[\s\S]*\.eq\('id', connectionId\)[\s\S]*\.eq\('user_id', userId\)/, 'local connection must be deleted with owner scope');
assert.doesNotMatch(refreshRoute, /accessToken|refreshToken|credential_ciphertext/, 'refresh route must never return credentials');
assert.doesNotMatch(disconnectRoute, /accessToken|refreshToken|credential_ciphertext/, 'disconnect route must never return credentials');
assert.match(providersRoute, /credential_ciphertext/, 'provider status may inspect ciphertext only server-side');
assert.doesNotMatch(providersRoute, /credentialCiphertext/, 'provider response must not expose credential ciphertext');
assert.match(mobile, /\/api\/v1\/social\/connections\/\$\{account\.id\}\/refresh/, 'mobile refresh must go through Brand Box server');
assert.match(mobile, /method: 'DELETE'/, 'mobile disconnect must go through authenticated server delete route');
assert.match(mobile, /Alert\.alert/, 'disconnect must require an explicit user confirmation in the app');
assert.doesNotMatch(mobile, /accessToken|refreshToken|credential_ciphertext/, 'mobile code must not handle provider credentials');

console.log('Brand Box Mobile Social lifecycle security guard passed.');
