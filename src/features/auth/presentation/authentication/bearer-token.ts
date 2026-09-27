/** Reads one Bearer credential for the authentication middleware. */
export function readBearerToken(header: string | undefined): string | undefined {
  const match = header?.match(/^Bearer +(?<token>[A-Za-z0-9._~+/-]+=*)$/i);
  const [matchedHeader] = match ?? [];
  // JavaScript's $ anchor can match before a final newline.
  return matchedHeader === header ? match?.groups?.token : undefined;
}
