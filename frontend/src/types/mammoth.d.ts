declare module 'mammoth/mammoth.browser' {
  interface Input {
    arrayBuffer: ArrayBuffer;
  }

  interface Result {
    value: string;
  }

  export function extractRawText(input: Input): Promise<Result>;
}
