/** IANA timezone from the browser (same value sent as `X-User-Timezone` to the API). */
export function getBrowserIanaTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}
