<script setup lang="ts">
defineProps();

import { NVL } from '@neo4j-nvl/base'
// import { ref } from 'vue'
import { onMounted } from 'vue'
import { ZoomInteraction, PanInteraction } from '@neo4j-nvl/interaction-handlers'

const nvlSetup = () => { // vue method for a basic nvl test
    console.log("test");
    //console.log(container);
    const nodes = [{ id: '1' }, { id: '2' }]
    const relationships = [{ id: '12', from: '1', to: '2' }, {id: '21', from: '1', to: '2'}]

    //const nvl = new NVL(container!, nodes, relationships, { initialZoom: 2.6 });
    const nvl = new NVL(document.getElementById('nvl-stuff')!, nodes, relationships);
    const zoom = new ZoomInteraction(nvl)
    const pan = new PanInteraction(nvl)
    zoom; pan;
}

onMounted(() => nvlSetup()); // once vue has finished mounting and page elements are already generated, nvlSetup will run

</script>

<template>
    <h1>NVL test</h1>
    <p>this is a test of NVL!</p>
    <div ></div>
    <div id='nvl-stuff'></div>
</template>