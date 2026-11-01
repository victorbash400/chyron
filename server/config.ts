export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Configure ${name}.`);
  return value;
}
export const region = () => required("AWS_REGION");
export const origin = () => required("APP_ORIGIN");
