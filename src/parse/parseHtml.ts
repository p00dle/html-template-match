import type { HtmlNode } from './HtmlNode';
import { HtmlParser, type HtmlParserOptions } from './HtmlParser';

export function parseHtml(html: string, options?: HtmlParserOptions): HtmlNode {
  return new HtmlParser(html, options).parse();
}
