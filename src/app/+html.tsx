import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const basePath = '/syoseijutsu-roku-mobile';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#151714" />
        <meta name="application-name" content="処世術禄" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="処世術禄" />
        <link rel="manifest" href={`${basePath}/manifest.webmanifest`} />
        <link rel="icon" href={`${basePath}/pwa-icon.svg`} />
        <link rel="apple-touch-icon" href={`${basePath}/pwa-icon.svg`} />
        <ScrollViewStyleReset />
        <style>{`
          /*
           * iOS PWA/Safari occasionally reports a shorter dynamic viewport than
           * the physical display.  A height-only root then ends above the home
           * indicator, leaving the page background under the bottom navigation.
           * Anchor the application root to every physical viewport edge instead.
           */
          html {
            width: 100%; height: var(--roku-app-height, 100%); min-height: -webkit-fill-available;
            background: #FFFDF8;
          }
          body {
            width: 100%; height: var(--roku-app-height, 100%); min-height: -webkit-fill-available;
            margin: 0; overflow: hidden; overscroll-behavior: none;
            background: #FFFDF8;
          }
          #root, #root > div {
            position: fixed; inset: 0;
            width: 100%; height: var(--roku-app-height, 100dvh) !important;
            min-height: var(--roku-app-height, 100dvh) !important;
            background: #FFFDF8;
          }
          #roku-launch {
            position: fixed; inset: 0; z-index: 99999; display: grid;
            place-items: center; background: #151714;
            transition: opacity .28s ease, visibility .28s ease;
          }
          #roku-launch.hidden { opacity: 0; visibility: hidden; pointer-events: none; }
          #roku-launch-mark {
            width: 112px; height: 112px; border: 1px solid #C9A85B;
            display: grid; place-items: center; color: #E6CF8A;
            font-family: serif; font-size: 58px; font-weight: 700;
            box-shadow: 0 18px 48px rgba(0,0,0,.28);
          }
          #roku-launch-name { margin-top: 18px; color: #F4F0E7; text-align: center; letter-spacing: .28em; font-family: serif; font-size: 20px; }
        `}</style>
      </head>
      <body>
        <div id="roku-launch" aria-label="処世術禄を起動中">
          <div>
            <div id="roku-launch-mark">禄</div>
            <div id="roku-launch-name">処世術禄</div>
          </div>
        </div>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                /*
                 * iOS standalone PWAs can expose a short visualViewport to
                 * React Native Web even though the physical display is taller.
                 * screen.height is stable in that mode.  Keep the native
                 * root and its first React wrapper at the same physical height
                 * so the navigation reaches the home-indicator safe area.
                 */
                const syncAppHeight = () => {
                  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
                  const visualHeight = window.visualViewport?.height || window.innerHeight;
                  const physicalHeight = standalone ? Math.max(visualHeight, window.screen?.height || 0) : visualHeight;
                  document.documentElement.style.setProperty('--roku-app-height', physicalHeight + 'px');
                };
                syncAppHeight();
                window.addEventListener('resize', syncAppHeight);
                window.visualViewport?.addEventListener('resize', syncAppHeight);

                const hideLaunch = () => document.getElementById('roku-launch')?.classList.add('hidden');
                window.addEventListener('load', () => setTimeout(hideLaunch, 180), { once: true });
                setTimeout(hideLaunch, 2200);

                if (!('serviceWorker' in navigator)) return;
                window.addEventListener('load', async () => {
                  try {
                    const registration = await navigator.serviceWorker.register('${basePath}/sw.js', { scope: '${basePath}/' });
                    await registration.update();
                    setInterval(() => registration.update(), 60 * 60 * 1000);
                    navigator.serviceWorker.addEventListener('controllerchange', () => {
                      if (sessionStorage.getItem('roku-sw-reloaded')) return;
                      sessionStorage.setItem('roku-sw-reloaded', '1');
                      location.reload();
                    });
                  } catch (error) {
                    console.warn('Service worker registration failed', error);
                  }
                }, { once: true });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
