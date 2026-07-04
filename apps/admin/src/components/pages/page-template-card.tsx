'use client';

import { Card, CardContent, CardHeader, CardTitle, Select } from '@zodyk/shared-ui';
import { Eye } from 'lucide-react';

type PageTemplateCardProps = {
  templateSuffix?: string;
  templates: string[];
  onChange: (templateSuffix?: string) => void;
};

export function PageTemplateCard({ templateSuffix, templates, onChange }: PageTemplateCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-sm font-medium">Template</CardTitle>
        <Eye className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <Select
          value={templateSuffix ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="bg-card"
        >
          <option value="">Default page</option>
          {templates.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <p className="mt-2 text-xs text-muted-foreground">
          Default page uses templates/page.json.
        </p>
      </CardContent>
    </Card>
  );
}
