import { describe, it, expect } from 'vitest';
import { TemplateParser } from './TemplateParser';
import type { TemplateNode } from './TemplateNode';

describe('TemplateParser', () => {
  const emptyDiv: TemplateNode = {
    selector: 'div',
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
});

const sampleComplexTemplate = `
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
`;
