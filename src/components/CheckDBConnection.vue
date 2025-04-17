<script setup lang="ts">
  import { onMounted, ref } from "vue";
  import { ConnectionStatus } from "../global";

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
        console.error(error);
      } else {
        console.error("An unknown error occurred", error);
      }
    }
  };

  withDefaults(
    defineProps<{
      status: ConnectionStatus;
    }>(),
    {
      status: "CONNECTED",
    },
  );
</script>

<template>
  <template v-if="connectionStatus === 'ERROR'">
    <h2>Neo4j Connection Error</h2>
    <p>{{ connectionStatus }}</p>
  </template>
</template>
