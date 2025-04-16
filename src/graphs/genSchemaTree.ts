//generates a schemaTree
//just as a note, all console.log's happen in the application itself, not the console. - zt
import { elemLabel } from "./elemLabel.ts";

export const generateSchemaTree = async (summaryView: boolean) => {
  try {
    console.log("Fetching data...");
    const schemaTreeData = await window.electronAPI.fetchSchemaData();

    if (!schemaTreeData || !schemaTreeData.nodes || !schemaTreeData.edges) {
      console.error("Invalid schema data format");
      return { nodes: [], edges: [] };
    }

    console.log(
      `Schema Data: ${schemaTreeData.nodes.length} nodes, ${schemaTreeData.edges.length} edges`,
    );

    let nodes;
    let edges;

    if (summaryView) {
      console.log("Generating summary graph...");

      //fetch counts from the backend via IPC
      const { totalDc, totalServer, totalApp, totalBf } =
        await window.electronAPI.fetchSummaryCounts();

      //generate summarized nodes
      nodes = [
        {
          id: "summary-0",
          label: `Datacenter (${totalDc})`,
          captions: [{ value: `Datacenters: ${totalDc}` }],
          size: 20,
          color: "#f47535",
          type: "datacenter",
        },
        {
          id: "summary-1",
          label: `Server (${totalServer})`,
          captions: [{ value: `Servers: ${totalServer}` }],
          size: 20,
          color: "#b86eac",
          type: "server",
        },
        {
          id: "summary-2",
          label: `IT Application (${totalApp})`,
          captions: [{ value: `Applications: ${totalApp}` }],
          size: 20,
          color: "#3dbfdf",
          type: "application",
        },
        {
          id: "summary-3",
          label: `Business Function (${totalBf})`,
          captions: [{ value: `Business Functions: ${totalBf}` }],
          size: 20,
          color: "#46a64e",
          type: "business function",
        },
      ].map((node) => ({
        ...node,
        html: elemLabel(node),
      }));

      //Connect nodes with preset edges
      edges = [
        {
          from: "summary-0",
          to: "summary-1",
          id: "summary-bf-app",
          color: "#f6a565",
        },
        {
          from: "summary-1",
          to: "summary-2",
          id: "summary-app-dc",
          color: "#d89edc",
        },
        {
          from: "summary-2",
          to: "summary-3",
          id: "summary-dc-sv",
          color: "#ffffff",
        },
      ];
    } else {
      console.log("Generating detailed graph...");

      //regular graph generation
      nodes = schemaTreeData.nodes.map((node) => ({
        ...node,
        captions: [{ value: node.label }],
        size: 20,
        captionSize: 1,
        maxLength: null,
        highlighted: true,
        html: elemLabel(node),
      }));

      edges = schemaTreeData.edges.map((edge) => ({
        ...edge,
        // width: 15,
        width: 2,
        //captions: [{ value: edge.id }] this just seems like clutter
        arrowSize: 1,
        captionSize: 5,
      }));
    }

    console.log("Final Nodes:", nodes.length);
    console.log("Final Edges:", edges.length);
    return { nodes, edges };
  } catch (error) {
    console.error("Error generating schema tree:", error);
    return { nodes: [], edges: [] };
  }
};
