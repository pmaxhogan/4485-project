<script setup lang="ts">
  import { type Node, type Relationship, NVL } from "@neo4j-nvl/base";
  import {
    onMounted,
    onUnmounted,
    useTemplateRef,
    shallowRef,
    watch,
    nextTick,
    ref,
  } from "vue";
  import {
    ZoomInteraction,
    PanInteraction,
    ClickInteraction,
    DragNodeInteraction,
  } from "@neo4j-nvl/interaction-handlers";
  import { toJpeg } from "html-to-image";

  const props = withDefaults(
    defineProps<{
      nodes?: Node[];
      rels?: Relationship[];
    }>(),
    {
      nodes: () => [],
      rels: () => [],
    },
  );

  const container = useTemplateRef("nvl-container");

  // needs to be a shallow ref because vue's ref() returns a Proxy to track reactive changes
  // NVL's methods (like new ZoomInteraction()) require that the original NVL instance be passed, not a Proxy
  // see also: https://vuejs.org/api/reactivity-advanced.html#shallowref
  // note that this will not track deep reactivity changes, only shallow ones
  const nvlRef = shallowRef<NVL>();
  const click = shallowRef<ClickInteraction>();
  const zoom = shallowRef<ZoomInteraction>();
  const pan = shallowRef<PanInteraction>();
  const drag = shallowRef<DragNodeInteraction>();

  const updating = ref(false);

  const nvlSetup = async () => {
    if (nvlRef.value) {
      nvlRef.value.destroy();
      click.value?.destroy();
      zoom.value?.destroy();
      pan.value?.destroy();
      drag.value?.destroy();
      await nextTick();
    }
    console.log(
      `rendering ${props.nodes.length} nodes and ${props.rels.length} relationships`,
    );

    if (!container.value) return (updating.value = false);
    nvlRef.value = new NVL(container.value, props.nodes, props.rels, {
      initialZoom: 2.6,
      layout: "forceDirected",
    });

    nvlRef.value.addAndUpdateElementsInGraph();

    click.value = new ClickInteraction(nvlRef.value);
    click.value.updateCallback("onNodeClick", (node: Node) => {
      let isSelected = !node.selected;

      console.log("Node clicked", node);

      if (nvlRef.value)
        nvlRef.value.updateElementsInGraph(
          [{ id: node.id, selected: isSelected }],
          [],
        );
    });

    zoom.value = new ZoomInteraction(nvlRef.value);
    pan.value = new PanInteraction(nvlRef.value);
    drag.value = new DragNodeInteraction(nvlRef.value);

    nvlRef.value.fit(props.nodes.map((node) => node.id));

    await nextTick();
    console.log("Render complete");
  };

  // function to capture the graph as an image
  const captureGraphImage = async () => {
    if (!container.value) {
      console.log("Graph container not found");
      return;
    }

    try {
      // capture the image as data url
      const imageDataUrl = await toJpeg(container.value, { quality: 0.9 });

      window.electronAPI.saveImageToExcel(imageDataUrl);
    } catch (error) {
      console.error("Error capturing graph image:", error);
    }
  };
  defineExpose({ captureGraphImage });

  onMounted(() => nvlSetup()); // once vue has finished mounting and page elements are already generated, nvlSetup will run

  watch([() => props.nodes, () => props.rels], nvlSetup, {
    flush: "post",
    deep: true,
  });

  onUnmounted(() => {
    nvlRef?.value?.destroy();
  });
</script>

<template>
  <h2>Graph</h2>
  <div v-if="props.nodes.length" ref="nvl-container" class="graph"></div>
  <div v-else class="graph">No nodes to display...</div>
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
    min-height: 80vh;
    background: rgba(255, 255, 255, 0.07);
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
