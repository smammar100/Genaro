/**
 * Features built but switched off for the Phase 1 go-live.
 *
 * Like MVP_HIDDEN_HREFS (sidebar-config), these hide UI only: routes,
 * services, tables and storage are untouched, so switching a feature back on
 * is flipping its flag here.
 */

/**
 * Vehicle photos. Hidden per the client (21 Oct 2026): photos are uploaded
 * only once adverts are fed to AutoTrader and the website, which Phase 1 does
 * not do. Off, the vehicle page has no Photos tab or links to it, and adverts
 * are not marked incomplete for having no photos.
 */
export const PHOTOS_ENABLED = false;
