/**
 * Upload policy for media files.
 *
 * The browser-supplied MIME type is not trusted: the stored type is derived
 * from the file signature. SVG, HTML, and XML are rejected because the public
 * media URL would otherwise serve them as active content.
 */

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaValidationError';
  }
}

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'application/pdf',
] as const;

const ALLOWED = new Set<string>(ALLOWED_UPLOAD_MIME_TYPES);

/** Upper bound for decoded image pixels. A small compressed file can decode much larger. */
export const MAX_INPUT_PIXELS = 50_000_000;

/** Options applied to every sharp decode so crafted images cannot exhaust memory. */
export const SHARP_INPUT_OPTIONS = {
  limitInputPixels: MAX_INPUT_PIXELS,
  failOn: 'error' as const,
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const DANGEROUS_EXTENSION = /\.(?:svgz?|xhtml?|html?|xht|shtml|xml|xsl|xslt)$/i;
const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
};

function ascii(buffer: Buffer, start: number, end: number): string {
  return buffer.toString('ascii', start, end);
}

/** Detect an allowed file type from its magic bytes. */
export function detectUploadMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (buffer.length >= PNG_SIGNATURE.length && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return 'image/png';
  }

  if (buffer.length >= 6) {
    const signature = ascii(buffer, 0, 6);
    if (signature === 'GIF87a' || signature === 'GIF89a') return 'image/gif';
  }

  if (
    buffer.length >= 12 &&
    ascii(buffer, 0, 4) === 'RIFF' &&
    ascii(buffer, 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  if (buffer.length >= 12 && ascii(buffer, 4, 8) === 'ftyp') {
    const brand = ascii(buffer, 8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }

  if (buffer.length >= 5 && ascii(buffer, 0, 5) === '%PDF-') {
    return 'application/pdf';
  }

  return null;
}

export interface ValidateMediaUploadInput {
  buffer: Buffer;
  filename: string;
  declaredMimeType?: string | null;
}

/**
 * Validate an uploaded file and return the trusted MIME type to store.
 * Throws MediaValidationError for unsupported, mismatched, or active content.
 */
export function validateMediaUpload(input: ValidateMediaUploadInput): { mimeType: string } {
  if (!Buffer.isBuffer(input.buffer) || input.buffer.length === 0) {
    throw new MediaValidationError('File is empty');
  }

  if (DANGEROUS_EXTENSION.test(input.filename)) {
    throw new MediaValidationError('SVG, HTML, and XML uploads are not allowed');
  }

  const detected = detectUploadMimeType(input.buffer);
  if (!detected) {
    throw new MediaValidationError('Unsupported file type');
  }

  if (!ALLOWED.has(detected)) {
    throw new MediaValidationError(`Unsupported file type: ${detected}`);
  }

  const rawDeclared = (input.declaredMimeType ?? '').split(';')[0]?.trim().toLowerCase();
  const declared = rawDeclared ? (MIME_ALIASES[rawDeclared] ?? rawDeclared) : '';
  if (declared && declared !== 'application/octet-stream' && declared !== detected) {
    throw new MediaValidationError('File content does not match the declared type');
  }

  return { mimeType: detected };
}

/** Reject images whose decoded dimensions exceed the configured pixel limit. */
export function assertImageWithinPixelLimit(
  width: number | null | undefined,
  height: number | null | undefined,
): void {
  if (!width || !height) {
    throw new MediaValidationError('Unable to read image dimensions');
  }

  if (width * height > MAX_INPUT_PIXELS) {
    throw new MediaValidationError(
      `Image dimensions exceed the ${MAX_INPUT_PIXELS.toLocaleString()} pixel limit`,
    );
  }
}
