import { describe, it, expect } from 'vitest';
import { TemplateParser } from './TemplateParser';
import type { TemplateNode } from './TemplateNode';

describe('TemplateParser', () => {
  const emptyDiv: TemplateNode = {
    selector: 'div',
    isOptional: false,
    attributes: {},
    children: [],
    textContent: [],
    subQuery: null,
    subQueryProp: null,
  };

  it('parses single element', () => {
    expect(new TemplateParser('<div></div>').parse()).toEqual(emptyDiv);
  });
  it('parses single self closed element', () => {
    expect(new TemplateParser('<div />').parse()).toEqual(emptyDiv);
  });

  it('parses a prop from attribute', () => {
    const node: TemplateNode = {
      selector: 'div',
      isOptional: false,
      attributes: { attr: { prop: 'foo', nullable: false, type: 'string' } },
      children: [],
      textContent: [],
      subQuery: null,
      subQueryProp: null,
    };
    expect(new TemplateParser('<div attr={foo} />').parse()).toEqual(node);
  });

  it('parses a prop from text content', () => {
    const node: TemplateNode = {
      selector: 'div',
      isOptional: false,
      attributes: {},
      children: [],
      textContent: [{ prop: 'foo', nullable: false, type: 'string', text: '', textType: 'prop' }],
      subQuery: null,
      subQueryProp: null,
    };
    expect(new TemplateParser('<div>{foo}</div>').parse()).toEqual(node);
  });
  it('parses the prop type', () => {
    const node = {
      selector: 'div',
      isOptional: false,
      attributes: {},
      children: [],
      textContent: null,
      subQuery: null,
      subQueryProp: null,
    };
    expect(new TemplateParser('<div>{foo:string}</div>').parse()).toEqual({
      ...node,
      textContent: [{ prop: 'foo', nullable: false, type: 'string', text: '', textType: 'prop' }],
    });
    expect(new TemplateParser('<div>{foo?:string}</div>').parse()).toEqual({
      ...node,
      textContent: [{ prop: 'foo', nullable: true, type: 'string', text: '', textType: 'prop' }],
    });
    expect(new TemplateParser('<div>{foo:number}</div>').parse()).toEqual({
      ...node,
      textContent: [{ prop: 'foo', nullable: false, type: 'number', text: '', textType: 'prop' }],
    });
    expect(new TemplateParser('<div>{foo?:number}</div>').parse()).toEqual({
      ...node,
      textContent: [{ prop: 'foo', nullable: true, type: 'number', text: '', textType: 'prop' }],
    });
  });
  it('throws on invalid prop type', () => {
    expect(() => new TemplateParser('<div>{foo?:bar}</div>').parse()).toThrowError('Invalid type: bar');
  });
  it('parses optional elements', () => {
    expect(new TemplateParser('<div><?span /></div>').parse().children[0].isOptional).toBe(true);
  });
  it('throws an error when a prop is not nullable within an optional element', () => {
    expect(() => new TemplateParser('<div><?span>{foo}</span></div>').parse()).toThrow();
  });
  it('throws an error when a prop is not nullable within an optional element when the prop is deep nested', () => {
    expect(() => new TemplateParser('<body><?div><span>{foo}</span></div></body>').parse()).toThrow();
  });
  it('throws an error when the topmost element is optional', () => {
    // new TemplateParser('<?div />').parse();
    expect(() => new TemplateParser('<?div />').parse()).toThrow();
  });
  it('throws an error when the curly braces are not closed in an attribute', () => {
    expect(() => new TemplateParser('<a href={foo />').parse()).toThrow();
  });
  it('throws an error when the curly braces are not closed in text content', () => {
    expect(() => new TemplateParser('<a>{foo BAR</a>').parse()).toThrow();
  });
  it('adds an attribute to selector when it is not a prop', () => {
    expect(new TemplateParser('<div id="foo" />').parse().selector).toBe('div[id="foo"]');
  });
  it('correctly infers selector in a self closed element when there is no space before slash', () => {
    expect(new TemplateParser('<div.foo/>').parse().selector).toBe('div.foo');
  });
});
