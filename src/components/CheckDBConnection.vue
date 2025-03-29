<script setup lang="ts">
  import { onMounted, ref } from "vue";

  const connectionStatus = ref("Checking connection...");
  onMounted(() => {
    checkConnection();
  });

  const checkConnection = async () => {
    try {
      const status = await window.electronAPI.invoke("check-neo4j-connection");
      connectionStatus.value = status as string;
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
</script>

<template>
  <h2>Neo4j Connection Status</h2>
  <p>{{ connectionStatus }}</p>
</template>
