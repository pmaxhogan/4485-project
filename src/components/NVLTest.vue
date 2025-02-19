<script setup lang="ts">
defineProps();

import { NVL } from '@neo4j-nvl/base'
import { onMounted, onUnmounted, ref, useTemplateRef } from "vue";
import { ZoomInteraction, PanInteraction } from '@neo4j-nvl/interaction-handlers'

const container = useTemplateRef("nvl-stuff");
const nvl = ref<NVL>();

const nvlSetup = () => { // vue method for a basic nvl test
    console.log("test");
    //console.log(container);
    const nodes = [{ id: '0', caption: 'graphs' }, { id: '1', caption: 'everywhere' }]
    const relationships = [{ from: '0', to: '1', id: '0-1', caption: 'are' }]


    if(!container.value) return;

    nvl.value = new NVL(container.value, nodes, relationships, { initialZoom: 2.6 })

    const zoom = new ZoomInteraction(nvl.value);
    const pan = new PanInteraction(nvl.value);
}

onMounted(() => nvlSetup()); // once vue has finished mounting and page elements are already generated, nvlSetup will run

onUnmounted(() => {
  nvl?.value?.destroy();
});

</script>

<template>
    <h1>NVL test</h1>
    <p>this is a test of NVL!</p>
    <div ></div>
    <div ref='nvl-stuff' class="graph"></div>
</template>

<style scoped>
  .graph{
    margin: 0 auto;
    min-height: 80vh;
    background: rgba(255, 255, 255, 0.07);
  }
</style>