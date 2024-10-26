import { makeTemplateNode, type TemplateProp, type TemplateNode, type TemplateTextProp } from './TemplateNode';

// TODO: does not throw on tag not closed

export class TemplateParser {
  private index = 0;
  private parentNodes: TemplateNode[] = [];
  private rootNode: TemplateNode | null = null;
  private currentNode: TemplateNode | null = null;
  private text: string;
  private isParentOptional = false;

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
    const isOptional = this.text[openTagIndex + 1] === '?';
    const closeTagIndex = this.text.indexOf('>', openTagIndex);
    this.index = closeTagIndex + 1;
    if (isClosingTag) {
      this.currentNode = this.parentNodes.pop() as TemplateNode;
      this.isParentOptional = this.parentNodes.some((node) => node.isOptional);
      this.next();
      return;
    }
    if (!this.isParentOptional && isOptional) this.isParentOptional = true;
    if (this.currentNode) {
      const parentNode = this.currentNode;
      this.parentNodes.push(parentNode);
      this.currentNode = makeTemplateNode();
      parentNode.children.push(this.currentNode);
    } else {
      if (isOptional) throw new Error('Root element must not be optional');
      this.currentNode = makeTemplateNode();
      this.rootNode = this.currentNode;
    }
    this.currentNode.isOptional = isOptional;
    const isSelfClosed = this.parseAttributes(openTagIndex + 1 + (isOptional ? 1 : 0), closeTagIndex);
    if (isSelfClosed) {
      this.currentNode = this.parentNodes.pop() || null;
    }

    const nextOpenTagIndex = this.text.indexOf('<', this.index);
    const openDoubleBracesIndex = this.text.indexOf('{{', this.index);
    if (openDoubleBracesIndex > 0 && openDoubleBracesIndex < nextOpenTagIndex) {
      const closeBracesIndex = this.text.indexOf('}}', openDoubleBracesIndex);
      const colonIndex = this.text.indexOf(':', openDoubleBracesIndex);
      (this.currentNode as TemplateNode).subQueryProp = this.text.slice(openDoubleBracesIndex + 2, colonIndex);
      (this.currentNode as TemplateNode).subQuery = new TemplateParser(this.text.slice(colonIndex + 1, closeBracesIndex)).parse();
      this.index = closeBracesIndex + 2;
    } else {
      this.parseTextContent(this.index, nextOpenTagIndex);
    }
    this.next();
  }

  private parseTextContent(startIndex: number, endIndex: number) {
    const text = this.text.slice(startIndex, endIndex).trim();
    let index = 0;
    if (text === '') return;
    if (/{/.test(text)) {
      while (true) {
        const openBracesIndex = text.indexOf('{', index);
        if (openBracesIndex === -1) {
          const subText = text.slice(index).trim();
          if (subText !== '') {
            this.currentNode?.textContent.push({
              type: 'string',
              nullable: false,
              prop: '',
              textType: 'const',
              text: subText,
            });
          }
          break;
        }
        const subText = text.slice(index, openBracesIndex).trim();
        if (subText !== '') {
          this.currentNode?.textContent.push({
            type: 'string',
            nullable: false,
            prop: '',
            textType: 'const',
            text: subText,
          });
        }
        const closeBracesIndex = text.indexOf('}', openBracesIndex);
        if (closeBracesIndex === -1) throw new Error('Unclosed braces in template');
        const prop: TemplateTextProp = {
          ...parseTemplateProp(text.slice(openBracesIndex + 1, closeBracesIndex)),
          textType: 'prop',
          text: '',
        };
        if (!prop.nullable && this.isParentOptional) throw new Error('All props within an optional element must be nullable');
        this.currentNode?.textContent.push(prop);
        index = closeBracesIndex + 1;
      }
    } else {
      this.currentNode?.textContent.push({
        type: 'string',
        nullable: false,
        prop: '',
        textType: 'const',
        text,
      });
    }
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
      if (prop[0] === '{') {
        if (prop[prop.length - 1] !== '}') throw new Error('Unclosed braces in template');
        (this.currentNode as TemplateNode).attributes[attr] = parseTemplateProp(prop.slice(1, prop.length - 1));
      } else {
        (this.currentNode as TemplateNode).selector += `[${attributeText}]`;
      }
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
