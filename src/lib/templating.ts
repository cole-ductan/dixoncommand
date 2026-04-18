/** Replace {{tokens}} in a template body with values. Missing tokens are left as-is. */
export function applyTemplate(body: string, vars: Record<string, string | null | undefined>) {
  return body.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v == null || v === "" ? `{{${key}}}` : String(v);
  });
}
