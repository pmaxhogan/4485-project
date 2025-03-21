//generates a schemaTree
//just as a note, all console.log's happen in the application itself, not the console.
export const generateSchemaTree = async () => {
  try {
    //loggging checking
    console.log("Fetching data...");
    const schemaTreeData = await window.electronAPI.fetchSchemaData();

    if (!schemaTreeData || !schemaTreeData.nodes || !schemaTreeData.edges) {
      console.error("Invalid schema data format");
      return { nodes: [], edges: [] };
    }

    console.log(
      `Schema Data: ${schemaTreeData.nodes.length} nodes, ${schemaTreeData.edges.length} edges`,
      schemaTreeData.edges,
    );

    //adding onto node structure
    //if we need to expose any data, just create a field here and it will be shown in the application.
    const nodes = schemaTreeData.nodes.map((node) => ({
      ...node,
      captions: [
        {
          value: node.label,
        },
      ],
      size: 100, //+ (node.label.length * 2.5), //helps create more space for labels/visual graph diversity
      captionSize: 1,
      maxLength: null,
    }));

    const nodeLabelToIdMap = new Map<string, string[]>();

    schemaTreeData.nodes.forEach((node) => {
      if (!nodeLabelToIdMap.has(node.label)) {
        nodeLabelToIdMap.set(node.label, []);
      }
      nodeLabelToIdMap.get(node.label)?.push(node.id);
    });

    console.log("Node Label to ID Map:", nodeLabelToIdMap);

    //adding onto edge structure
    //if we need to expose any data, just create a field here and it will be shown in the application.
    const edges = [...schemaTreeData.edges].map((edge) => ({
      ...edge,
      width: 15,
      arrowSize: 5,
      color: "#FFC0CB",
    }));

    console.log("Final Edges:", edges);

    return { nodes, edges };
  } catch (error) {
    console.error("Error generating schema tree:", error);
    return { nodes: [], edges: [] };
  }
};
