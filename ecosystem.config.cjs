module.exports = {
  apps: [
    {
      name: 'pagos-rapidos',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=pagosrapidos --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        GEMINI_API_KEY: 'AIzaSyAFKz2hFq3TB5tXESNfxTNSYjM6Fa7o00Q'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      error_file: '/tmp/pagos-rapidos-error.log',
      out_file: '/tmp/pagos-rapidos-out.log'
    }
  ]
}
