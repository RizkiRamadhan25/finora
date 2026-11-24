export function isLocalHost(host: string) {
  return /^(127\.0\.0\.1|localhost)(:\d{1,5})?$/iu.test(host);
}
