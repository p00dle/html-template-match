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
});
