import { getLast, hasElements } from './lib';

export class ParserNode {
  public children: number[] = [];
  public classes: string[] = [];
  public attrs: Record<string, string> = {};
  public id: string | null = null;
  public textContents: string[] = [];

  constructor(
    public tag: string,
    public index: number,
    public depth: number,
    public parent: number | null,
    public allNodesRef: ParserNode[],
  ) {
    if (parent !== null) {
      this.allNodesRef[parent].addChild(this.index);
    }
  }

  public addChild(nodeIndex: number) {
    this.children.push(nodeIndex);
  }

  public addClass(className: string) {
    this.classes.push(className);
  }

  public addAttr(attr: string, value: string, nodes: ParserNode[]) {
    switch (attr) {
      case 'class':
        for (const className of value.trim().split(' ')) this.classes.push(className);

        return;
      case 'id':
        this.id = value;
        return;
      default:
        this.attrs[attr] = value;
        return;
    }
  }

  public addTextContent(text: string) {
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      this.textContents.push(trimmed);
    }
  }
}

export const stubParserNode = new ParserNode('', 0, 0, null, []);
