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

  const props = withDefaults(
    defineProps<{
      nodes?: Node[];
      rels?: Relationship[];
      layoutDirection: "down" | "up" | "left" | "right" | undefined; //for on the fly layout adjustment
    }>(),
    {
      nodes: () => [],
      rels: () => [],
      layoutDirection: "down",
    }
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
  const selectedNodeIds = ref<string[]>([]); // support multiple selected

  // mark selected nodes (and their children) as failed, or un-fail them
  type ExtendedNode = Node & { originalColor?: string };

const markSelectedNodeAsFailed = () => {
  if (!nvlRef.value || selectedNodeIds.value.length === 0) {
    console.log("No node selected or NVL not initialized");
    return;
  }

  console.log("Toggling failure state for:", selectedNodeIds.value);

  // Map parent → children
  const childMap = new Map<string, string[]>();
  props.rels.forEach((rel) => {
    if (!childMap.has(rel.from)) childMap.set(rel.from, []);
    childMap.get(rel.from)?.push(rel.to);
  });

  const allToToggle = new Set<string>();
  selectedNodeIds.value.forEach((nodeId) => {
    allToToggle.add(nodeId);
    (childMap.get(nodeId) || []).forEach((childId) => allToToggle.add(childId));
  });

  const updatedNodes = props.nodes.map((node) => {
    if (allToToggle.has(node.id)) {
      const isCurrentlyFailed = node.color === "#ff0000";
      const original = (node as ExtendedNode).originalColor || node.color;
      return {
        ...node,
        color: isCurrentlyFailed ? original : "#ff0000",
        originalColor: original,
      };
    }
    return node;
  });

  nvlRef.value.updateElementsInGraph(updatedNodes, []);
  console.log("Graph updated with toggled fail states");
};

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
      `Rendering ${props.nodes.length} nodes and ${props.rels.length} relationships`,
      props.rels
    );

    if (!container.value) return (updating.value = false);
    nvlRef.value = new NVL(container.value, [], [], {
      initialZoom: 0,
      layout: "hierarchical",
      renderer: "canvas",
      layoutOptions: {
        direction: props.layoutDirection,
      },
    });

    console.log("Adding elements to graph:", props.nodes, props.rels);

    nvlRef.value.addAndUpdateElementsInGraph(props.nodes, props.rels);

    click.value = new ClickInteraction(nvlRef.value);
    click.value.updateCallback("onNodeClick", (node: Node) => {
      const idx = selectedNodeIds.value.indexOf(node.id);
      if (idx !== -1) {
        selectedNodeIds.value.splice(idx, 1); // unselect
      } else {
        selectedNodeIds.value.push(node.id); // add
      }

      const updatedNodes = props.nodes.map((n) => ({
        ...n,
        selected: selectedNodeIds.value.includes(n.id),
      }));
      if (!nvlRef.value) {
  console.warn("NVL not initialized");
  return;
}

nvlRef.value.updateElementsInGraph(updatedNodes, []);
      console.log("Node clicked", node);
    });

    zoom.value = new ZoomInteraction(nvlRef.value);
    pan.value = new PanInteraction(nvlRef.value);
    drag.value = new DragNodeInteraction(nvlRef.value);

    nvlRef.value.fit(props.nodes.map((node) => node.id));

    await nextTick();
    console.log("Render complete");
  };

  // once vue has finished mounting and page elements are already generated, nvlSetup will run
  // function to capture the graph container as an image
  const captureGraphImage = async () => {
    if (!container.value) {
      console.log("Graph container not found");
      return;
    }

    try {
      // saveFullGraphToLargeFile is a method from the NVL library that captures the full graph as an image
      // but it forces a download of the image file instead of letting us capture the URL
      // so we intercept the .click() on the created <a> element to get the image data URL
      const oldClick = HTMLElement.prototype.click;
      HTMLElement.prototype.click = function () {
        if ("href" in this) {
          // restore the original click method
          HTMLElement.prototype.click = oldClick;

          const imageDataUrl = this.href as string;
          console.log(`saving image data URI ${imageDataUrl?.slice(0, 100)}...`);

          window.electronAPI.saveImageToExcel(imageDataUrl);
        }
      };

      nvlRef.value?.saveFullGraphToLargeFile({});
    } catch (error) {
      console.error("Error capturing graph image:", error);
    }
  };
  defineExpose({ captureGraphImage });

  onMounted(() => nvlSetup());
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

  <!---Button to mark failed node -->
  <button
    @click="markSelectedNodeAsFailed"
    :disabled="!selectedNodeIds.length"
    class="mark-failed-btn"
  >
    Mark Node As Failed
  </button>

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

.mark-failed-btn {
  margin: 10px 0;
  padding: 8px 16px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.mark-failed-btn:hover:not(:disabled) {
  background-color: #d32f2f;
}

.mark-failed-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
