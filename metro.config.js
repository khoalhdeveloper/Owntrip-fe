const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Explicitly ensure TypeScript extensions are in the resolver's sourceExts
// This resolves the issue where Metro fails to find .ts specs inside third-party packages in node_modules
if (!config.resolver.sourceExts.includes('ts')) {
  config.resolver.sourceExts.push('ts');
}
if (!config.resolver.sourceExts.includes('tsx')) {
  config.resolver.sourceExts.push('tsx');
}

module.exports = config;
