import nextConfig from 'eslint-config-next'
import { createRequire } from 'module'
import path from 'path'

const require = createRequire(import.meta.url)

// 1. Polyfill legacy RuleContext methods on FileContext for ESLint 10 compatibility with plugins
try {
  const fileContextPath = path.resolve('node_modules/eslint/lib/linter/file-context.js')
  const { FileContext } = require(fileContextPath)
  if (FileContext && !FileContext.prototype.getFilename) {
    FileContext.prototype.getFilename = function () {
      return this.filename
    }
    FileContext.prototype.getPhysicalFilename = function () {
      return this.physicalFilename
    }
    FileContext.prototype.getCwd = function () {
      return this.cwd
    }
    FileContext.prototype.getSourceCode = function () {
      return this.sourceCode
    }
  }
} catch (e) {
  // Ignore fallback
}

// 2. Polyfill addGlobals on typescript-eslint scopeManager for ESLint 10
for (const config of nextConfig) {
  if (config.languageOptions?.parser?.parseForESLint) {
    const origParse = config.languageOptions.parser.parseForESLint
    config.languageOptions.parser.parseForESLint = function (...args) {
      const result = origParse.apply(this, args)
      if (result?.scopeManager && !result.scopeManager.addGlobals) {
        result.scopeManager.addGlobals = function (names) {
          const globalScope = this.scopes[0] || this.globalScope
          for (const name of names) {
            if (!globalScope.set.has(name)) {
              const v = { name, references: [], defs: [], scope: globalScope }
              globalScope.set.set(name, v)
              globalScope.variables.push(v)
            }
          }
        }
      }
      return result
    }
  }
}

const config = [
  ...nextConfig,
  {
    rules: {
      // Experimental React 19 compiler rules bundled with react-hooks 7
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
    },
  },
]

export default config
