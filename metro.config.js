const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle's Expo-SQLite migrator imports the generated .sql files directly
// (src/data/migrations/migrations.js) — Metro needs to know to bundle them as source.
config.resolver.sourceExts.push('sql');

// Exclude test files from bundling — Expo Router's require.context auto-imports
// everything under app/, which pulls in test-only deps like @testing-library.
config.resolver.blockList = [
  /.*\.test\.[jt]sx?$/,
  /.*\.spec\.[jt]sx?$/,
];

module.exports = config;
