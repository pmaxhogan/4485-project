<script setup lang="ts">
  import { nextTick, onMounted, onUnmounted, ref } from "vue";
  import { importExcel } from "./db/import.ts";
  import CheckDBConnection from "./components/CheckDBConnection.vue";
  import SchemaTree from "./components/graphs/SchemaTree.vue";
  import { ConnectionStatus } from "./global";
  import LoadingSpinner from "./components/LoadingSpinner.vue";

  const schemaTreeRef = ref<InstanceType<typeof SchemaTree> | null>(null);

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

  const status = ref<ConnectionStatus>("PENDING");
  const handleNeo4jStatus = async (newStatus: ConnectionStatus) => {
    await nextTick();
    status.value = newStatus;
  };
  //mounting - ZT
  onMounted(() => {
    //listen for events from the main process
    window.electronAPI.onNeo4jLog(handleNeo4jLog);
    window.electronAPI.onNeo4jError(handleNeo4jError);
    window.electronAPI.onNeo4jExit(handleNeo4jExit);
    window.electronAPI.onNeo4jStatus(handleNeo4jStatus);
    window.electronAPI.runTestQuery();
  });

  //cleanup listeners when the component unmounts - ZT
  onUnmounted(() => {
    window.electronAPI.onNeo4jLog(() => {});
    window.electronAPI.onNeo4jError(() => {});
    window.electronAPI.onNeo4jExit(() => {});
    window.electronAPI.onNeo4jStatus(() => {});
  });
</script>

<template>
  <!-- If you want to test database -->
  <div
    :class="status === 'PENDING' ? 'neo-loading' : ''"
    class="connecting-to-neo"
  >
    <p>Connecting to Neo4j...</p>
    <LoadingSpinner />
  </div>
  <template v-if="status === 'CONNECTED'">
    <button @click="importExcel">Import Excel</button>

    <SchemaTree ref="schemaTreeRef" />
  </template>
  <CheckDBConnection :status="status" />
</template>
