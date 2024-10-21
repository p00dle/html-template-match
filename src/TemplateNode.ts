export interface TemplateProp {
  type: 'string' | 'number';
  nullable: boolean;
  prop: string;
}

export type TemplateNode = {
  selector: string;
  attributes: Record<string, TemplateProp>;
  textContent: TemplateProp | null;
  subQueryProp: string | null;
  subQuery: TemplateNode | null;
  children: TemplateNode[];
};

export function makeTemplateNode(): TemplateNode {
  return {
    selector: '',
    attributes: {},
    textContent: null,
    subQueryProp: null,
    subQuery: null,
    children: [],
  };
}
