const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add custom configuration
config.resolver.extraNodeModules = {
  stream: require.resolve("stream-browserify"),
  crypto: require.resolve("crypto-browserify"),
  http: require.resolve("stream-http"),
  https: require.resolve("https-browserify"),
  os: require.resolve("os-browserify/browser"),
  path: require.resolve("path-browserify"),
  zlib: require.resolve("browserify-zlib"),
  assert: require.resolve("assert/"),
  events: require.resolve("events/"),
  url: require.resolve("url/"),
  fs: false,
  "react-native-tcp": require.resolve("react-native-tcp-socket"),
  "@supabase/supabase-js": require.resolve("@supabase/supabase-js"),
  "@supabase/postgrest-js": require.resolve("@supabase/postgrest-js"),
};

config.resolver.sourceExts = ["jsx", "js", "ts", "tsx", "json", "mjs", "cjs"];

module.exports = config;
