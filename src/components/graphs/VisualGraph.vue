<script setup lang="ts">
  import { type Node, NVL, type Relationship } from "@neo4j-nvl/base";
  import {
    nextTick,
    onMounted,
    onUnmounted,
    ref,
    shallowRef,
    useTemplateRef,
    watch,
  } from "vue";
  import {
    ClickInteraction,
    DragNodeInteraction,
    PanInteraction,
    ZoomInteraction,
    LassoInteraction,
    BoxSelectInteraction,
  } from "@neo4j-nvl/interaction-handlers";

  const props = withDefaults(
    defineProps<{
      nodes?: Node[];
      rels?: Relationship[];
      layoutDirection?: "down" | "up" | "left" | "right" | undefined; //for on the fly layout adjustment
      layout?:
        | "hierarchical"
        | "forceDirected"
        | "d3Force"
        | "grid"
        | undefined;
      /**
       * layout: "hierarchical", // very structured
       * layout: "forceDirected", // pretty organic, not very structured
       * layout: "d3Force", // the most organic, slow
       * layout: "grid", // the most structured, not very useful
       */
      verlet?: boolean;
      cytoscape?: boolean;
      packing?: "stack" | "bin";
    }>(),
    {
      nodes: () => [],
      rels: () => [],
      layoutDirection: "down",
      layout: "hierarchical",
      verlet: true,
      cytoscape: true,
      packing: "stack",
    },
  );

  const MAX_WAIT_FOR_LAYOUT = 2000; // ms

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
  const lasso = shallowRef<LassoInteraction>();
  const boxSelect = shallowRef<BoxSelectInteraction>();

  const C_A = 14.51585;
  const C_B = -0.623952;
  const C_C = 0.00190282;
  const C_D = 0.454304;

  const updating = ref(false);
  const updatingTimeout = ref<number | null>(null);

  const selectedNodeIds = ref<string[]>([]); // support multiple selected
  // mark selected nodes (and their children) as failed, or un-fail them
  type ExtendedNode = Node & { originalColor?: string };
  const markSelectedNodeAsFailed = () => {
    if (!nvlRef.value || selectedNodeIds.value.length === 0) {
      console.log(
        "No node selected or NVL not initialized",
        selectedNodeIds.value,
      );
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
      (childMap.get(nodeId) || []).forEach((childId) =>
        allToToggle.add(childId),
      );
    });

    const updatedNodes = nvlRef.value
      ?.getNodes()
      .filter((node) => allToToggle.has(node.id))
      .map((node) => {
        const isCurrentlyFailed = node.color === "#ff0000";
        const original = (node as ExtendedNode).originalColor || node.color;
        return {
          ...node,
          color: isCurrentlyFailed ? original : "#ff0000",
          originalColor: original,
          selected: false, // Clear the selection after marking
        };
      });

    nvlRef.value.updateElementsInGraph(updatedNodes, []);
    selectedNodeIds.value = []; // Clear the selection IDs
    console.log("Graph updated with toggled fail states", updatedNodes);
  };

  const selectionMode = ref<"lasso" | "box">("lasso");
  const setupSelectionTools = () => {
    if (!nvlRef.value) return;
    console.log("setupSelectionTools called; nvlRef =", nvlRef.value);
    lasso.value?.destroy();
    boxSelect.value?.destroy();

    const handleSelection = (nodes: Node[]) => {
      selectedNodeIds.value = nodes.map((n: Node) => n.id);
      nvlRef.value!.updateElementsInGraph(
        nvlRef.value!.getNodes().map((node: Node) => ({
          ...node,
          selected: selectedNodeIds.value.includes(node.id),
          highlighted: false,
        })),
        [],
      );
    };

    const updateSelectionHandler = (nodes: Node[]) => {
      nvlRef.value!.updateElementsInGraph(
        nodes.map((n: Node) => ({ ...n, highlighted: true })),
        [],
      );
      handleSelection(nodes);
    };

    if (selectionMode.value === "box") {
      boxSelect.value = new BoxSelectInteraction(nvlRef.value, {
        selectOnRelease: true,
      });
      boxSelect.value.updateCallback(
        "onBoxSelect",
        (event: { nodes: Node[] }) => {
          const { nodes } = event;
          updateSelectionHandler(nodes);
        },
      );
    } else {
      lasso.value = new LassoInteraction(nvlRef.value, {
        selectOnRelease: true,
      });
      lasso.value.updateCallback(
        "onLassoSelect",
        (event: { nodes: Node[] }) => {
          const { nodes } = event;
          updateSelectionHandler(nodes);
        },
      );
    }
  };

  const toggleSelectionMode = () => {
    selectionMode.value = selectionMode.value === "lasso" ? "box" : "lasso";
    setupSelectionTools();
  };

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const zoomToFit = async () => {
    if (!nvlRef.value) return;

    nvlRef.value.fit(
      props.nodes.map((node) => node.id),
      { animated: true },
    );
    console.log("Zoomed to fit");
  };

  const postSetup = async () => {
    if (!nvlRef.value) return;

    await nextTick();
    await sleep(props.nodes.length);

    if (props.layout === "forceDirected") {
      if (props.nodes.length > 200) {
        const x = props.nodes.length;
        const zoomScale = C_A * x ** C_B + C_C * x ** C_D;
        console.log("zooming with heuristic", zoomScale);
        nvlRef.value.setZoomAndPan(zoomScale, 0, 0);
      } else {
        console.log("simple directed, no extra zoom");
      }
    } else {
      console.log("not directed, no extra zoom");
    }
  };

  const nvlSetup = async () => {
    if (nvlRef.value) {
      lasso.value = new LassoInteraction(nvlRef.value);
      selectionMode.value = "lasso";
      nvlRef.value.destroy();
      click.value?.destroy();
      zoom.value?.destroy();
      pan.value?.destroy();
      drag.value?.destroy();
      await nextTick();
    }
    console.log(
      `Rendering ${props.nodes.length} nodes and ${props.rels.length} relationships`,
    );

    if (!container.value) return;

    nvlRef.value = new NVL(
      container.value,
      [],
      [],
      {
        initialZoom: 0.2,
        layout: props.layout,
        renderer: "canvas",
        layoutOptions: {
          gravity: 0.00005,
          direction: "right", //props.layoutDirection, //layout passed from the parent here
          packing: props.packing,
          enableVerlet: props.verlet,
          enableCytoscape: props.cytoscape,
        },
        logging: {
          level: "info",
        },
      },
      {
        onLayoutDone() {
          if (updating.value) {
            updating.value = false;
            console.log("Layout Done");
            if (updatingTimeout.value !== null) {
              clearTimeout(updatingTimeout.value);
            }

            zoomToFit();
            return;
          }
        },
      },
    );

    console.log(
      "Adding elements to graph:",
      props.nodes.length,
      props.rels.length,
    );

    nvlRef.value.addAndUpdateElementsInGraph(props.nodes, props.rels);

    click.value = new ClickInteraction(nvlRef.value);
    click.value.updateCallback("onNodeClick", (node: Node) => {
      if (!nvlRef.value) return;

      // Toggle selection for this node
      const newSelected = new Set(selectedNodeIds.value);
      if (newSelected.has(node.id)) {
        newSelected.delete(node.id);
      } else {
        newSelected.add(node.id);
      }
      selectedNodeIds.value = Array.from(newSelected);

      // Update visual selection
      nvlRef.value.updateElementsInGraph(
        nvlRef.value.getNodes().map((n) => ({
          ...n,
          selected: newSelected.has(n.id),
          highlighted: false, // Clear any highlight
        })),
        [],
      );
    });

    const currentZoom = ref(1.0); // Using Vue's ref instead of let

    zoom.value = new ZoomInteraction(nvlRef.value);
    zoom.value.updateCallback("onZoom", (zoomLevel) => {
      currentZoom.value = zoomLevel; // Update the reactive value
    });

    //PanInteraction
    container.value?.addEventListener("contextmenu", (e) => e.preventDefault());

    let isRightClickPanning = false;
    let lastPosition = { x: 0, y: 0 };

    container.value?.addEventListener("mousedown", (e) => {
      if (e.button !== 2) return; // Only right-click
      isRightClickPanning = true;
      lastPosition = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    });

    container.value?.addEventListener("mousemove", (e) => {
      if (!isRightClickPanning) return;

      const deltaX = e.clientX - lastPosition.x;
      const deltaY = e.clientY - lastPosition.y;
      lastPosition = { x: e.clientX, y: e.clientY };

      if (nvlRef.value) {
        const zoomFactor = 1 / currentZoom.value; // Access reactive value
        const currentPan = nvlRef.value.getPan();
        nvlRef.value.setPan(
          currentPan.x - deltaX * zoomFactor,
          currentPan.y - deltaY * zoomFactor,
        );
      }
    });

    container.value?.addEventListener("mouseup", (e) => {
      if (e.button === 2) {
        isRightClickPanning = false;
      }
    });

    drag.value = new DragNodeInteraction(nvlRef.value);

    console.log("Render complete");
    setupSelectionTools();
    await postSetup();
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
      HTMLElement.prototype.click = async function () {
        if ("href" in this) {
          // restore the original click method
          HTMLElement.prototype.click = oldClick;

          if (this.href === "data:,") {
            return console.error(
              "Image data URI is empty, is the image too big?",
            );
          }

          const imageDataUrl = this.href as string;
          console.log(
            `saving image data URI ${imageDataUrl?.slice(0, 100)}...`,
            this,
          );

          img.value = URL.createObjectURL(
            await fetch(imageDataUrl).then((r) => r.blob()),
          );

          await window.electronAPI.saveImageToExcel(imageDataUrl);
        }
      };

      nvlRef.value?.saveFullGraphToLargeFile({});
    } catch (error) {
      console.error("Error capturing graph image:", error);
    }
  };
  defineExpose({ captureGraphImage });

  onMounted(() => {
    nvlSetup();
  }); // once vue has finished mounting and page elements are already generated, nvlSetup will run

  watch([() => props.nodes, () => props.rels], nvlSetup, {
    flush: "post",
    deep: true,
  });

  watch([() => props.layout], () => {
    if (nvlRef.value) {
      nvlRef.value.setLayout(props.layout);
      postSetup();
    }
  });

  watch(
    [
      () => props.layoutDirection,
      () => props.verlet,
      () => props.cytoscape,
      () => props.packing,
    ],
    () => {
      if (nvlRef.value) {
        const newOptions = {
          ...(nvlRef.value.getCurrentOptions().layoutOptions ?? {}),
          direction: props.layoutDirection,
          enableVerlet: props.verlet,
          enableCytoscape: props.cytoscape,
        };
        console.log("New layout options", newOptions);
        nvlRef.value.setLayoutOptions(newOptions);
        nvlRef.value.restart();
        postSetup();
      }
    },
  );

  watch(
    () => props,
    () => {
      if (updatingTimeout.value !== null) {
        clearTimeout(updatingTimeout.value);
      }
      updating.value = true;
      updatingTimeout.value = setTimeout(() => {
        if (updatingTimeout.value !== null) clearTimeout(updatingTimeout.value);
        updatingTimeout.value = null;

        console.warn("gave up waiting for layout");
        zoomToFit();
      }, MAX_WAIT_FOR_LAYOUT) as unknown as number; // the types are not great
    },
    {
      immediate: true,
      deep: true,
    },
  );

  onUnmounted(() => {
    lasso.value?.destroy();
    boxSelect.value?.destroy();
    nvlRef?.value?.destroy();
  });

  const img = ref<string | null>(null);
  const debugImg = ref<boolean>(false);
</script>

<template>
  <h2>Graph</h2>
  <button @click="zoomToFit">Zoom to Fit</button>
  <!---Button to mark failed node -->
  <button
    @click="markSelectedNodeAsFailed"
    :disabled="!selectedNodeIds.length"
    class="mark-failed-btn"
  >
    Toggle Node Failure
  </button>

  <button @click="toggleSelectionMode" class="selection-mode-btn">
    {{
      selectionMode === "lasso" ?
        "Switch to Box Select"
      : "Switch to Lasso Select"
    }}
  </button>

  <div v-if="props.nodes.length" ref="nvl-container" class="graph"></div>
  <div v-else class="graph">No nodes to display...</div>
  <h2>Controls</h2>
  <ul>
    <li>Right-click and drag the background to move the scene.</li>
    <li>Scroll in and out to zoom.</li>
    <li>Click on a node to select/deselect it.</li>
    <li>Left-click and drag to lasso or box select multiple nodes.</li>
    <li>Click and drag a node to move the node.</li>
    <li>Select a node to mark it as failed.</li>
  </ul>

  <img v-if="img && debugImg" :src="img" alt="Graph Image" />
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
