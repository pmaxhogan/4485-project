<script setup lang="ts">
  import { type Node, NVL } from "@neo4j-nvl/base";
  import { onMounted, onUnmounted, useTemplateRef, shallowRef } from "vue";
  import {
    ZoomInteraction,
    PanInteraction,
    ClickInteraction,
    DragNodeInteraction,
  } from "@neo4j-nvl/interaction-handlers";

  const container = useTemplateRef("nvl-stuff");

  // needs to be a shallow ref because vue's ref() returns a Proxy to track reactive changes
  // NVL's methods (like new ZoomInteraction()) require that the original NVL instance be passed, not a Proxy
  // see also: https://vuejs.org/api/reactivity-advanced.html#shallowref
  // note that this will not track deep reactivity changes, only shallow ones
  const nvlRef = shallowRef<NVL>();

  const nvlSetup = () => {
    // vue method for a basic nvl test
    const nodes = [
      { id: "0", caption: "graphs" },
      { id: "1", caption: "everywhere" },
    ];
    const relationships = [{ from: "0", to: "1", id: "0-1", caption: "are" }];

    if (!container.value) return;
    nvlRef.value = new NVL(container.value, nodes, relationships, {
      initialZoom: 2.6,
      layout: "forceDirected",
    });

    const cInteraction = new ClickInteraction(nvlRef.value);
    cInteraction.updateCallback("onNodeClick", (node: Node) => {
      let isSelected = !node.selected;

      if (nvlRef.value)
        nvlRef.value.updateElementsInGraph(
          [{ id: node.id, selected: isSelected }],
          [],
        );
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const zoom = new ZoomInteraction(nvlRef.value);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const pan = new PanInteraction(nvlRef.value);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const dragNodeInteraction = new DragNodeInteraction(nvlRef.value);
  };

  onMounted(() => nvlSetup()); // once vue has finished mounting and page elements are already generated, nvlSetup will run

  onUnmounted(() => {
    nvlRef?.value?.destroy();
  });
</script>

<template>
  <h1>NVL test</h1>
  <p>this is a test of NVL!</p>
  <div></div>
  <div ref="nvl-stuff" class="graph"></div>
  <h2>Controls</h2>
  <ul>
    <li>Click and drag the background to move the scene.</li>
    <li>Scroll in and out to zoom.</li>
    <li>Click on a node to select/deselect it.</li>
    <li>Click and drag a node to move the node.</li>
  </ul>
</template>

<style scoped>
  .graph {
    margin: 0 auto;
    min-height: 50vh;
    background: rgba(255, 255, 255, 0.07);
  }
</style>
