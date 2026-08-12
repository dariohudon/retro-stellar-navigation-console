import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Retro Stellar Astronomy',
    short_name: 'Observatory',
    description: 'Tonight-sky observatory dashboard: aurora, conditions, planets, ISS, NEOs',
    start_url: '/tonight',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#050505',
    theme_color: '#050505',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
