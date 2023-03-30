const path = require('node:path');

const debugFactory = require('debug');
const picomatch = require('picomatch');
const tsconfigPaths = require('tsconfig-paths');

const debug = debugFactory('eslint-plugin-convert-relative-paths:ensure');

const config = tsconfigPaths.loadConfig();
if (config.resultType === 'failed') throw new Error(config.message);
const { absoluteBaseUrl, addMatchAll, mainFields, paths } = config;
const matcher = tsconfigPaths.createMatchPath(
  absoluteBaseUrl,
  paths,
  mainFields,
  addMatchAll,
);

debug('absoluteBaseUrl: %o', absoluteBaseUrl);
debug('paths: %o', paths);

/**
 * @param {Record<string, string[]>} paths tsconfig-paths resolved paths object
 * @param {string} target Normalized expected import path, i.e. `src/utils/summer.js`
 */
const getNewPath = (paths, target) => {
  debug.extend('getNewPath')('target: %o', target);
  for (const [alias, aliasPaths] of Object.entries(paths)) {
    for (const aliasPathRaw of aliasPaths) {
      const aliasPath = path.normalize(aliasPathRaw);
      debug.extend('getNewPath')('aliasPath: %o', aliasPath);
      /** @type {string[]} */
      const result = picomatch.isMatch(target, aliasPath, { bash: true });
      debug.extend('getNewPath')('result: %o', result);
      if (!result) continue;

      /**
       * NOTE(secondfry):
       * i.e.
       * `target === 'src/utils/summer.js'`
       * `alias === '$src/*'`
       * `aliasPath === 'src/*'`
       * `result === 'src/utils/summer.js'`
       */

      /**
       * NOTE(secondfry): if alias does not contain star,
       * it means that glob matched exactly to an input,
       * thus we can just return `alias`.
       */
      if (!aliasPath.endsWith('*')) return alias;
      return target.replace(aliasPath.slice(0, -1), alias.slice(0, -1));
    }
  }
};

/**
 * @param {string} source
 * @param {string[]} extensions
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').CallExpression | import('estree').ImportDeclaration} node
 * @param {import('estree').Literal} target
 * @note return type is inferred
 */
const handle = (source, extensions, context, node, target) => {
  debug('source: %o', source);
  if (typeof source !== 'string') return;
  if (!source.startsWith('.')) return;
  const match = matcher(source, undefined, undefined, extensions);
  debug('match: %o', match);
  if (match) return;
  const filepath = context.getFilename();
  debug('filepath: %o', filepath);
  const absoluteImportPath = path.normalize(
    path.join(path.dirname(filepath), source),
  );
  debug('absoluteImportPath: %o', absoluteImportPath);
  const expectedPath = path.relative(absoluteBaseUrl, absoluteImportPath);
  debug('expectedPath: %o', expectedPath);

  /**
   * NOTE(secondfry): here we have `expectedPath` as some kind of
   * normalized path realtive to `absoluteBaseUrl`.
   *
   * i.e.
   * `absoluteBaseUrl === '/home/secondfry/projects/fisherman'`
   * `filepath === '/home/secondfry/projects/fisherman/src/middleware/cookieMatcher.js'`
   * `source === '../utils/summer.js'`
   * `absoluteImportPath === '/home/secondfry/projects/fisherman/src/utils/summer.js'`
   * `expectedPath === 'src/utils/summer.js'`
   */

  const newPath = getNewPath(paths, expectedPath);
  debug('newPath: %o', newPath);
  if (!newPath) {
    return context.report({
      node,
      messageId: 'aliasMissing',
      data: {
        source,
      },
    });
  }

  return context.report({
    node,
    messageId: 'aliasFound',
    data: {
      source,
      newPath,
    },
    fix: function (fixer) {
      return fixer.replaceText(target, `'${newPath}'`);
    },
  });
};

module.exports = {
  meta: {
    fixable: 'code',
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: {
          extensions: {
            type: 'array',
            items: [
              {
                type: 'string',
              },
            ],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      aliasFound: '{{source}} should be replaced with {{newPath}}',
      aliasMissing: '{{source}} has no alias canditates',
    },
  },
  create: function (/** @type {import('eslint').Rule.RuleContext } */ context) {
    const extensions = context.options[0]?.extensions ?? [
      '.js',
      '.json',
      '.node',
      '.ts',
    ];
    return {
      CallExpression(
        /** @type {import('estree').CallExpression } */ callExpression,
      ) {
        if (callExpression.callee.name !== 'require') return;
        const node = callExpression.arguments[0];
        if (!node) return;
        const source = node.value;
        handle(source, extensions, context, callExpression, node);
      },
      ImportDeclaration(
        /** @type {import('estree').ImportDeclaration } */ importDeclaration,
      ) {
        const source = importDeclaration.source.value;
        handle(
          source,
          extensions,
          context,
          importDeclaration,
          importDeclaration.source,
        );
      },
    };
  },
};
