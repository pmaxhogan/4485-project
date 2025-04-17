<script setup lang="ts">
  import VisualGraph from "./VisualGraph.vue";
  import { generateSchemaTree } from "../../graphs/genSchemaTree.ts";
  import { ref, defineExpose } from "vue";

  const nodes = ref();
  const rels = ref();

  const key = ref(0);

  const isSummary = ref(false);
  const loading = ref(false);
  const genTree = async (summaryView: boolean) => {
    loading.value = true;
    nodes.value = [];
    rels.value = [];
    key.value++;

    const tree = await generateSchemaTree(summaryView);
    loading.value = false;

    if (!tree || !tree.nodes || !tree.edges) {
      console.error("Failed to generate schema tree.");
      return;
    }

    isSummary.value = summaryView;

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
    genTree,
  });
</script>

<template>
  <button :disabled="nodes?.length && isSummary" @click="genTree(true)">
    Schema Graph
  </button>
  <button :disabled="nodes?.length && !isSummary" @click="genTree(false)">
    Data Graph
  </button>
  <VisualGraph
    ref="visualGraphRef"
    :nodes="nodes"
    :rels="rels"
    :key="key"
    :loading
  />
</template>

<style scoped></style>
