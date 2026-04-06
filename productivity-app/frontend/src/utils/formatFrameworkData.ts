import type { Framework } from '../db';

/**
 * Renders goal `data` using the framework's key definitions.
 * Legacy `frameworkText` is used only when no framework keys exist.
 */
export function formatFrameworkDataDisplay(
  fw: Pick<Framework, 'keys'> | null | undefined,
  data: Record<string, string>
): string {
  if (fw?.keys?.length) {
    return fw.keys
      .map((k) => {
        const v = (data[k.key] ?? '').trim();
        return `${k.label || k.key}: ${v || '—'}`;
      })
      .join('\n');
  }
  const legacy = (data.frameworkText ?? '').trim();
  return legacy || '';
}
