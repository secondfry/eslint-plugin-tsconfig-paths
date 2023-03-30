# eslint-plugin-tsconfig-paths

Converts relative paths to absolute ones

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-tsconfig-paths`:

```sh
npm install eslint-plugin-tsconfig-paths --save-dev
```

## Usage

Add `tsconfig-paths` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
  "plugins": ["tsconfig-paths"]
}
```

Then configure the rules you want to use under the rules section.

```json
{
  "rules": {
    "tsconfig-paths/ensure": 2
  }
}
```

## Rules

<!-- begin auto-generated rules list -->

🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                           | 🔧 |
| :----------------------------- | :- |
| [ensure](docs/rules/ensure.md) | 🔧 |

<!-- end auto-generated rules list -->
