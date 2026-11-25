import Script from "next/script";
import { GTM_ID, IS_GTM_ENABLED } from "@/lib/gtm";

/**
 * Google Tag Manager loader.
 *
 * This is GTM's own snippet rather than the `gtag('js', ...)` flavour: the
 * `gtm.start` push it performs is what the container's Page View trigger and
 * its timing variables read, and loading gtm.js without it leaves those
 * measuring from the wrong moment.
 *
 * `afterInteractive` keeps the request off the critical path. The games are
 * canvas loops judged in milliseconds, and a blocking third-party script in
 * `<head>` would be felt in the one number this site exists to report.
 */
export function GoogleTagManager() {
  if (!IS_GTM_ENABLED) return null;

  return (
    <Script id="gtm-loader" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
    </Script>
  );
}

/**
 * The no-JavaScript fallback, which must be the first thing inside `<body>`.
 *
 * Every game here needs JavaScript to run, so this will almost never fire — it
 * is kept because GTM's container checks expect it and its absence is reported
 * as a broken install.
 */
export function GoogleTagManagerNoScript() {
  if (!IS_GTM_ENABLED) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
