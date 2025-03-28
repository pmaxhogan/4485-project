<script setup lang="ts">
  import { onMounted, onUnmounted, ref } from "vue";
  import { importExcel } from "./db/import.ts";
  import CheckDBConnection from "./components/CheckDBConnection.vue";
  import SchemaTree from "./components/graphs/SchemaTree.vue";

  const schemaTreeRef = ref<InstanceType<typeof SchemaTree> | null>(null);
  const saveImageToExcel = async () => {
    if (schemaTreeRef.value) {
      await schemaTreeRef.value.captureGraphImage(); // Call captureGraphImage from SchemaTree
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
    <div></div>
    <button @click="saveImageToExcel">Save Graph Image to CMDB</button>
  </div>

  <SchemaTree ref="schemaTreeRef" />
</template>
