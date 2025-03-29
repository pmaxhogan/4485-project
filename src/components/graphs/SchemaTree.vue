<script setup lang="ts">
  import VisualGraph from "./VisualGraph.vue";
  import { generateSchemaTree } from "../../graphs/genSchemaTree.ts";
  import { ref } from "vue";

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
  defineExpose({
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
  <VisualGraph :nodes="nodes" :rels="rels" :layoutDirection="layoutDirection" />
</template>

<style scoped></style>
