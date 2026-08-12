import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Retro Stellar Astronomy',
    short_name: 'Observatory',
    description: 'Tonight-sky observatory dashboard: aurora, conditions, planets, ISS, NEOs',
    start_url: '/tonight',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F2F1EE',
    theme_color: '#F2F1EE',
    icons: [
      { src: '/icon-192-v2.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512-v2.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
