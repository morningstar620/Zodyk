import { NextResponse } from 'next/server';

const ERROR_PAGE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Site temporarily unavailable</title>
</head>
<body>
  <h1>Site temporarily unavailable</h1>
  <p>Please try again later.</p>
</body>
</html>`;

/** Fixed 500 page. Never include the render error message in the response. */
export function renderErrorResponse(): NextResponse {
  return new NextResponse(ERROR_PAGE_HTML, {
    status: 500,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
