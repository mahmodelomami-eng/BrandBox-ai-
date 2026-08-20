const fs = require('node:fs');
const ts = require('typescript');

process.env.NODE_ENV = 'test';
require.extensions['.ts'] = function transpileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText;
  module._compile(output, filename);
};

require('./credit-payment-hardening.test.ts');
