export interface TagDefinition {
  name: string;
  description: string;
  snippet?: string;
  endTag?: string;
}

export const LIQUIDJS_TAGS: TagDefinition[] = [
  { name: 'assign', description: 'Assign a value to a variable.', snippet: '{% assign ${1:name} = ${2:value} %}' },
  { name: 'capture', description: 'Capture block output into a variable.', endTag: 'endcapture' },
  { name: 'case', description: 'Switch on a value.', endTag: 'endcase' },
  { name: 'comment', description: 'Comment block (not rendered).', endTag: 'endcomment' },
  { name: 'for', description: 'Loop over a collection.', snippet: '{% for ${1:item} in ${2:collection} %}\n\t$0\n{% endfor %}', endTag: 'endfor' },
  { name: 'if', description: 'Conditional block.', snippet: '{% if ${1:condition} %}\n\t$0\n{% endif %}', endTag: 'endif' },
  { name: 'unless', description: 'Negative conditional.', endTag: 'endunless' },
  { name: 'elsif', description: 'Else-if branch inside if.', snippet: '{% elsif ${1:condition} %}' },
  { name: 'else', description: 'Else branch.', snippet: '{% else %}' },
  { name: 'when', description: 'Case branch.', snippet: '{% when ${1:value} %}' },
  { name: 'raw', description: 'Output without Liquid processing.', endTag: 'endraw' },
  { name: 'render', description: 'Render a snippet with isolated scope.', snippet: "{% render '${1:snippet}' %}" },
  { name: 'include', description: 'Include a snippet (legacy, shared scope).', snippet: "{% include '${1:snippet}' %}" },
  { name: 'break', description: 'Break out of a for loop.', snippet: '{% break %}' },
  { name: 'continue', description: 'Skip to next for iteration.', snippet: '{% continue %}' },
  { name: 'cycle', description: 'Cycle through values.', snippet: '{% cycle ${1:a}, ${2:b} %}' },
  { name: 'increment', description: 'Increment a counter variable.', snippet: '{% increment ${1:counter} %}' },
  { name: 'decrement', description: 'Decrement a counter variable.', snippet: '{% decrement ${1:counter} %}' },
  { name: 'echo', description: 'Output an expression.', snippet: '{% echo ${1:value} %}' },
  { name: 'liquid', description: 'Multi-tag liquid block.', endTag: 'endliquid' },
  { name: 'tablerow', description: 'Render rows in an HTML table.', endTag: 'endtablerow' },
];

export const ZODYK_TAGS: TagDefinition[] = [
  {
    name: 'stylesheet_tag',
    description: 'Emit a stylesheet link tag for a theme asset.',
    snippet: "{% stylesheet_tag '${1:theme.css}' %}",
  },
  {
    name: 'script_tag',
    description: 'Emit a deferred script tag for a theme asset.',
    snippet: "{% script_tag '${1:theme.js}' %}",
  },
  { name: 'schema', description: 'Section schema JSON block (sections only).', endTag: 'endschema' },
  { name: 'endschema', description: 'End of section schema block.' },
];

export function getAllTags(): TagDefinition[] {
  return [...LIQUIDJS_TAGS, ...ZODYK_TAGS];
}

export function getTag(name: string): TagDefinition | undefined {
  return getAllTags().find((t) => t.name === name);
}
