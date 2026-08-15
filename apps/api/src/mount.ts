import { sendWebResponse, toWebRequest } from './adapters/http';
import type {
  NextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse,
  Router,
} from 'express';

export type WebRouteHandler = (
  request: globalThis.Request,
  params: Record<string, string>,
) => Promise<globalThis.Response>;

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export function mount(
  router: Router,
  method: HttpMethod,
  path: string,
  handler: WebRouteHandler,
): void {
  router[method](path, async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    try {
      const webRequest = toWebRequest(req);
      const params = Object.fromEntries(
        Object.entries(req.params).map(([key, value]) => [
          key,
          Array.isArray(value) ? value.join('/') : String(value ?? ''),
        ]),
      );
      const webResponse = await handler(webRequest, params);
      await sendWebResponse(res, webResponse);
    } catch (error) {
      next(error);
    }
  });
}
