export function hyphenate(str: string): string {
  return str.replace(" ", "-").toLowerCase();
}

export function wrapLabels(str: string): string {
  return str
    .replaceAll(/(?<=[^\d(])(?=[\d(])/g, "\n")
    .replaceAll(/(?<=[^\s/])(?=\/)|(?<=\/)(?=[^\s/])/g, " ");
}

export function elemLabel(node: SchemaNode): HTMLElement {
  const elem = document.createElement("div");
  elem.classList.add("graph-node");
  elem.classList.add("graph-node-type-" + hyphenate(node.type));

  const i = document.createElement("i");
  i.classList.add("aligner");
  elem.appendChild(i);

  const label = document.createTextNode(wrapLabels(node.label));
  elem.appendChild(label);
  return elem;
}
