import { makeTemplateNode, type TemplateProp, type TemplateNode } from './TemplateNode';
/*
  <li>
    <div> 
      <a>{dataGb}</a>
    </div>
    <ul>
      props:{{
        <li>{prop}</li>
      }}
    </ul>
  </li>
*/
export class TemplateParser {
  private index = 0;
  private parentNodes: TemplateNode[] = [];
  private rootNode: TemplateNode | null = null;
  private currentNode: TemplateNode | null = null;
  private text: string;

  constructor(template: string) {
    this.text = template;
  }

  public parse(): TemplateNode {
    this.next();
    return this.rootNode as TemplateNode;
  }

  private next(): void {
    const openTagIndex = this.text.indexOf('<', this.index);
    if (openTagIndex === -1) return;
    const isClosingTag = this.text[openTagIndex + 1] === '/';
    const closeTagIndex = this.text.indexOf('>', openTagIndex);
    this.index = closeTagIndex + 1;
    if (isClosingTag) {
      this.currentNode = this.parentNodes.pop() as TemplateNode;
      this.next();
      return;
    }
    if (this.currentNode) {
      const parentNode = this.currentNode;
      this.parentNodes.push(parentNode);
      this.currentNode = makeTemplateNode();
      parentNode.children.push(this.currentNode);
    } else {
      this.currentNode = makeTemplateNode();
      this.rootNode = this.currentNode;
    }
    const isSelfClosed = this.parseAttributes(openTagIndex + 1, closeTagIndex);
    if (isSelfClosed) {
      this.currentNode = this.parentNodes.pop() || null;
    }

    const nextOpenTagIndex = this.text.indexOf('<', this.index);
    const openBracesIndex = this.text.indexOf('{', this.index);
    if (openBracesIndex > 0 && openBracesIndex < nextOpenTagIndex) {
      const isDoubleBraces = this.text[openBracesIndex + 1] === '{';
      const closeBracesIndex = this.text.indexOf(isDoubleBraces ? '}}' : '}', openBracesIndex);
      if (isDoubleBraces) {
        const colonIndex = this.text.indexOf(':', openBracesIndex);
        (this.currentNode as TemplateNode).subQueryProp = this.text.slice(openBracesIndex + 2, colonIndex);
        (this.currentNode as TemplateNode).subQuery = new TemplateParser(this.text.slice(colonIndex + 1, closeBracesIndex)).parse();
        this.index = closeBracesIndex + 2;
      } else {
        (this.currentNode as TemplateNode).textContent = parseTemplateProp(this.text.slice(openBracesIndex + 1, closeBracesIndex));
      }
    }
    this.next();
  }

  private parseAttributes(startIndex: number, endIndex: number): boolean {
    let selectorEndIndex = this.text.indexOf(' ', startIndex);
    const isSelfClosed = this.text[endIndex - 1] === '/';
    if (selectorEndIndex === -1 || selectorEndIndex > endIndex) selectorEndIndex = isSelfClosed ? endIndex - 1 : endIndex;
    (this.currentNode as TemplateNode).selector = this.text.slice(startIndex, selectorEndIndex);
    const attributesText = this.text
      .slice(selectorEndIndex + 1, isSelfClosed ? endIndex - 1 : endIndex)
      .split(/\s+/)
      .filter((str) => str !== '');
    for (const attributeText of attributesText) {
      const [attr, prop] = attributeText.split('=');
      if (prop[0] !== '{' || prop[prop.length - 1] !== '}') continue;
      (this.currentNode as TemplateNode).attributes[attr] = parseTemplateProp(prop.slice(1, prop.length - 1));
    }
    return isSelfClosed;
  }
}

function parseTemplateProp(str: string): TemplateProp {
  const output: TemplateProp = {
    type: 'string',
    prop: '',
    nullable: false,
  };
  const questionMarkIndex = str.indexOf('?');
  output.nullable = questionMarkIndex !== -1;
  if (!/:/.test(str)) {
    output.prop = output.nullable ? str.slice(0, questionMarkIndex) : str;
  } else {
    const colonIndex = str.indexOf(':');
    const endPropIndex = questionMarkIndex > 0 && questionMarkIndex < colonIndex ? questionMarkIndex : colonIndex;
    output.prop = str.slice(0, endPropIndex);
    const type = str.slice(colonIndex + 1);
    switch (type) {
      case 'string':
      case 'number':
        output.type = type;
        break;
      default:
        throw new Error(`Invalid type: ${type}`);
    }
  }
  return output;
}