import type { Monaco } from '@monaco-editor/react';

export function registerZodykLiquidLanguage(monaco: Monaco): void {
  if (monaco.languages.getLanguages().some((l: { id: string }) => l.id === 'zodyk-liquid')) return;

  monaco.languages.register({ id: 'zodyk-liquid', extensions: ['.liquid'] });

  monaco.languages.setMonarchTokensProvider('zodyk-liquid', {
    defaultToken: '',
    tokenPostfix: '.liquid',

    tokenizer: {
      root: [
        [/\{%\s*schema\s*%\}/, { token: 'keyword.schema', next: '@schemaBlock' }],
        [/\{%\s*endschema\s*%\}/, 'keyword.schema'],
        [/\{%\s*-?/, { token: 'delimiter.tag', next: '@liquidTag' }],
        [/\{\{-?/, { token: 'delimiter.output', next: '@liquidOutput' }],
        [/<!DOCTYPE/, 'metatag', '@doctype'],
        [/<!--/, 'comment', '@comment'],
        [/<(\w+)/, { token: 'tag', next: '@htmlTag.$1' }],
        [/<\/\w+\s*>/, 'tag'],
        [/[^<{]+/, ''],
      ],

      schemaBlock: [
        [/\{%\s*endschema\s*%\}/, { token: 'keyword.schema', next: '@pop' }],
        [/[^%]+|./, 'source.json'],
      ],

      liquidTag: [
        [/-?%\}/, { token: 'delimiter.tag', next: '@pop' }],
        [/\b(assign|capture|case|comment|for|if|unless|elsif|else|when|raw|render|include|break|continue|cycle|increment|decrement|echo|liquid|tablerow|stylesheet_tag|script_tag|schema|endschema)\b/, 'keyword'],
        [/"[^"]*"/, 'string'],
        [/'[^']*'/, 'string'],
        [/\d+/, 'number'],
        [/[\w.-]+/, 'identifier'],
        [/[^%]+|./, ''],
      ],

      liquidOutput: [
        [/-?\}\}/, { token: 'delimiter.output', next: '@pop' }],
        [/\|\s*[\w-]+/, 'keyword.filter'],
        [/"[^"]*"/, 'string'],
        [/'[^']*'/, 'string'],
        [/\d+/, 'number'],
        [/[\w.-]+/, 'variable'],
        [/[^}]+|./, ''],
      ],

      doctype: [
        [/[^>]+/, 'metatag.content'],
        [/>/, 'metatag', '@pop'],
      ],

      comment: [
        [/-->/, 'comment', '@pop'],
        [/[^-]+/, 'comment.content'],
        [/./, 'comment.content'],
      ],

      htmlTag: [
        [/\s+[\w-]+=/, { token: 'attribute.name', next: '@htmlAttr' }],
        [/>/, { token: 'tag', next: '@pop' }],
      ],

      htmlAttr: [
        [/"/, { token: 'attribute.value', next: '@htmlAttrValue' }],
        [/'/, { token: 'attribute.value', next: '@htmlAttrValueSingle' }],
        [/>/, { token: 'tag', next: '@pop' }],
      ],

      htmlAttrValue: [
        [/[^"]+/, 'attribute.value'],
        [/"/, { token: 'attribute.value', next: '@pop' }],
      ],

      htmlAttrValueSingle: [
        [/[^']+/, 'attribute.value'],
        [/'/, { token: 'attribute.value', next: '@pop' }],
      ],
    },
  });

  monaco.languages.setLanguageConfiguration('zodyk-liquid', {
    comments: {
      blockComment: ['{% comment %}', '{% endcomment %}'],
    },
    brackets: [
      ['{%', '%}'],
      ['{{', '}}'],
      ['(', ')'],
      ['[', ']'],
      ['{', '}'],
    ],
    autoClosingPairs: [
      { open: '{%', close: ' %}' },
      { open: '{{', close: ' }}' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '{', close: '}' },
    ],
    surroundingPairs: [
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '{', close: '}' },
    ],
    onEnterRules: [
      {
        beforeText: /\{%\s*(if|unless|for|case|capture|comment|raw|liquid)\b[^%]*$/,
        action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
      },
      {
        beforeText: /\{%\s*(else|elsif|when)\b[^%]*$/,
        action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
      },
    ],
  });
}

export function pathToModelUri(themeId: string, path: string): string {
  return `zodyk://theme/${themeId}/${path}`;
}

export function modelUriToPath(uri: string): string | null {
  const match = uri.match(/^zodyk:\/\/theme\/[^/]+\/(.+)$/);
  return match?.[1] ?? null;
}

export function detectMonacoLanguage(path: string): string {
  if (path.endsWith('.liquid')) return 'zodyk-liquid';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.ts')) return 'typescript';
  return 'plaintext';
}
