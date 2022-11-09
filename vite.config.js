import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'configure-response-headers',
      configureServer: server => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Content-Encoding', 'compress');
          next();
        });
      }
    },
    vue({
      template: { transformAssetUrls }
    }),

    quasar({
      sassVariables: 'src/quasar-variables.sass'
    })
  ]
})
