<script setup lang="ts">
  import VisualGraph from "./VisualGraph.vue";
  import { generateSchemaTree } from "../../graphs/genSchemaTree.ts";
  import { ref } from "vue";

  const nodes = ref();
  const rels = ref();

  const genTree = async () => {
    const tree = await generateSchemaTree();

    if (!tree || !tree.nodes || !tree.edges) {
      console.error("Failed to generate schema tree.");
      return;
    }

    nodes.value = tree.nodes;
    rels.value = tree.edges;
  };
</script>

<template>
  <h2>Schema Tree</h2>
  <button @click="genTree">Generate Schema Tree</button>
  <VisualGraph :nodes="nodes" :rels="rels" />
</template>

<style scoped></style>
