export function routeParam(value: string | string[] | undefined, name = 'id') {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  throw new Error(`Missing route parameter: ${name}`);
}
