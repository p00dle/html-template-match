import { describe, it, expect } from 'vitest';
import { matchHtml, matchHtmlAll } from './match';

describe('matchHtml', () => {
  it('matches single element text content and attributes', () => {
    const match = matchHtml('<div attr={foo}>{bar}</div>');
    expect(match('<div attr="foo">bar</div>')).toEqual({ foo: 'foo', bar: 'bar' });
  });
  it('matches nested component', () => {
    const match = matchHtml('<div attr={foo}><span>{bar}</span></div>');
    expect(match('<html><div attr="foo"><span>bar</span></div></html>')).toEqual({ foo: 'foo', bar: 'bar' });
  });
  it('throws when no match is found', () => {
    const match = matchHtml('<div attr={foo}><span>{bar}</span></div>');
    expect(() => match('<html></html>')).toThrow();
    expect(() => match('<div><span>bar</span></div>')).toThrow();
  });
  it('matches array props', () => {
    const match = matchHtml('<div attr={foo}>{{arr: <li>{bar}</li>}}</div>');
    expect(match('<div attr="foo"></div>')).toEqual({ foo: 'foo', arr: [] });
    expect(match('<div attr="foo"><li>1</li></div>')).toEqual({ foo: 'foo', arr: [{ bar: '1' }] });
    expect(match('<div attr="foo"><li>1</li><li>2</li></div>')).toEqual({ foo: 'foo', arr: [{ bar: '1' }, { bar: '2' }] });
  });
  it('parses numbers', () => {
    const match = matchHtml('<div attr={foo:number}></div>');
    expect(match('<div attr=2></div>')).toEqual({ foo: 2 });
  });
  it('does not throw when a property is nullable', () => {
    const match = matchHtml('<div attr={foo?}></div>');
    expect(match('<div></div>')).toEqual({ foo: null });
  });
  it('matches only when text content matches', () => {
    const match = matchHtml('<div>FOO</div>');
    expect(match('<div>FOO</div>')).toEqual({});
    expect(match('<div>  FOO  </div>')).toEqual({});
    expect(() => match('<div></div>')).toThrow();
    expect(() => match('<div>foo</div>')).toThrow();
  });
  it('matches text content with prop and constant text mixed', () => {
    const match = matchHtml('<div>{foo?}TEXT{bar?}</div>');
    expect(match('<div>TEXT</div>')).toEqual({ foo: null, bar: null });
    expect(match('<div>fooTEXTbar</div>')).toEqual({ foo: 'foo', bar: 'bar' });
    expect(match('<div>  foo  TEXT  bar  </div>')).toEqual({ foo: 'foo', bar: 'bar' });
    expect(match('<div>  foo  TEXT  </div>')).toEqual({ foo: 'foo', bar: null });
    expect(match('<div>  TEXT  bar  </div>')).toEqual({ foo: null, bar: 'bar' });
  });
  it('matches each child only once', () => {
    const match = matchHtml(`
      <div>
        <div>FOO</div>
        <div>{foo}</div>
      </div>
      `);
    expect(
      match(`
      <div>
        <div>FOO</div>
        <div>foo</div>
      </div>
      `),
    ).toEqual({ foo: 'foo' });
  });
  it('matches each child only once when reversed', () => {
    const match = matchHtml(`
      <div>
        <div>
          <div>FOO</div>
          <div>{foo}</div>
        </div>
        <div>
          <div>BAR</div>
          <div>{bar}</div>
        </div>
      </div>      
      `);
    expect(
      match(`
      <div>
        <div>
          <div>BAR</div>
          <div>bar</div>
        </div>
        <div>
          <div>FOO</div>
          <div>foo</div>
        </div>
      </div>
      `),
    ).toEqual({ foo: 'foo', bar: 'bar' });
  });
  it('matches the bottom most child first', () => {
    const match = matchHtml(`
      <div>
        <div depth={depth:number}>FOO</div>
      </div>
      `);
    expect(
      match(`
      <div>
        <div depth="1">
          <div depth="2">
            FOO
          </div>
        </div>
      </div>
      `),
    ).toEqual({ depth: 2 });
  });
});

describe('matchHtmlAll', () => {
  it('correctly matches complex structures', () => {
    const match = matchHtmlAll(`
      <div depth={depth:number}>
        <div> {price:number} $ {discountPrice:number} $ </div>
        <div> {allowance:number} GB </div>
        <div> {discountLength:number} months </div>
      </div>
      `);
    expect(
      match(`
        <div depth=0>
          <div depth=1>
            <div depth=2>
              <div> 100 $ 50 $ </div>
              <div> 10 GB </div>
              <div> 6 months </div>
            </div>
            <div depth=2>
              <div> 200 $ 100 $ </div>
              <div> 20 GB </div>
              <div> 6 months </div>
            </div>            
          </div>
        </div>
      `),
    ).toEqual([
      { depth: 2, price: 100, discountPrice: 50, allowance: 10, discountLength: 6 },
      { depth: 2, price: 200, discountPrice: 100, allowance: 20, discountLength: 6 },
    ]);
  });
});
