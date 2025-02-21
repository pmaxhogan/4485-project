<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from "vue";
  import NVLTest from "./components/NVLTest.vue";

  const connectionStatus = ref("Checking connection...");

  //checks Neo4j connection - ZT
  const checkConnection = async () => {
    try {
      const status = await window.electronAPI.invoke("check-neo4j-connection");
      connectionStatus.value = status;
      console.log("Connection status:", status);
    } catch (error: unknown) {
      connectionStatus.value = "Failed to connect to Neo4j.";

      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error("An unknown error occurred", error);
      }
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
    checkConnection();
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
  <!-- If you want to test database
  <div>
    <h1>Neo4j Connection Status</h1>
    <p>{{ connectionStatus }}</p>
    <input v-model="connectionStatus" type="text" placeholder="Connection Status" />
  </div>
  -->

  <NVLTest></NVLTest>
</template>
