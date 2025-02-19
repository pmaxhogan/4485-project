<script setup lang="ts">
defineProps();

import { NVL } from '@neo4j-nvl/base'
import { onMounted, onUnmounted, ref, useTemplateRef, toRaw } from "vue";
import { ZoomInteraction, PanInteraction, ClickInteraction, DragNodeInteraction } from '@neo4j-nvl/interaction-handlers'

const container = useTemplateRef("nvl-stuff");
// const nvl = ref<NVL>();  // for passing nvl as a prop with vue
                            // if you do this, call toRaw when you pass it through
                            // nvl interaction handlers to stop it from breaking.
                            // basically find and replace nvl -> toRaw(nvl.value)
                            // from after line 25-26 onwards
let nvl: NVL;

const nvlSetup = () => { // vue method for a basic nvl test
    console.log("test");
    //console.log(container);
    const nodes = [{ id: '0', caption: 'graphs' }, { id: '1', caption: 'everywhere' }]
    const relationships = [{ from: '0', to: '1', id: '0-1', caption: 'are' }]


    if(!container.value) return;
    // uncomment nvl.value if you use make nvl a ref
    nvl = new NVL(container.value, nodes, relationships, { initialZoom: 2.6, layout: "forceDirected" })
    // nvl.value = new NVL(container.value, nodes, relationships, { initialZoom: 2.6, layout: "forceDirected" });

    // console.log(nvl.value);
    // console.log(nvl);
    const cInteraction = new ClickInteraction(nvl);
    cInteraction.updateCallback('onNodeClick', (node: any) => 
    {
        console.log(node);

        let isSelected = node.selected? false: true;
        nvl.updateElementsInGraph([{ id: node.id, selected: isSelected }], []);
    })
    const zoom = new ZoomInteraction(nvl);
    const pan = new PanInteraction(nvl);
    const dragNodeInteraction = new DragNodeInteraction(nvl);
}

onMounted(() => nvlSetup()); // once vue has finished mounting and page elements are already generated, nvlSetup will run

onUnmounted(() => {
  //nvl?.value?.destroy();
  nvl.destroy();
});

</script>

<template>
    <h1>NVL test</h1>
    <p>this is a test of NVL!</p>
    <div ></div>
    <div ref='nvl-stuff' class="graph"></div>
    <h2>Controls</h2>
    <ul>
        <li>Click and drag the background to move the scene.</li>
        <li>Scroll in and out to zoom.</li>
        <li>Click on a node to select/deselect it.</li>
        <li>Click and drag a node to move the node.</li>
    </ul>
</template>

<style scoped>
  .graph{
    margin: 0 auto;
    min-height: 50vh;
    background: rgba(255, 255, 255, 0.07);
  }
</style>