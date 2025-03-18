<script setup lang="ts">
  import { onMounted, onUnmounted } from "vue";
  import { importExcel } from "./db/import.ts";
  import CheckDBConnection from "./components/CheckDBConnection.vue";
  import SchemaTree from "./components/graphs/SchemaTree.vue";

  //generates a schemaTree and displays it in whatever container you specify - ZT
  //just as a note, all console.log's happen in the application itself, not the console.
  //we can hella take all these out on build, but for now I think they're useful when debugging/testing
  const generateSchemaTree = async () => {
    try {
      //specify container
      const container = document.getElementById("schema-tree-container");

      console.log("TRYING TO FIND DATA");
      const schemaTreeData = await window.electronAPI.fetchSchemaData();

      //check the fetched data for nodes and edges
      if (!schemaTreeData || !schemaTreeData.nodes || !schemaTreeData.edges) {
        console.error("Invalid schema data format");
        return;
      }

      console.log("Schema tree data assigned:", schemaTreeData);
      console.log("Container:", container);

      //ensure the container exists
      if (!container) {
        throw new Error("Schema tree container not found in DOM");
      }

      //add captions/whatever else you need to nodes
      //the documentation on doing this was wacky, if you can figure out how to do this better please do
      schemaTreeData.nodes = schemaTreeData.nodes.map((node) => ({
        ...node,
        caption: `Count: ${node.count}\n Name: ${node.label}`,
        size: 100,
      }));

      //log and initialize NVL
      console.log("Rendering graph with NVL...");
      const nvl = new NVL(
        container,
        schemaTreeData.nodes,
        schemaTreeData.edges,
        {
          initialZoom: 2.6,
          layout: "forceDirected", //this does nothing as far as im concerned but its there
        },
      );

      //interactions for zooming, panning, and clicking,
      // if you can figure out how to make npm build ignore zoom and pan please do so, repeating them does nothing so...
      const zoom = new ZoomInteraction(nvl);
      //eslint-disable-next-line
      zoom;
      const pan = new PanInteraction(nvl);
      //eslint-disable-next-line
      pan;
      const clickInteraction = new ClickInteraction(nvl);

      clickInteraction.updateCallback(
        "onNodeClick",
        (node: SchemaNodeCallback) => {
          console.log("Node clicked", node);
        },
      );
    } catch (error) {
      // Handle errors gracefully
      const container = document.getElementById("schema-tree-container");
      if (container) {
        container.innerHTML = `<p>${error}</p>`; // Display error message in container
      }
      console.error("Error generating schema tree:", error);
    }
  };

  //imports -ZT
  const importExcel = async () => {
    console.log("Attempting to open file dialog...");
    const result = await window.electronAPI.openFileDialog();
    console.log("File dialog response:", result);

    if (result.filePaths.length > 0) {
      console.log(`Selected file: ${result.filePaths[0]}`);
      const response = await window.electronAPI.importExcel(
        result.filePaths[0],
      );
      console.log("Import response:", response);

      if (response.success) {
        console.log("Excel file imported successfully");
      } else {
        console.error("Error:", response.message);
      }
    } else {
      console.warn("No file selected.");
    }
  };

  //handling - ZT
  function handleNeo4jLog(log: string) {
    console.log(`Neo4j Log: ${log}`);
  }
  function handleNeo4jError(error: string) {
    console.error(`Neo4j Error: ${error}`);
  }
  function handleNeo4jExit(code: number) {
    console.log(`Neo4j exited with code: ${code}`);
  }
  //mounting - ZT
  onMounted(() => {
    //listen for events from the main process
    window.electronAPI.onNeo4jLog(handleNeo4jLog);
    window.electronAPI.onNeo4jError(handleNeo4jError);
    window.electronAPI.onNeo4jExit(handleNeo4jExit);
    window.electronAPI.runTestQuery();
  });

  //cleanup listeners when the component unmounts - ZT
  onUnmounted(() => {
    window.electronAPI.onNeo4jLog(() => {});
    window.electronAPI.onNeo4jError(() => {});
    window.electronAPI.onNeo4jExit(() => {});
  });
</script>

<template>
  <!-- If you want to test database -->
  <CheckDBConnection />

  <div>
    <button @click="importExcel">Import Excel</button>
  </div>

  <SchemaTree />
</template>
