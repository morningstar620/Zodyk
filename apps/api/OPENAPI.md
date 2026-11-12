# API route inventory

`openapi.json` is a generated OpenAPI 3.1 route inventory for the routes mounted
under `/api/v1`. It records methods and path parameters from `src/routes/v1.ts`.
It is a starting point, not a complete client contract: request bodies, query
parameters, authentication requirements, response status codes and schemas
still need to be documented against the handlers. Wildcard path parameters
represent slash-separated paths.

After changing a `mount(router, ...)` declaration, regenerate and verify it:

```sh
node apps/api/scripts/generate-openapi.mjs
node apps/api/scripts/generate-openapi.mjs --check
node --test apps/api/scripts/generate-openapi.test.mjs
```

The generator stops if it cannot parse a mount declaration. Page and media
listing filters and the media upload form are documented; other endpoint
details still require review. The committed file
describes the route table in this branch; independently developed branches can
add or change routes and must regenerate the inventory when integrated.
