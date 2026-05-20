// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://arr0w.app',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [react(), sitemap()],
});
