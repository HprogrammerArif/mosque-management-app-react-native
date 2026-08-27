const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle's Expo-SQLite migrator imports the generated .sql files directly
// (src/data/migrations/migrations.js) — Metro needs to know to bundle them as source.
config.resolver.sourceExts.push('sql');

module.exports = config;
