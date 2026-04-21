module.exports = {
  plugins: ['@firebase/security-rules'],
  extends: ['plugin:@firebase/security-rules/recommended'],
  rules: {
    '@firebase/security-rules/no-unprotected-writes': 'error',
  },
};
