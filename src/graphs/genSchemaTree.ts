//generates a schemaTree
//just as a note, all console.log's happen in the application itself, not the console.
//we can hella take all these out on build, but for now I think they're useful when debugging/testing
export const generateSchemaTree = async () => {
  console.log("Fetching data");
  const schemaTreeData = await window.electronAPI.fetchSchemaData();

  //check the fetched data for nodes and edges
  if (!schemaTreeData || !schemaTreeData.nodes || !schemaTreeData.edges) {
    throw new Error("Invalid schema data format");
  }

  console.log("Schema tree data assigned:", schemaTreeData);

  // add captions to nodes
  const nodes = schemaTreeData.nodes.map((node) => ({
    ...node,
    captions: [{ value: node.label }, { value: node.count.toString() }],
    size: 100,
    captionSize: 1,
  }));

  const rels = schemaTreeData.edges.map((edge) => ({
    ...edge,
    captions: [{ value: edge.id }],
    width: 4,
    captionSize: 5,
  }));

  return { nodes, rels };
};
