import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq, req) => {
            const isPublic = req.url?.startsWith('/api/setup') || req.url?.startsWith('/api/health');
            if (isPublic) {
              const browserAuth = Boolean(req.headers.authorization);
              proxyReq.removeHeader('authorization');
              console.info(`[api-proxy] ${req.method} ${req.url} public=true browserAuthorizationPresent=${browserAuth} forwardedAuthorization=${Boolean(proxyReq.getHeader('authorization'))}`);
            }
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            delete proxyRes.headers['www-authenticate'];
            if (req.url?.startsWith('/api/setup')) {
              console.info(`[api-proxy] ${req.method} ${req.url} responseStatus=${proxyRes.statusCode}`);
            }
          });
        }
      }
    }
  }
});
