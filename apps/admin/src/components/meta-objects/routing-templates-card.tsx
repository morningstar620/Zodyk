'use client';

import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@zodyk/shared-ui';

export type RoutingConfig = {
  archiveEnabled: boolean;
  archivePath: string;
  singlePath: string;
  handleField: string;
};

export type TemplatesConfig = {
  templateKey: string;
  archiveTemplateKey: string;
  singleTemplateKey: string;
};

type RoutingTemplatesCardProps = {
  routing: RoutingConfig;
  templates: TemplatesConfig;
  onRoutingChange: (routing: RoutingConfig) => void;
  onTemplatesChange: (templates: TemplatesConfig) => void;
};

export function RoutingTemplatesCard({
  routing,
  templates,
  onRoutingChange,
  onTemplatesChange,
}: RoutingTemplatesCardProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Routing and templates</CardTitle>
        <p className="text-sm text-muted-foreground">
          Archive and single paths are matched by the public router. Template keys pick the theme
          JSON for each view.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={routing.archiveEnabled}
            onChange={(event) =>
              onRoutingChange({ ...routing, archiveEnabled: event.target.checked })
            }
          />
          Enable archive route
        </label>
        <div>
          <Label htmlFor="archivePath">Archive path</Label>
          <Input
            id="archivePath"
            value={routing.archivePath}
            onChange={(event) => onRoutingChange({ ...routing, archivePath: event.target.value })}
            placeholder="blog"
          />
        </div>
        <div>
          <Label htmlFor="singlePath">Single path</Label>
          <Input
            id="singlePath"
            value={routing.singlePath}
            onChange={(event) => onRoutingChange({ ...routing, singlePath: event.target.value })}
            placeholder="blog/:handle"
          />
          <p className="mt-1 text-xs text-muted-foreground">Include :handle for the entry URL.</p>
        </div>
        <div>
          <Label htmlFor="handleField">Handle field</Label>
          <Input
            id="handleField"
            value={routing.handleField}
            onChange={(event) => onRoutingChange({ ...routing, handleField: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="templateKey">Template key</Label>
          <Input
            id="templateKey"
            value={templates.templateKey}
            onChange={(event) =>
              onTemplatesChange({ ...templates, templateKey: event.target.value })
            }
            placeholder="blog"
          />
        </div>
        <div>
          <Label htmlFor="archiveTemplateKey">Archive template key</Label>
          <Input
            id="archiveTemplateKey"
            value={templates.archiveTemplateKey}
            onChange={(event) =>
              onTemplatesChange({ ...templates, archiveTemplateKey: event.target.value })
            }
            placeholder="Falls back to template key"
          />
        </div>
        <div>
          <Label htmlFor="singleTemplateKey">Single template key</Label>
          <Input
            id="singleTemplateKey"
            value={templates.singleTemplateKey}
            onChange={(event) =>
              onTemplatesChange({ ...templates, singleTemplateKey: event.target.value })
            }
            placeholder="Falls back to template key"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function routingPayload(routing: RoutingConfig) {
  const archivePath = routing.archivePath.trim().replace(/^\/+|\/+$/g, '');
  const singlePath = routing.singlePath.trim().replace(/^\/+|\/+$/g, '');
  return {
    archiveEnabled: routing.archiveEnabled,
    ...(archivePath ? { archivePath } : {}),
    ...(singlePath ? { singlePath } : {}),
    handleField: routing.handleField.trim() || 'handle',
  };
}

export function templatesPayload(templates: TemplatesConfig) {
  const key = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };
  return {
    templateKey: key(templates.templateKey),
    archiveTemplateKey: key(templates.archiveTemplateKey),
    singleTemplateKey: key(templates.singleTemplateKey),
  };
}
