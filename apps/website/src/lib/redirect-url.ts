/** Preserve incoming parameters only for relative, same-origin destinations. */
export function toAbsolute(location: string, requestUrl: string): string {
  const request = new URL(requestUrl);
  const destination = new URL(location, request.origin);
  if (
    location.startsWith('/') &&
    !location.startsWith('//') &&
    destination.origin === request.origin &&
    request.search &&
    !destination.search
  ) {
    destination.search = request.search;
  }
  return destination.toString();
}
