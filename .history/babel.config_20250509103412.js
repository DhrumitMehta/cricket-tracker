module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          alias: {
            '@supabase/supabase-js': '@supabase/supabase-js',
            '@supabase/postgrest-js': '@supabase/postgrest-js',
            stream: 'stream-browserify',
            crypto: 'crypto-browserify',
            http: 'stream-http',
            https: 'https-browserify',
            os: 'os-browserify/browser',
            path: 'path-browserify',
            zlib: 'browserify-zlib',
            assert: 'assert',
            events: 'events',
            net: 'react-native-tcp',
            tls: 'react-native-tcp',
          },
        },
      ],
    ],
  };
}; 