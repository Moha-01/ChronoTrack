import type { NextConfig } from 'next';

/**
 * Auf GitHub Pages liegt die App unter /ChronoTrack, lokal unter /.
 *
 * Bisher hat `actions/configure-pages` den basePath erst in der CI in diese
 * Datei geschrieben. Dadurch war jede basePath-Abhängigkeit lokal unsichtbar
 * und fiel erst nach dem Deploy auf. Jetzt steht sie hier und der
 * Produktionsstand lässt sich mit `GITHUB_PAGES=true npm run build`
 * reproduzieren.
 */
const isPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isPages ? '/ChronoTrack' : '',
  images: {
    // Der statische Export kann nicht serverseitig optimieren.
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
