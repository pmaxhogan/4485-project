<script setup lang="ts">
  import VisualGraph from "./VisualGraph.vue";
  import { generateSchemaTree } from "../../graphs/genSchemaTree.ts";
  import { ref, defineExpose } from "vue";

  const nodes = ref();
  const rels = ref();
  const layoutDirection = ref<"down" | "up" | "left" | "right">("down"); //Default facing direction.

  const toggleLayoutDirection = () => {
    layoutDirection.value = layoutDirection.value === "down" ? "right" : "down";
  };

  const genTree = async (summaryView: boolean) => {
    const tree = await generateSchemaTree(summaryView);

    if (!tree || !tree.nodes || !tree.edges) {
      console.error("Failed to generate schema tree.");
      nodes.value = [];
      rels.value = [];
      return;
    }

    nodes.value = tree.nodes;
    rels.value = tree.edges;
  };

  //expose refs for testing

  const visualGraphRef = ref<InstanceType<typeof VisualGraph> | null>(null);
  // expose captureGraphImage from VisualGraph to be called in App.vue
  defineExpose({
    captureGraphImage: async () => {
      if (visualGraphRef.value) {
        await visualGraphRef.value.captureGraphImage(); // call the method in VisualGraph
      }
    },
    nodes,
    rels,
    layoutDirection,
    genTree,
    toggleLayoutDirection,
  });
</script>

<template>
  <h2>Schema Tree</h2>
  <button @click="genTree(true)">Generate Schema Graph</button>
  <button @click="genTree(false)">Generate Data Graph</button>
  <button @click="toggleLayoutDirection">
    Toggle Direction ({{ layoutDirection }})
  </button>
  <VisualGraph
    ref="visualGraphRef"
    :nodes="nodes"
    :rels="rels"
    :layoutDirection="layoutDirection"
  />
</template>

<style scoped></style>