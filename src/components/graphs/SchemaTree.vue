<script setup lang="ts">
  import VisualGraph from "./VisualGraph.vue";
  import { generateSchemaTree } from "../../graphs/genSchemaTree.ts";
  import { ref, defineExpose } from "vue";

  const nodes = ref();
  const rels = ref();
  const layoutDirection = ref<"down" | "up" | "left" | "right">("down"); //Default facing direction.
  const layout = ref<"hierarchical" | "forceDirected" | "d3Force" | "grid">(
    "d3Force",
  ); //Default layout.
  const verlet = ref<true | false>(false);
  const cytoscape = ref<true | false>(true);
  const packing = ref<"stack" | "bin">("stack");

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
  <label>
    <input type="radio" value="forceDirected" v-model="layout" />
    Force Directed
  </label>
  <label>
    <input type="radio" value="hierarchical" v-model="layout" />
    Hierarchical
  </label>
  <label>
    <input type="radio" value="d3Force" v-model="layout" />
    D3 Force
  </label>
  <label>
    <input type="radio" value="grid" v-model="layout" />
    Grid
  </label>
  <label>
    <input type="checkbox" v-model="verlet" />
    Verlet
  </label>
  <label>
    <input type="checkbox" v-model="cytoscape" />
    Cytoscape
  </label>
  <label>
    <input type="radio" value="stack" v-model="packing" />
    Stack
  </label>
  <label>
    <input type="radio" value="bin" v-model="packing" />
    Bin
  </label>
  <VisualGraph
    ref="visualGraphRef"
    :nodes="nodes"
    :rels="rels"
    :layoutDirection="layoutDirection"
    :layout="layout"
    :verlet="verlet"
    :cytoscape="cytoscape"
    :packing="packing"
    v-if="nodes?.length && rels?.length"
  />
</template>

<style scoped></style>
