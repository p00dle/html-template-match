type InferTemplateType<T extends string> = T extends `${infer S1}{{${infer A}:${infer S2}}}${infer S3}`
  ? InferTemplateType<S1> & {
      [K in A]: InferTemplateType<S2>[];
    } & InferTemplateType<S3>
  : T extends `${string}{${infer P}}${infer R}`
    ? (P extends `${infer P2}?: string`
        ? { [K in P2]: string | null }
        : P extends `${infer P2}:string`
          ? { [K in P2]: string }
          : P extends `${infer P2}?:number`
            ? { [K in P2]: number | null }
            : P extends `${infer P2}:number`
              ? { [K in P2]: number }
              : P extends `${infer P2}?`
                ? { [K in P2]: string | null }
                : { [K in P]: string }) &
        InferTemplateType<R>
    : Record<never, unknown>;

type FlatType<T> = T extends object ? { [K in keyof T]: FlatType<T[K]> } : T;

export type TemplateType<T extends string> = FlatType<InferTemplateType<T>>;

const sampleComplexTemplate = `
  <li>
    <div> 
      <a href={url}>{title?}</a>
    </div>
    <ul>
      {{props:
        <li>{prop:boolean}</li>
      }}
    </ul>
  </li>
`;

type T = TemplateType<typeof sampleComplexTemplate>;
