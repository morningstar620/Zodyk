export interface FilterDefinition {
  name: string;
  description: string;
  args?: string;
}

export const LIQUIDJS_FILTERS: FilterDefinition[] = [
  { name: 'abs', description: 'Absolute value of a number.' },
  { name: 'append', description: 'Append a string.', args: 'string' },
  { name: 'at_least', description: 'Minimum value.', args: 'number' },
  { name: 'at_most', description: 'Maximum value.', args: 'number' },
  { name: 'capitalize', description: 'Capitalize first character.' },
  { name: 'ceil', description: 'Round up to integer.' },
  { name: 'compact', description: 'Remove nil values from array.' },
  { name: 'concat', description: 'Concatenate arrays.', args: 'array' },
  { name: 'date', description: 'Format a date.', args: 'format' },
  { name: 'default', description: 'Fallback when value is empty.', args: 'default' },
  { name: 'divided_by', description: 'Divide by number.', args: 'number' },
  { name: 'downcase', description: 'Lowercase string.' },
  { name: 'escape', description: 'HTML-escape string.' },
  { name: 'first', description: 'First item of array.' },
  { name: 'floor', description: 'Round down to integer.' },
  { name: 'join', description: 'Join array with separator.', args: 'separator' },
  { name: 'json', description: 'JSON stringify value.' },
  { name: 'last', description: 'Last item of array.' },
  { name: 'map', description: 'Map array property.', args: 'property' },
  { name: 'minus', description: 'Subtract number.', args: 'number' },
  { name: 'modulo', description: 'Modulo operation.', args: 'number' },
  { name: 'plus', description: 'Add number.', args: 'number' },
  { name: 'prepend', description: 'Prepend a string.', args: 'string' },
  { name: 'remove', description: 'Remove substring.', args: 'string' },
  { name: 'replace', description: 'Replace substring.', args: 'search, replace' },
  { name: 'reverse', description: 'Reverse array.' },
  { name: 'round', description: 'Round number.', args: 'precision' },
  { name: 'size', description: 'Size of string or array.' },
  { name: 'slice', description: 'Slice string or array.', args: 'start, length' },
  { name: 'sort', description: 'Sort array.', args: 'property' },
  { name: 'split', description: 'Split string.', args: 'separator' },
  { name: 'strip', description: 'Strip whitespace.' },
  { name: 'strip_html', description: 'Remove HTML tags.' },
  { name: 'times', description: 'Multiply by number.', args: 'number' },
  { name: 'truncate', description: 'Truncate string.', args: 'length' },
  { name: 'truncatewords', description: 'Truncate by word count.', args: 'words' },
  { name: 'uniq', description: 'Unique array values.' },
  { name: 'upcase', description: 'Uppercase string.' },
  { name: 'url_encode', description: 'URL-encode string.' },
  { name: 'where', description: 'Filter array by property.', args: 'property, value' },
];

export const ZODYK_FILTERS: FilterDefinition[] = [
  { name: 'asset_url', description: 'Resolve theme asset URL.', args: 'filename' },
  { name: 'stylesheet_tag', description: 'Stylesheet link tag from URL.' },
  { name: 'script_tag', description: 'Script tag from URL.' },
  { name: 'image_url', description: 'Resolve image URL from string or object.' },
  { name: 'handleize', description: 'Slugify string (Zodyk handle format).' },
  { name: 't', description: 'Translate locale key.', args: 'key' },
  { name: 'zodyk_block_attributes', description: 'Builder block data attributes.', args: 'block, sectionId' },
];

export function getAllFilters(): FilterDefinition[] {
  const zodykNames = new Set(ZODYK_FILTERS.map((f) => f.name));
  return [...ZODYK_FILTERS, ...LIQUIDJS_FILTERS.filter((f) => !zodykNames.has(f.name))];
}

export function getFilter(name: string): FilterDefinition | undefined {
  return getAllFilters().find((f) => f.name === name);
}
