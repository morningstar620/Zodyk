import {
  activateThemeHandler,
  adminResetPassword,
  bulkSystemRecordsAction,
  createApiTokenHandler,
  createMenu,
  createMetaEntry,
  createMetaObject,
  createPage,
  createRedirect,
  createSystemEntity,
  createSystemRecord,
  createThemeFileHandler,
  createUser,
  createRole,
  deleteApiToken,
  deleteMenu,
  deleteMetaEntry,
  deleteMetaObject,
  archivePage,
  deletePage,
  deleteRedirect,
  deleteRole,
  deleteSystemEntity,
  deleteSystemRecord,
  deleteThemeFileHandler,
  deleteThemeHandler,
  deleteUser,
  duplicateThemeHandler,
  exportThemeHandler,
  getActiveThemeHandler,
  getApiSession,
  getClientIp,
  getCustomizerBootstrapHandler,
  getMenu,
  getMetaEntry,
  getMetaEntryRevision,
  getMetaObject,
  getPage,
  getPageRevision,
  getSeoSettings,
  getRole,
  getStorageHealthHandler,
  getSystemEntity,
  getSystemRecord,
  getThemeCustomizationHandler,
  getThemeFileHandler,
  getThemeHandler,
  getThemeHealthHandler,
  getThemeLanguageHealthHandler,
  getThemeLanguageWorkspaceFilesHandler,
  getThemeLanguageWorkspaceMetadataHandler,
  getThemeR2SyncStatusHandler,
  getThemeSchemasHandler,
  getThemeStorageStatusHandler,
  getThemeTemplateHandler,
  getUser,
  handleApiError,
  listApiTokens,
  listAuditLogs,
  listMenus,
  listMetaEntries,
  listMetaEntryRevisions,
  listMetaObjects,
  listPageOptions,
  listPageRevisions,
  listPages,
  listRedirects,
  listRoles,
  listSystemEntities,
  listSystemRecords,
  listThemePagesHandler,
  listThemeTemplates,
  listThemesHandler,
  listUsers,
  previewThemeHandler,
  publishMetaEntry,
  publishPage,
  restoreMetaEntryRevision,
  restorePageRevision,
  publishThemeHandler,
  putThemeCustomizationHandler,
  putThemeFileHandler,
  putThemeTemplateHandler,
  renderThemeSectionHandler,
  scaffoldTemplateHandler,
  searchLinkTargets,
  syncThemeToR2Handler,
  updateMenu,
  updateMetaEntry,
  updateMetaObject,
  unarchivePage,
  updatePage,
  updateRedirect,
  updateRole,
  updateSeoSettings,
  updateSystemEntity,
  updateSystemRecord,
  updateThemeSettings,
  updateThemeSettingsById,
  updateUser,
  uploadThemeHandler,
} from '@zodyk/api';
import {
  bulkDeleteMediaAssets,
  bulkRestoreMediaAssets,
  bulkTrashMediaAssets,
  deleteMediaAsset,
  emptyMediaTrash,
  getMediaAsset,
  getMediaAssetFile,
  getMediaConfigStatus,
  getMediaStats,
  listMedia,
  listMediaFolders,
  saveMediaAssetAsNew,
  transformMediaAsset,
  updateMediaAsset,
  uploadMediaAsset,
} from '@zodyk/api/media';
import {
  cancelSubscriptionHandler,
  createPaymentHandler,
  createSubscriptionHandler,
  getPaymentHandler,
  getPaymentsSettingsHandler,
  listPaymentsHandler,
  paymentsWebhookHandler,
  refundPaymentHandler,
  updatePaymentsSettingsHandler,
} from '@zodyk/api/payments';
import {
  getLocalizationSettings,
  getMediaSettings,
  updateLocalizationSettings,
  updateMediaSettings,
} from '@zodyk/api/settings';
import { Router } from 'express';
import { mount } from '../mount';

function queryParams(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}

function requireParam(params: Record<string, string>, key: string): string {
  const value = params[key];
  if (!value) {
    throw Object.assign(new Error(`${key} is required`), { status: 400 });
  }
  return value;
}

const SETTINGS_ALLOW = 'GET, PATCH';

/** Settings updates are partial, so only PATCH is accepted. */
function settingsMethodNotAllowed(): Response {
  return Response.json(
    { error: 'Method Not Allowed', allow: ['GET', 'PATCH'] },
    { status: 405, headers: { Allow: SETTINGS_ALLOW } },
  );
}

