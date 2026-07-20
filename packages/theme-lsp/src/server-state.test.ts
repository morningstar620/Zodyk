import { describe, expect, it } from 'vitest';
import { ThemeLanguageServerState, pathToUri, uriToPath } from './server-state';
import type { ThemeWorkspaceSnapshot } from '@zodyk/theme-language';

const snapshot: ThemeWorkspaceSnapshot = {
  themeId: 'test-theme',
  files: {
    'snippets/button.liquid': {
      path: 'snippets/button.liquid',
      content: '<button>{{ text }}</button>',
      version: 1,
      languageId: 'zodyk-liquid',
    },
    'sections/hero.liquid': {
      path: 'sections/hero.liquid',
      content: `<div>{% render 'button' %}</div>\n{% schema %}\n{"name":"Hero","settings":[]}\n{% endschema %}`,
      version: 1,
      languageId: 'zodyk-liquid',
    },
    'templates/index.json': {
      path: 'templates/index.json',
      content: JSON.stringify({
        name: 'Home',
        sections: { hero_1: { type: 'hero', settings: {} } },
        order: ['hero_1'],
      }),
      version: 1,
      languageId: 'json',
    },
  },
  sectionSchemas: { hero: { name: 'Hero', tag: 'section', settings: [], blocks: [], presets: [] } },
  settingsSchema: [],
  settings: {},
  snippets: ['button'],
  sectionTypes: ['hero'],
  templates: ['templates/index.json'],
  metaObjects: [],
  systemEntities: [],
  pages: [],
  menus: [],
  routes: [],
  locales: {},
  healthIssues: [],
};

describe('ThemeLanguageServerState', () => {
  it('converts paths to URIs', () => {
    expect(pathToUri('t1', 'sections/hero.liquid')).toBe('zodyk://theme/t1/sections/hero.liquid');
    expect(uriToPath('zodyk://theme/t1/sections/hero.liquid')).toBe('sections/hero.liquid');
  });

  it('provides completions for render tag context', () => {
    const state = new ThemeLanguageServerState();
    state.initWorkspace(snapshot);
    const uri = pathToUri('test-theme', 'sections/hero.liquid');
    state.syncDocument(uri, snapshot.files['sections/hero.liquid']!.content, 1);
    const items = state.getCompletions(uri, 0, 10);
    expect(items.length).toBeGreaterThan(0);
  });

  it('resolves snippet definition', () => {
    const state = new ThemeLanguageServerState();
    state.initWorkspace(snapshot);
    const uri = pathToUri('test-theme', 'sections/hero.liquid');
    state.syncDocument(uri, snapshot.files['sections/hero.liquid']!.content, 1);
    const def = state.getDefinition(uri, 0, 22);
    expect(def).toBeTruthy();
  });
});
