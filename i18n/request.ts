import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, LOCALE_COOKIE, locales, type Locale } from "./config";

/**
 * Bahasa dipilih lewat cookie (tanpa prefix URL). Untuk menambah bahasa:
 * 1. tambahkan kode ke `locales` di i18n/config.ts
 * 2. buat messages/<kode>.json dengan kunci yang sama seperti messages/id.json
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale = fromCookie && locales.includes(fromCookie) ? fromCookie : defaultLocale;
  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages, timeZone: "Asia/Jakarta" };
});
