const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const cryptoFile = read('src/lib/social/crypto.ts');
const oauth = read('src/lib/social/oauth-service.ts');
const start = read('src/app/api/v1/social/oauth/[provider]/start/route.ts');
const callback = read('src/app/api/v1/social/oauth/[provider]/callback/route.ts');
const mobile = read('apps/mobile/src/app/social.tsx');

assert.match(cryptoFile, /aes-256-gcm/, 'social credentials must use authenticated encryption');
assert.match(cryptoFile, /randomBytes\(12\)/, 'AES-GCM must use a random IV');
assert.match(cryptoFile, /createHash\('sha256'\)/, 'OAuth state must be hashed before storage');
assert.match(oauth, /state_hash: stateHash/, 'raw OAuth state must not be stored');
assert.match(oauth, /\.is\('consumed_at', null\)/, 'OAuth callback state must be one-time');
assert.match(oauth, /\.gt\('expires_at', now\)/, 'OAuth callback state must be unexpired');
assert.match(oauth, /credential_ciphertext: encryptSocialSecret/, 'provider credentials must be encrypted at rest');
assert.match(oauth, /access_type: 'offline'/, 'YouTube connection must request offline access for scheduler use');
assert.match(oauth, /https:\/\/open\.tiktokapis\.com\/v2\/oauth\/token\//, 'TikTok must use the current v2 token endpoint');
assert.match(oauth, /https:\/\/api\.linkedin\.com\/v2\/userinfo/, 'LinkedIn OIDC identity must use userinfo');
assert.doesNotMatch(start, /clientSecret|accessToken|refreshToken/, 'OAuth start response must not expose credentials');
assert.doesNotMatch(callback, /accessToken|refreshToken|clientSecret/, 'OAuth callback must not expose credentials');
assert.match(mobile, /Linking\.openURL/, 'mobile client must hand authorization to the system browser');
assert.match(mobile, /\/api\/v1\/social\/oauth\/\$\{provider\.id\}\/start/, 'mobile client must start OAuth through Brand Box server');

console.log('Brand Box Mobile Social OAuth security guard passed.');
