import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const BUNDLE_RECOVERY_SCRIPT = `
(function () {
  var recoveryKey = "shoseijutsu_bundle_recovery";

  function recoverFromStaleBundle(src) {
    if (!src || src.indexOf("/_expo/static/js/web/entry-") === -1) return;

    try {
      if (sessionStorage.getItem(recoveryKey) === src) return;
      sessionStorage.setItem(recoveryKey, src);

      var nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("__app_refresh", Date.now().toString());
      window.location.replace(nextUrl.toString());
    } catch (_) {
      window.location.reload();
    }
  }

  window.addEventListener(
    "error",
    function (event) {
      var target = event.target;
      if (target && target.tagName === "SCRIPT") {
        recoverFromStaleBundle(target.src);
      }
    },
    true
  );

  window.setTimeout(function () {
    try {
      sessionStorage.removeItem(recoveryKey);
    } catch (_) {}
  }, 10000);
})();
`;

export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta
          httpEquiv="Cache-Control"
          content="no-cache, no-store, must-revalidate"
        />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: BUNDLE_RECOVERY_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
