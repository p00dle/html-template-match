import { stubParserNode, type ParserNode } from './ParserNode';
import { parseSelector } from './parseSelector';
import type { Selector } from './Selector';

export class HtmlNode {
  private children: number[];
  public classes: string[];
  public parent: number | null;
  public attrs: Record<string, string>;
  public id: string | null;
  public tag: string;
  public depth: number;
  public textContent: string | null;
  public isError = false;
  public error: Error | null = null;

  constructor(
    parserNode: ParserNode,
    public allNodes: HtmlNode[],
    error?: Error,
  ) {
    this.children = parserNode.children;
    this.classes = parserNode.classes;
    this.attrs = parserNode.attrs;
    this.depth = parserNode.depth;
    this.id = parserNode.id;
    this.tag = parserNode.tag;
    this.parent = parserNode.parent;
    this.textContent = parserNode.textContents.filter((str) => str !== '').join(' ');
    if (error) {
      this.isError = true;
      this.error = error;
    }
  }

  public select(selector: string, matchItself = true): HtmlNode | null {
    const selectors = parseSelector(selector);
    const nodes: HtmlNode[] = [];
    this._select(selectors, true, nodes, 0);
    const filteredNodes = matchItself ? nodes : nodes.filter((node) => node !== this);
    return filteredNodes[0] || null;
  }

  public selectOrThrow(selector: string, matchItself = true): HtmlNode {
    const node = this.select(selector, matchItself);
    if (node) {
      return node;
    }
    throw new Error(`Unable to find element for selector "${selector}"`);
  }

  public selectAll(selector: string, matchItself = true): HtmlNode[] {
    const selectors = parseSelector(selector);
    const nodes: HtmlNode[] = [];
    this._select(selectors, false, nodes, 0);
    return matchItself ? nodes : nodes.filter((node) => node !== this);
  }

  public getParent(): HtmlNode | null {
    return this.parent === null ? null : this.allNodes[this.parent];
  }

  private _select(selectors: Selector[][], returnEarly: boolean, matchedNodes: HtmlNode[], depth: number): boolean {
    let currentDepth = depth;
    const isMatch = this.matchSelector(selectors[currentDepth]);
    if (isMatch) {
      if (currentDepth + 1 === selectors.length) {
        matchedNodes.push(this);
        if (returnEarly) return true;
      } else {
        currentDepth++;
      }
    }
    const l = this.children.length;
    for (let i = 0; i < l; i++) {
      const nodeFound = this.allNodes[this.children[i]]._select(selectors, returnEarly, matchedNodes, currentDepth);
      if (nodeFound && returnEarly) return true;
    }
    return false;
  }

  private matchSelector(selectors: Selector[]): boolean {
    const l = selectors.length;
    for (let i = 0; i < l; i++) {
      const meta = selectors[i];
      switch (meta.type) {
        case 'attr':
          if (this.attrs[meta.key] !== meta.value) return false;
          break;
        case 'class':
          // console.log(this.classes, meta.value, this.classes.includes(meta.value));
          if (!this.classes.includes(meta.value)) return false;
          break;
        case 'id':
          if (this.id !== meta.value) return false;
          break;
        case 'tag':
          if (this.tag !== meta.value) return false;
          break;
      }
    }
    return true;
  }

  public getAttribute(attribute: string): string | null {
    return this.attrs[attribute] || null;
  }

  public getTextContent(separator = '\t', recursive = true): string {
    const chunks: string[] = [];
    this._getTextContent(recursive, chunks);
    return chunks.join(separator);
  }

  protected _getTextContent(recursive: boolean, chunks: string[]): void {
    if (this.textContent) chunks.push(this.textContent);
    if (recursive) {
      for (const child of this.children) {
        this.allNodes[child]._getTextContent(recursive, chunks);
      }
    }
  }

  public toJSON(): Node {
    return {
      tag: this.tag,
      id: this.id,
      depth: this.depth,
      classes: this.classes,
      attrs: this.attrs,
      textContent: this.textContent,
      children: this.children.map((i) => this.allNodes[i].toJSON()),
    };
  }
}
interface Node {
  children: Node[];
  classes: string[];
  depth: number;
  attrs: Record<string, string>;
  id: string | null;
  tag: string;
  textContent: string | null;
}

export const makeErrorHtmlNode = (errorMessage: string) => new HtmlNode(stubParserNode, [], new Error(errorMessage));
