export interface TemplateProp {
  type: 'string' | 'number';
  nullable: boolean;
  prop: string;
}

export interface TemplateTextProp extends TemplateProp {
  textType: 'prop' | 'const';
  text: string;
}

export type TemplateNode = {
  selector: string;
  isOptional: boolean;
  attributes: Record<string, TemplateProp>;
  textContent: TemplateTextProp[];
  subQueryProp: string | null;
  subQuery: TemplateNode | null;
  children: TemplateNode[];
};

export function makeTemplateNode(): TemplateNode {
  return {
    selector: '',
    isOptional: false,
    attributes: {},
    textContent: [],
    subQueryProp: null,
    subQuery: null,
    children: [],
  };
}
