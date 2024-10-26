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
  depthSum: number,
): number {
  let childrenDepthSum = 0;
  if (templateNode.textContent.length === 1) {
    const textProp = templateNode.textContent[0];
    if (textProp.textType === 'prop') {
      const value = parseValue(textProp, htmlNode.getTextContent());
      if (value === INVALID_TYPE) return -1;
      output[textProp.prop] = value;
    } else {
      if (!htmlNode.getTextContent().includes(textProp.text)) return -1;
    }
  } else if (templateNode.textContent.length > 1) {
    const text = htmlNode.getTextContent();
    const regex = makeTextContentRegex(templateNode.textContent);
    const match = text.match(regex);
    if (!match) return -1;
    const props = templateNode.textContent.filter((p) => p.textType === 'prop');
    for (let i = 0; i < props.length; i++) {
      const value = parseValue(props[i], match[i + 1]);
      if (value === INVALID_TYPE) return -1;
      output[props[i].prop] = value;
    }
  }
  for (const [attr, prop] of Object.entries(templateNode.attributes)) {
    const value = parseValue(prop, htmlNode.getAttribute(attr));
    if (value === INVALID_TYPE) return -1;
    output[prop.prop] = value;
  }
  if (templateNode.subQueryProp && templateNode.subQuery) {
    output[templateNode.subQueryProp] = matchMany(htmlNode, templateNode.subQuery, allMatchNodes, false, depthSum).map(
      ({ output }) => output,
    );
  }
  for (const child of templateNode.children) {
    const childMatches = matchMany(htmlNode, child, allMatchNodes, false, depthSum);
    if (childMatches.length === 0) {
      if (!child.isOptional) {
        return -1;
      }
      populateWithNullProps(output, child);
    } else {
      const matchMetadata = selectMatchWithLargestDepthSum(childMatches);
      for (const [key, value] of Object.entries(matchMetadata.output)) {
        output[key] = value;
      }
      allMatchNodes.set(matchMetadata.matchedNode, true);
      for (const [key, value] of matchMetadata.allMatchedNodes.entries()) {
        allMatchNodes.set(key, value);
      }
      childrenDepthSum += matchMetadata.depthSum;
    }
  }

  allMatchNodes.set(htmlNode, true);
  return htmlNode.depth + childrenDepthSum;
}

function matchMany(
  htmlNode: HtmlNode,
  templateNode: TemplateNode,
  allMatchNodes: Map<HtmlNode, boolean>,
  matchItself: boolean,
  depthSum: number,
): MatchMetadata[] {
  const matches: MatchMetadata[] = [];
  for (const matchedNode of htmlNode.selectAll(templateNode.selector, matchItself).filter((node) => !allMatchNodes.has(node))) {
    const output: Record<string, unknown> = {};
    const candidateMatchNodes = copyMap(allMatchNodes);
    const matchDepthSum = matchOne(matchedNode, templateNode, output, candidateMatchNodes, depthSum + matchedNode.depth);
    if (matchDepthSum !== -1) matches.push({ depthSum: matchDepthSum, output, allMatchedNodes: candidateMatchNodes, matchedNode });
  }
  return filterParents(matches);
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
      const parsed = Number.parseFloat(trimmed.replace(/\t/g, ''));
      return Number.isNaN(parsed) ? INVALID_TYPE : parsed;
    }
    /* v8 ignore next 2 */
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
      0,
    ) as MatchMetadata<T>[];
    if (matches.length === 0) throw new Error('No elements found matching the template');
    return selectMatchWithLargestDepthSum(matches as MatchMetadata<Record<string, unknown>>[]).output as TemplateType<T>;
  };
}

export function matchHtmlAll<T extends string>(template: T, rootSelector?: string): (htmlText: string) => TemplateType<T>[] {
  return (htmlText) =>
    matchMany(getRootNode(htmlText, rootSelector), new TemplateParser(template).parse(), new Map(), true, 0).map(
      ({ output }) => output,
    ) as TemplateType<T>[];
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
  return new RegExp(
    props.map((prop) => (prop.textType === 'prop' ? `([\\s\\S]${prop.nullable ? '*' : '+'})` : escapeRegex(prop.text))).join('\\s*'),
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.$^*+()/]/g, (c) => `\\${c}`);
}

function selectMatchWithLargestDepthSum<T>(matches: MatchMetadata[]): MatchMetadata {
  let maxDepthSum = 0;
  for (const match of matches) {
    if (match.depthSum > maxDepthSum) maxDepthSum = match.depthSum;
  }
  for (const match of matches) {
    if (match.depthSum === maxDepthSum) return match;
    /* v8 ignore next 3 - this will never happen but added to make ts happy */
  }
  return matches[0];
}

interface MatchMetadata<T = Record<string, unknown>> {
  depthSum: number;
  output: T;
  allMatchedNodes: Map<HtmlNode, boolean>;
  matchedNode: HtmlNode;
}

function copyMap<K, V>(map: Map<K, V>): Map<K, V> {
  const newMap = new Map<K, V>();
  for (const [key, value] of map.entries()) {
    newMap.set(key, value);
  }
  return newMap;
}

function filterParents<T>(matches: MatchMetadata<T>[]): MatchMetadata<T>[] {
  return matches.filter((match) => matches.every((match2) => !isParent(match.matchedNode, match2.matchedNode)));
}

function isParent(node1: HtmlNode, node2: HtmlNode): boolean {
  let node = node2.getParent();
  while (node !== null) {
    if (node === node1) return true;
    node = node.getParent();
  }
  return false;
}

function populateWithNullProps(output: Record<string, unknown>, node: TemplateNode) {
  const textContentProps = node.textContent.filter((prop) => prop.textType === 'prop');
  for (const prop of textContentProps) {
    output[prop.prop] = null;
  }
  for (const prop of Object.values(node.attributes)) {
    output[prop.prop] = null;
  }
  for (const child of node.children) {
    populateWithNullProps(output, child);
  }
}
