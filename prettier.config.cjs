/** @type {import("prettier").Config} */
const config = {
  plugins: [
    require.resolve('prettier-plugin-svelte'),
    require.resolve('prettier-plugin-tailwindcss'),
  ],
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'always',
  printWidth: 80,
  tabWidth: 2,
  endOfLine: 'lf',
  semi: true,
  overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }],
};

module.exports = config;