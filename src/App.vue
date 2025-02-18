<script setup lang = "ts" >
import { ref, onMounted, onUnmounted } from 'vue';

const connectionStatus = ref('Checking connection...');
//let connectionInterval: ReturnType<typeof setInterval> | null = null; debug purposes - zt

//function to check Neo4j connection - ZT
const checkConnection = async () => {

  try {
    const status = await window.electronAPI.invoke('check-neo4j-connection');
    connectionStatus.value = status;
    console.log('Connection status:', status);
  } catch (error: any) {
    connectionStatus.value = 'Failed to connect to Neo4j.';
    console.error(error);
  }
};

//handling - ZT
function handleNeo4jLog(log) {
  console.log(`Neo4j Log: ${log}`);
}
function handleNeo4jError(error) {
  console.error(`Neo4j Error: ${error}`);
}
function handleNeo4jExit(code) {
  console.log(`Neo4j exited with code: ${code}`);
}

//mounting - ZT
onMounted(() => {
  //listen for events from the main process
  window.electronAPI.onNeo4jLog(handleNeo4jLog);
  window.electronAPI.onNeo4jError(handleNeo4jError);
  window.electronAPI.onNeo4jExit(handleNeo4jExit);

  //clear the polling interval, fixes sync issues since we aren't checking 24/7
  setTimeout(() => {

    checkConnection();

    window.electronAPI.runTestQuery();

  }, 10000);

  //sets up a timer to check the connection every 5 seconds
  //connectionInterval = setInterval(checkConnection, 5000); debug purposes
});

//cleanup listeners when the component unmounts - ZT
onUnmounted(() => {
  window.electronAPI.onNeo4jLog(() => { });
  window.electronAPI.onNeo4jError(() => { });
  window.electronAPI.onNeo4jExit(() => { });

});

</script>

<template>
  <div>
    <h1>Neo4j Connection Status</h1>
    <p>{{ connectionStatus }}</p>
    <input v-model="connectionStatus" type="text" placeholder="Connection Status" />
  </div>
</template>