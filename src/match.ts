import type { HtmlNode } from './parse/HtmlNode';
import { parseHtml } from './parse/parseHtml';
import type { TemplateNode, TemplateProp, TemplateTextProp } from './TemplateNode';
import { TemplateParser } from './TemplateParser';
import type { TemplateType } from './TemplateType';

const INVALID_TYPE = Symbol('INVALID_TYPE');

function matchOne(
  htmlNode: HtmlNode,
  templateNode: TemplateNode,
  output: Record<string, unknown>,
  allMatchNodes: Map<HtmlNode, boolean>,
): boolean {
  for (const child of templateNode.children) {
    const childMatches = matchMany(htmlNode, child, allMatchNodes, false);
    if (childMatches.length === 0) return false;
    for (const [key, value] of Object.entries(childMatches[0])) {
      output[key] = value;
    }
  }
  if (templateNode.textContent.length === 1) {
    const textProp = templateNode.textContent[0];
    if (textProp.textType === 'prop') {
      const value = parseValue(textProp, htmlNode.getTextContent());
      if (value === INVALID_TYPE) return false;
      output[textProp.prop] = value;
    } else {
      if (!htmlNode.getTextContent().includes(textProp.text)) return false;
    }
  } else if (templateNode.textContent.length > 1) {
    const text = htmlNode.getTextContent();
    const regex = makeTextContentRegex(templateNode.textContent);
    const match = text.match(regex);
    if (!match) return false;
    const props = templateNode.textContent.filter((p) => p.textType === 'prop');
    for (let i = 0; i < props.length; i++) {
      const value = parseValue(props[i], match[i + 1]);
      if (value === INVALID_TYPE) return false;
      output[props[i].prop] = value;
    }
  }
  for (const [attr, prop] of Object.entries(templateNode.attributes)) {
    const value = parseValue(prop, htmlNode.getAttribute(attr));
    if (value === INVALID_TYPE) return false;
    output[prop.prop] = value;
  }

  if (templateNode.subQueryProp && templateNode.subQuery) {
    output[templateNode.subQueryProp] = matchMany(htmlNode, templateNode.subQuery, allMatchNodes, false);
  }
  allMatchNodes.set(htmlNode, true);
  return true;
}

function matchMany(
  htmlNode: HtmlNode,
  templateNode: TemplateNode,
  allMatchNodes: Map<HtmlNode, boolean>,
  matchItself: boolean,
): Record<string, unknown>[] {
  const matches: Record<string, unknown>[] = [];
  for (const matchedNode of htmlNode.selectAll(templateNode.selector, matchItself).filter((node) => !allMatchNodes.has(node))) {
    const output: Record<string, unknown> = {};
    if (matchOne(matchedNode, templateNode, output, allMatchNodes)) matches.push(output);
  }
  return matches;
}

function parseValue(prop: TemplateProp, text: string | null | undefined) {
  if (typeof text !== 'string') return prop.nullable ? null : INVALID_TYPE;
  const trimmed = text.trim();
  if (trimmed === '') {
    return prop.nullable ? null : INVALID_TYPE;
  }
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
    const matches = matchMany(
      getRootNode(htmlText, rootSelector),
      new TemplateParser(template).parse(),
      new Map(),
      true,
    ) as TemplateType<T>[];
    if (matches.length === 0) throw new Error('No elements found matching the template');
    return matches[0];
  };
}

export function matchHtmlAll<T extends string>(template: T, rootSelector?: string): (htmlText: string) => TemplateType<T>[] {
  return (htmlText) =>
    matchMany(getRootNode(htmlText, rootSelector), new TemplateParser(template).parse(), new Map(), true) as TemplateType<T>[];
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

function makeTextContentRegex(props: TemplateTextProp[]): RegExp {
  return new RegExp(props.map((prop) => (prop.textType === 'prop' ? `([\\s\\S]${prop.nullable ? '*' : '+'})` : prop.text)).join('\\s*'));
}
