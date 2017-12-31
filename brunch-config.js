// See http://brunch.io for documentation.
exports.files = {
  javascripts: {
    joinTo: {
      'vendor.js': /^(?!app)/, // Files that are not in `app` dir.
      'app.js': /^app/
    }
  },
  stylesheets: {joinTo: 'app.css'}
};

exports.plugins = {
  babel: {
    presets: [['env', {
      targets: {
        browsers: ['last 2 versions', 'safari >= 7']
      }
    }]]
  },
  gzip: {
    paths: {
      javascript: '/',
      stylesheet: '/'
    },
    removeOriginalFiles: false,
    renameGzipFilesToOriginalFiles: false
  }
};
