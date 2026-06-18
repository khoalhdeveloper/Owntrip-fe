const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Android dev client on this setup fails to parse Metro's multipart progress
// response, leaving the app stuck on "Reloading...". Disable multipart so the
// bundle is served as a normal response.
try {
  const multipartResponse = require('metro/src/Server/MultipartResponse');
  const MultipartResponse = multipartResponse.default ?? multipartResponse;
  MultipartResponse.wrapIfSupported = (_req, res) => res;
} catch {}

// Explicitly ensure TypeScript extensions are in the resolver's sourceExts
// This resolves the issue where Metro fails to find .ts specs inside third-party packages in node_modules
if (!config.resolver.sourceExts.includes('ts')) {
  config.resolver.sourceExts.push('ts');
}
if (!config.resolver.sourceExts.includes('tsx')) {
  config.resolver.sourceExts.push('tsx');
}

module.exports = config;
