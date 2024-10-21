import type { HtmlNode } from './parse/HtmlNode';
import { parseHtml } from './parse/parseHtml';
import type { TemplateNode, TemplateProp } from './TemplateNode';
import { TemplateParser } from './TemplateParser';
import type { TemplateType } from './TemplateType';

const INVALID_TYPE = Symbol('INVALID_TYPE');

function matchOne(htmlNode: HtmlNode, templateNode: TemplateNode, output: Record<string, unknown>): boolean {
  if (templateNode.textContent) {
    const value = parseValue(templateNode.textContent, htmlNode.getTextContent());
    if (value === INVALID_TYPE) return false;
    output[templateNode.textContent.prop] = value;
  }
  for (const [attr, prop] of Object.entries(templateNode.attributes)) {
    const value = parseValue(prop, htmlNode.getAttribute(attr));
    if (value === INVALID_TYPE) return false;
    output[prop.prop] = value;
  }
  for (const child of templateNode.children) {
    const childMatches = matchMany(htmlNode, child);
    if (childMatches.length === 0) return false;
    for (const [key, value] of Object.entries(childMatches[0])) {
      output[key] = value;
    }
  }
  if (templateNode.subQueryProp && templateNode.subQuery) {
    output[templateNode.subQueryProp] = matchMany(htmlNode, templateNode.subQuery);
  }
  return true;
}

function matchMany(htmlNode: HtmlNode, templateNode: TemplateNode): Record<string, unknown>[] {
  const matches: Record<string, unknown>[] = [];
  for (const matchedNode of htmlNode.selectAll(templateNode.selector)) {
    const output: Record<string, unknown> = {};
    if (matchOne(matchedNode, templateNode, output)) matches.push(output);
  }
  return matches;
}

function parseValue(prop: TemplateProp, text: string | null | undefined) {
  if (typeof text !== 'string') return prop.nullable ? null : INVALID_TYPE;
  const trimmed = text.trim();
  if (!prop.nullable && trimmed === '') return INVALID_TYPE;
  switch (prop.type) {
    case 'string':
      return trimmed;
    case 'number': {
      const parsed = Number.parseFloat(trimmed);
      return Number.isNaN(parsed) ? INVALID_TYPE : parsed;
    }
    default:
      throw new Error('Invalid property type');
  }
}

export function matchHtml<T extends string>(template: T, rootSelector?: string): (htmlText: string) => TemplateType<T> {
  return (htmlText) => {
    const matches = matchMany(getRootNode(htmlText, rootSelector), new TemplateParser(template).parse()) as TemplateType<T>[];
    if (matches.length === 0) throw new Error('No elements found matching the template');
    return matches[0];
  };
}

export function matchHtmlAll<T extends string>(template: T, rootSelector?: string): (htmlText: string) => TemplateType<T>[] {
  return (htmlText) => matchMany(getRootNode(htmlText, rootSelector), new TemplateParser(template).parse()) as TemplateType<T>[];
}

function getRootNode(htmlText: string, rootSelector?: string): HtmlNode {
  const rootNode = parseHtml(htmlText);
  if (rootSelector) {
    const match = rootNode.select(rootSelector);
    if (!match) throw new Error(`Unable to find root element "${rootSelector}"`);
    return match;
  }
  return rootNode;
}
