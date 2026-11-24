const config = {
  devIndicators: false,
  poweredByHeader: false,
  distDir: process.env.FINORA_E2E === '1' ? '.next-e2e' : '.next',
};

export default config;
