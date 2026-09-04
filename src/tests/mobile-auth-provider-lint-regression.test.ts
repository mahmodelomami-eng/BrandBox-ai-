import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'apps/mobile/src/providers/auth-provider.tsx'), 'utf8');

assert.ok(source.includes('const [loading, setLoading] = useState(publicConfigReady);'));
assert.ok(source.includes('if (!publicConfigReady) return undefined;'));
assert.ok(!source.includes("if (!publicConfigReady) {\n      setSession(null);\n      setLoading(false);\n      return;\n    }"));
assert.ok(source.includes('supabase.auth.getSession()'));
assert.ok(source.includes('supabase.auth.onAuthStateChange'));
assert.ok(source.includes("if (!publicConfigReady) throw new Error('MOBILE_PUBLIC_CONFIG_MISSING')"));

console.log('Mobile auth provider lint regression guard passed.');
