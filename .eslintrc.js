module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: 'standard-with-typescript',
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'comma-dangle': 'always-multiline',
  }
}
