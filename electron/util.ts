export const indent = (str: string) =>
  str.replace(/^/gm, "  ").replace(/\r/g, "");
export const indentInline = (str: string) => indent(str).trim();

export const helloWorld = () => "Hello, World!";