/** Handlers that include Server-Timing wrap the payload in `{ result, serverTiming }`. */
function jsonFromHandler(raw: unknown): Response {
  if (raw && typeof raw === 'object' && 'result' in raw) {
    const typed = raw as {
      result: unknown;
      serverTiming?: HeadersInit;
      status?: number;
    };
    return Response.json(typed.result, {
      status: typed.status ?? 200,
      headers: typed.serverTiming,
    });
  }
  return Response.json(raw);
}

export function createV1Router(): Router {
  const router = Router();

  // —— Users ——
  mount(router, 'get', '/users', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listUsers(session, queryParams(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/users', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await createUser(session, body, getClientIp(request)), {
        status: 201,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/users/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getUser(session, requireParam(params, 'id')));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/users/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await updateUser(session, requireParam(params, 'id'), body, getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'delete', '/users/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await deleteUser(session, requireParam(params, 'id'), getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/users/:id/reset-password', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await adminResetPassword(session, requireParam(params, 'id'), getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  // —— Roles ——
  mount(router, 'get', '/roles', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listRoles(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/roles', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await createRole(session, body, getClientIp(request)), {
        status: 201,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/roles/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getRole(session, requireParam(params, 'id')));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/roles/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await updateRole(session, requireParam(params, 'id'), body, getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'delete', '/roles/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await deleteRole(session, requireParam(params, 'id'), getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  // —— API tokens ——
  mount(router, 'get', '/api-tokens', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listApiTokens(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/api-tokens', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await createApiTokenHandler(session, body, getClientIp(request)), {
        status: 201,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'delete', '/api-tokens/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await deleteApiToken(session, requireParam(params, 'id'), getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  // —— Audit logs ——
  mount(router, 'get', '/audit-logs', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listAuditLogs(session, queryParams(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  // —— Pages ——
  mount(router, 'get', '/pages', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listPages(session, queryParams(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/pages', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await createPage(session, body, getClientIp(request)), {
        status: 201,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/pages/options', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listPageOptions(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/pages/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getPage(session, requireParam(params, 'id')));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/pages/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await updatePage(session, requireParam(params, 'id'), body, getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'delete', '/pages/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await deletePage(session, requireParam(params, 'id'), getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/pages/:id/publish', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json().catch(() => ({}));
      return Response.json(
        await publishPage(session, requireParam(params, 'id'), body, getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/pages/:id/archive', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await archivePage(session, requireParam(params, 'id'), getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/pages/:id/unarchive', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await unarchivePage(session, requireParam(params, 'id'), getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/pages/:id/revisions', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listPageRevisions(session, requireParam(params, 'id')));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/pages/:id/revisions/:revisionId', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await getPageRevision(
          session,
          requireParam(params, 'id'),
          requireParam(params, 'revisionId'),
        ),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/pages/:id/revisions/:revisionId/restore', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await restorePageRevision(
          session,
          requireParam(params, 'id'),
          requireParam(params, 'revisionId'),
          getClientIp(request),
        ),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  // —— Menus ——
  mount(router, 'get', '/menus', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listMenus(session, queryParams(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/menus', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await createMenu(session, body, getClientIp(request)), {
        status: 201,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/menus/link-targets', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await searchLinkTargets(session, queryParams(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/menus/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getMenu(session, requireParam(params, 'id')));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/menus/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await updateMenu(session, requireParam(params, 'id'), body, getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'delete', '/menus/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await deleteMenu(session, requireParam(params, 'id'), getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  // —— Meta objects ——
  mount(router, 'get', '/meta-objects', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listMetaObjects(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/meta-objects', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await createMetaObject(session, body, getClientIp(request)), {
        status: 201,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/meta-objects/:slug', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getMetaObject(session, requireParam(params, 'slug')));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/meta-objects/:slug', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await updateMetaObject(session, requireParam(params, 'slug'), body, getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'delete', '/meta-objects/:slug', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await deleteMetaObject(session, requireParam(params, 'slug'), getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/meta-objects/:slug/entries', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await listMetaEntries(session, requireParam(params, 'slug'), queryParams(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/meta-objects/:slug/entries', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await createMetaEntry(session, requireParam(params, 'slug'), body, getClientIp(request)),
        { status: 201 },
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/meta-objects/:slug/entries/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await getMetaEntry(session, requireParam(params, 'slug'), requireParam(params, 'id')),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/meta-objects/:slug/entries/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await updateMetaEntry(
          session,
          requireParam(params, 'slug'),
          requireParam(params, 'id'),
          body,
          getClientIp(request),
        ),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'delete', '/meta-objects/:slug/entries/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await deleteMetaEntry(
          session,
          requireParam(params, 'slug'),
          requireParam(params, 'id'),
          getClientIp(request),
        ),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/meta-objects/:slug/entries/:id/revisions', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await listMetaEntryRevisions(
          session,
          requireParam(params, 'slug'),
          requireParam(params, 'id'),
        ),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(
    router,
    'get',
    '/meta-objects/:slug/entries/:id/revisions/:revisionId',
    async (request, params) => {
      try {
        const session = await getApiSession(request);
        return Response.json(
          await getMetaEntryRevision(
            session,
            requireParam(params, 'slug'),
            requireParam(params, 'id'),
            requireParam(params, 'revisionId'),
          ),
        );
      } catch (error) {
        return handleApiError(error);
      }
    },
  );

  mount(
    router,
    'post',
    '/meta-objects/:slug/entries/:id/revisions/:revisionId/restore',
    async (request, params) => {
      try {
        const session = await getApiSession(request);
        return Response.json(
          await restoreMetaEntryRevision(
            session,
            requireParam(params, 'slug'),
            requireParam(params, 'id'),
            requireParam(params, 'revisionId'),
            getClientIp(request),
          ),
        );
      } catch (error) {
        return handleApiError(error);
      }
    },
  );

  mount(router, 'post', '/meta-objects/:slug/entries/:id/publish', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json().catch(() => ({}));
      return Response.json(
        await publishMetaEntry(
          session,
          requireParam(params, 'slug'),
          requireParam(params, 'id'),
          body,
          getClientIp(request),
        ),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  // —— System entities ——
  mount(router, 'get', '/system-entities', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listSystemEntities(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/system-entities', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await createSystemEntity(session, body, getClientIp(request)), {
        status: 201,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/system-entities/:slug', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getSystemEntity(session, requireParam(params, 'slug')));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/system-entities/:slug', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await updateSystemEntity(session, requireParam(params, 'slug'), body, getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'delete', '/system-entities/:slug', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await deleteSystemEntity(session, requireParam(params, 'slug'), getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/system-entities/:slug/records', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await listSystemRecords(session, requireParam(params, 'slug'), queryParams(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/system-entities/:slug/records', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await createSystemRecord(session, requireParam(params, 'slug'), body, getClientIp(request)),
        { status: 201 },
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/system-entities/:slug/records/bulk', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await bulkSystemRecordsAction(
          session,
          requireParam(params, 'slug'),
          body,
          getClientIp(request),
        ),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/system-entities/:slug/records/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await getSystemRecord(session, requireParam(params, 'slug'), requireParam(params, 'id')),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/system-entities/:slug/records/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await updateSystemRecord(
          session,
          requireParam(params, 'slug'),
          requireParam(params, 'id'),
          body,
          getClientIp(request),
        ),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'delete', '/system-entities/:slug/records/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await deleteSystemRecord(
          session,
          requireParam(params, 'slug'),
          requireParam(params, 'id'),
          getClientIp(request),
        ),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  // —— Settings ——
  mount(router, 'get', '/settings/media', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getMediaSettings(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/settings/media', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await updateMediaSettings(session, body, getClientIp(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'put', '/settings/media', async () => settingsMethodNotAllowed());

  mount(router, 'get', '/settings/payments', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getPaymentsSettingsHandler(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/settings/payments', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await updatePaymentsSettingsHandler(session, body, getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'put', '/settings/payments', async () => settingsMethodNotAllowed());

  mount(router, 'get', '/settings/seo', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getSeoSettings(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/settings/seo', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await updateSeoSettings(session, body, getClientIp(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'put', '/settings/seo', async () => settingsMethodNotAllowed());

  mount(router, 'get', '/settings/localization', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getLocalizationSettings(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/settings/localization', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await updateLocalizationSettings(session, body, getClientIp(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'put', '/settings/localization', async () => settingsMethodNotAllowed());

  mount(router, 'get', '/redirects', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listRedirects(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/redirects', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await createRedirect(session, body, getClientIp(request)), {
        status: 201,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/redirects/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await updateRedirect(session, requireParam(params, 'id'), body, getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'delete', '/redirects/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await deleteRedirect(session, requireParam(params, 'id'), getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  // —— Storage ——
  mount(router, 'get', '/storage/health', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getStorageHealthHandler(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  // —— Payments ——
  mount(router, 'get', '/payments', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listPaymentsHandler(session, queryParams(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/payments', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await createPaymentHandler(session, body, getClientIp(request)), {
        status: 201,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/payments/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getPaymentHandler(session, requireParam(params, 'id')));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/payments/:id/refund', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json().catch(() => ({}));
      return Response.json(
        await refundPaymentHandler(session, requireParam(params, 'id'), body, getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/payments/subscriptions', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await createSubscriptionHandler(session, body, getClientIp(request)), {
        status: 201,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/payments/subscriptions/:id/cancel', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await cancelSubscriptionHandler(session, requireParam(params, 'id'), getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/payments/webhooks/:gateway', async (request, params) => {
    try {
      const result = await paymentsWebhookHandler(requireParam(params, 'gateway'), request);
      return Response.json({ received: true, ...result });
    } catch (error) {
      return handleApiError(error);
    }
  });

  // —— Media ——
  mount(router, 'get', '/media', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listMedia(session, queryParams(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/media/config', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getMediaConfigStatus(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/media/folders', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listMediaFolders(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/media/stats', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getMediaStats(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/media/upload', async (request) => {
    try {
      const session = await getApiSession(request);
      const formData = await request.formData();
      return Response.json(await uploadMediaAsset(session, formData, getClientIp(request)), {
        status: 201,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/media/bulk-delete', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await bulkDeleteMediaAssets(session, body, getClientIp(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/media/bulk-trash', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await bulkTrashMediaAssets(session, body, getClientIp(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/media/bulk-restore', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await bulkRestoreMediaAssets(session, body, getClientIp(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/media/empty-trash', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await emptyMediaTrash(session, getClientIp(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/media/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getMediaAsset(session, requireParam(params, 'id')));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/media/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await updateMediaAsset(session, requireParam(params, 'id'), body, getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'delete', '/media/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(
        await deleteMediaAsset(session, requireParam(params, 'id'), getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/media/:id/file', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const variants = new Set(['original', 'webp', 'avif']);
      const rawVariant = new URL(request.url).searchParams.get('variant') ?? 'webp';
      const variant = variants.has(rawVariant)
        ? (rawVariant as 'original' | 'webp' | 'avif')
        : 'webp';
      const { body, mimeType } = await getMediaAssetFile(
        session,
        requireParam(params, 'id'),
        variant,
      );
      return new Response(new Uint8Array(body), {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'private, no-store',
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/media/:id/transform', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await transformMediaAsset(session, requireParam(params, 'id'), body, getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/media/:id/save-as-new', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await saveMediaAssetAsNew(session, requireParam(params, 'id'), body, getClientIp(request)),
        { status: 201 },
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  // —— Themes ——
  mount(router, 'get', '/themes', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listThemesHandler(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/themes/active', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getActiveThemeHandler(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/themes/storage', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getThemeStorageStatusHandler(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/themes/health', async (request) => {
    try {
      const session = await getApiSession(request);
      const themeId = new URL(request.url).searchParams.get('themeId') ?? undefined;
      return Response.json(await getThemeHealthHandler(session, themeId));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/themes/templates', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listThemeTemplates(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/themes/pages', async (request) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await listThemePagesHandler(session));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/themes/activate', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await activateThemeHandler(session, body, getClientIp(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/themes/publish', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await publishThemeHandler(session, body, getClientIp(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/themes/duplicate', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await duplicateThemeHandler(session, body));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/themes/scaffold', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await scaffoldTemplateHandler(session, body));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/themes/upload', async (request) => {
    try {
      const session = await getApiSession(request);
      const formData = await request.formData();
      return Response.json(await uploadThemeHandler(session, formData, getClientIp(request)), {
        status: 201,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/themes/settings', async (request) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(await updateThemeSettings(session, body, getClientIp(request)));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/themes/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getThemeHandler(session, requireParam(params, 'id')));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'delete', '/themes/:id', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await deleteThemeHandler(session, requireParam(params, 'id')));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/themes/:id/export', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const { buffer, filename } = await exportThemeHandler(session, requireParam(params, 'id'));
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/themes/:id/r2-sync', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await getThemeR2SyncStatusHandler(session, requireParam(params, 'id')));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/themes/:id/r2-sync', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return Response.json(await syncThemeToR2Handler(session, requireParam(params, 'id')));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/themes/:id/files', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const path = new URL(request.url).searchParams.get('path');
      if (!path) return Response.json({ error: 'path query required' }, { status: 400 });
      return Response.json(await getThemeFileHandler(session, requireParam(params, 'id'), path));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'put', '/themes/:id/files', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await putThemeFileHandler(session, requireParam(params, 'id'), body, getClientIp(request)),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/themes/:id/files', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await createThemeFileHandler(
          session,
          requireParam(params, 'id'),
          body,
          getClientIp(request),
        ),
        { status: 201 },
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'delete', '/themes/:id/files', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const path = new URL(request.url).searchParams.get('path');
      if (!path) return Response.json({ error: 'path query required' }, { status: 400 });
      return Response.json(
        await deleteThemeFileHandler(
          session,
          requireParam(params, 'id'),
          path,
          getClientIp(request),
        ),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/themes/:id/language/health', async (request, params) => {
    try {
      const session = await getApiSession(request);
      return jsonFromHandler(
        await getThemeLanguageHealthHandler(session, requireParam(params, 'id')),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/themes/:id/language/workspace', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const includeHealth = new URL(request.url).searchParams.get('includeHealth') === 'true';
      return jsonFromHandler(
        await getThemeLanguageWorkspaceMetadataHandler(session, requireParam(params, 'id'), {
          includeHealth,
        }),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/themes/:id/language/workspace/files', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = (await request.json()) as { paths?: string[] };
      const paths = body.paths;
      if (!Array.isArray(paths)) {
        return Response.json({ error: 'paths array required' }, { status: 400 });
      }
      return Response.json(
        await getThemeLanguageWorkspaceFilesHandler(session, requireParam(params, 'id'), paths),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/themes/:id/preview', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return jsonFromHandler(await previewThemeHandler(session, requireParam(params, 'id'), body));
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/themes/:id/schemas', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const searchParams = new URL(request.url).searchParams;
      const scope = searchParams.get('scope') === 'all' ? 'all' : undefined;
      const typesParam = searchParams.get('types');
      const sectionTypes = typesParam ? typesParam.split(',').filter(Boolean) : undefined;
      return Response.json(
        await getThemeSchemasHandler(session, requireParam(params, 'id'), {
          scope,
          sectionTypes,
        }),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'post', '/themes/:id/sections/render', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return jsonFromHandler(
        await renderThemeSectionHandler(session, requireParam(params, 'id'), body),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'patch', '/themes/:id/settings', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await updateThemeSettingsById(
          session,
          requireParam(params, 'id'),
          body,
          getClientIp(request),
        ),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/themes/:id/customizations', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const searchParams = new URL(request.url).searchParams;
      const resourceType = searchParams.get('resourceType');
      const resourceId = searchParams.get('resourceId');
      if (!resourceType || !resourceId) {
        return Response.json({ error: 'resourceType and resourceId required' }, { status: 400 });
      }
      return Response.json(
        await getThemeCustomizationHandler(
          session,
          requireParam(params, 'id'),
          resourceType,
          resourceId,
        ),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'put', '/themes/:id/customizations', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const body = await request.json();
      return Response.json(
        await putThemeCustomizationHandler(session, requireParam(params, 'id'), body),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/themes/:id/customizer-bootstrap', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const pathname = new URL(request.url).searchParams.get('pathname') ?? undefined;
      return Response.json(
        await getCustomizerBootstrapHandler(session, requireParam(params, 'id'), { pathname }),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'get', '/themes/:id/templates/*path', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const templatePath = requireParam(params, 'path');
      return Response.json(
        await getThemeTemplateHandler(session, requireParam(params, 'id'), templatePath),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  mount(router, 'put', '/themes/:id/templates/*path', async (request, params) => {
    try {
      const session = await getApiSession(request);
      const templatePath = requireParam(params, 'path');
      const body = await request.json();
      return Response.json(
        await putThemeTemplateHandler(session, requireParam(params, 'id'), templatePath, body),
      );
    } catch (error) {
      return handleApiError(error);
    }
  });

  return router;
}
