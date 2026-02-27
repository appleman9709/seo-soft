export interface MetaAndSchemaOutput {
  meta: {
    title: string;
    description: string;
    canonicalUrl: string;
  };
  schema: {
    '@context': string;
    '@type': string;
    name: string;
    description: string;
    url: string;
    [key: string]: unknown;
  };
}

export interface LlmClient<Input = Record<string, unknown>> {
  generateMetaAndSchema(input: Input): Promise<MetaAndSchemaOutput>;
}
