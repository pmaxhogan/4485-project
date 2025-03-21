<script setup lang="ts">
  import VisualGraph from "./VisualGraph.vue";
  import { generateSchemaTree } from "../../graphs/genSchemaTree.ts";
  import { ref, defineExpose } from "vue";

  const nodes = ref();
  const rels = ref();

  const genTree = async () => {
    const tree = await generateSchemaTree();
    nodes.value = tree.nodes;
    rels.value = tree.rels;
  };

  const visualGraphRef = ref<InstanceType<typeof VisualGraph> | null>(null);
  // expose captureGraphImage from VisualGraph to be called in App.vue
  defineExpose({
    captureGraphImage: async () => {
      if (visualGraphRef.value) {
        await visualGraphRef.value.captureGraphImage(); // call the method in VisualGraph
      }
    }
  });
</script>

<template>
  <h2>Schema Tree</h2>
  <button @click="genTree">Generate Schema Tree</button>
  <VisualGraph ref="visualGraphRef" :nodes="nodes" :rels="rels" />
</template>

<style scoped></style>
