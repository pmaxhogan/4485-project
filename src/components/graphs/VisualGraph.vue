<script setup lang="ts">
  import { type Node, NVL, type Relationship } from "@neo4j-nvl/base";
  import {
    computed,
    nextTick,
    onBeforeUnmount,
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
    LassoInteraction,
    BoxSelectInteraction,
    ZoomInteraction,
  } from "@neo4j-nvl/interaction-handlers";
  import LoadingSpinner from "../LoadingSpinner.vue";

  /**
   * layout: "hierarchical", // very structured
   * layout: "forceDirected", // pretty organic, not very structured
   * layout: "d3Force", // the most organic, slow
   * layout: "grid", // the most structured, not very useful
   */
  const layout = ref<"hierarchical" | "forceDirected" | "d3Force" | "grid">(
    "d3Force",
  ); //Default layout.

  const verlet = ref<true | false>(false);
  const cytoscape = ref<true | false>(true);
  const layoutDirection = ref<"down" | "up" | "left" | "right">("down"); //Default facing direction.
  const packing = ref<"stack" | "bin">("stack");

  const props = withDefaults(
    defineProps<{
      nodes?: Node[];
      rels?: Relationship[];
      loading?: boolean;
    }>(),
    {
      nodes: () => [],
      rels: () => [],
      loading: false,
    },
  );

  const MAX_WAIT_FOR_LAYOUT = 4000; // ms

  const container = useTemplateRef("nvl-container");

  // needs to be a shallow ref because vue's ref() returns a Proxy to track reactive changes
  // NVL's methods (like new ZoomInteraction()) require that the original NVL instance be passed, not a Proxy
  // see also: https://vuejs.org/api/reactivity-advanced.html#shallowref
  // note that this will not track deep reactivity changes, only shallow ones
  const nvlRef = shallowRef<NVL>();
  const click = shallowRef<ClickInteraction>();
  const zoom = shallowRef<ZoomInteraction>();
  const drag = shallowRef<DragNodeInteraction>();
  const lasso = shallowRef<LassoInteraction>();
  const boxSelect = shallowRef<BoxSelectInteraction>();

  const C_A = 14.51585;
  const C_B = -0.623952;
  const C_C = 0.00190282;
  const C_D = 0.454304;

  const updating = ref(false);
  const updatingTimeout = ref<number | null>(null);

  const selectedNodeIds = () =>
    nvlRef.value?.getSelectedNodes().map((n) => n.id) ?? [];
  // mark selected nodes (and their children) as failed, or un-fail them
  type ExtendedNode = Node & { originalColor?: string };
  const markSelectedNodeAsFailed = () => {
    counter.value++;
    if (!nvlRef.value || selectedNodeIds().length === 0) {
      console.log("No node selected or NVL not initialized", selectedNodeIds());
      return;
    }

    console.log("Toggling failure state for:", selectedNodeIds());

    // Map parent → children
    const childMap = new Map<string, string[]>();
    props.rels.forEach((rel) => {
      if (!childMap.has(rel.from)) childMap.set(rel.from, []);
      childMap.get(rel.from)?.push(rel.to);
    });

    const allToToggle = new Set<string>();
    selectedNodeIds().forEach((nodeId) => {
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
    console.log("Graph updated with toggled fail states", updatedNodes);
  };

  const mouseMode = ref<"pointer" | "lasso" | "box" | "drag">("pointer");
  const setupSelectionTools = () => {
    if (!nvlRef.value) return;
    lasso.value?.destroy();
    boxSelect.value?.destroy();
    drag.value?.destroy();
    click.value?.destroy();

    if (mouseMode.value === "box") {
      boxSelect.value = new BoxSelectInteraction(nvlRef.value, {
        selectOnRelease: true,
      });
    } else if (mouseMode.value === "lasso") {
      lasso.value = new LassoInteraction(nvlRef.value, {
        selectOnRelease: true,
      });
    } else if (mouseMode.value === "pointer") {
      click.value = new ClickInteraction(nvlRef.value, {
        selectOnClick: false,
      });
      click.value.updateCallback("onNodeClick", (node: Node) => {
        if (!nvlRef.value) return;

        nvlRef.value.updateElementsInGraph(
          [{ id: node.id, selected: !node.selected }],
          [],
        );
      });
      click.value.updateCallback("onNodeDoubleClick", (node: Node) => {
        if (!nvlRef.value) return;

        counter.value++;
        nvlRef.value.deselectAll();
        nvlRef.value.updateElementsInGraph(
          [{ id: node.id, selected: true }],
          [],
        );
      });
      click.value.updateCallback("onCanvasDoubleClick", () => {
        if (!nvlRef.value) return;

        counter.value++;
        nvlRef.value.deselectAll();
      });
    } else if (mouseMode.value === "drag") {
      drag.value = new DragNodeInteraction(nvlRef.value);
    }
  };

  watch(mouseMode, () => setupSelectionTools());

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

  const isRightClickPanning = ref(false);

  const postSetup = async () => {
    if (!nvlRef.value) return;

    await nextTick();
    await sleep(props.nodes.length);

    if (layout.value === "forceDirected") {
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

  const counter = ref(0);

  const isLMouseDown = ref(false);
  const isRMouseDown = ref(false);

  const nvlSetup = async () => {
    if (nvlRef.value) {
      nvlRef.value.destroy();
      lasso.value?.destroy();
      boxSelect.value?.destroy();
      click.value?.destroy();
      drag.value?.destroy();
      zoom.value?.destroy();
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
        layout: layout.value,
        renderer: "webgl",
        layoutOptions: {
          gravity: 0.00005,
          direction: "right", //layout.valueDirection, //layout passed from the parent here
          packing: packing.value,
          enableVerlet: verlet.value,
          enableCytoscape: cytoscape.value,
        },
        /*logging: {
          level: "info",
        },*/
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

    function deepClone<T>(obj: T): T {
      return JSON.parse(JSON.stringify(obj));
    }

    function deepCloneNodes(nodes: Node[]): Node[] {
      const newNodes: Node[] = [];
      for (const node of nodes) {
        const { html, ...oldNode } = node;
        newNodes.push({
          ...deepClone(oldNode),
          html,
        });
      }
      return newNodes;
    }

    await nextTick();

    nvlRef.value.addAndUpdateElementsInGraph(
      deepCloneNodes(props.nodes),
      deepClone(props.rels),
    );

    zoom.value = new ZoomInteraction(nvlRef.value);
    container.value?.addEventListener("contextmenu", (e) => e.preventDefault());

    let lastPosition = { x: 0, y: 0 };

    const handleMouseDown = (e: MouseEvent) => {
      counter.value++;

      if (e.button === 0) {
        isLMouseDown.value = true;
      } else if (e.button === 2) {
        isRMouseDown.value = true;
      }

      if (e.button !== 2) return; // Only right-click
      isRightClickPanning.value = true;
      lastPosition = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isRightClickPanning.value) return;

      if (nvlRef.value) {
        const zoom = nvlRef.value.getScale();
        const { x, y } = nvlRef.value.getPan();
        const dx =
          ((e.clientX - lastPosition.x) / zoom) * window.devicePixelRatio;
        const dy =
          ((e.clientY - lastPosition.y) / zoom) * window.devicePixelRatio;
        nvlRef.value.setPan(x - dx, y - dy);
        lastPosition = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightClickPanning.value = false;
        isRMouseDown.value = false;
      } else if (e.button === 0) {
        isLMouseDown.value = false;
      }
    };

    const handleMouseLeave = () => {
      isRightClickPanning.value = false; //stop panning when mouse leaves the container
    };

    container.value?.addEventListener("mousedown", handleMouseDown);
    container.value?.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    onBeforeUnmount(() => {
      container.value?.removeEventListener("mousedown", handleMouseDown);
      container.value?.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    });

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
            `saving image data URI ${imageDataUrl?.slice(0, 50)}...`,
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
  });

  watch([() => layout.value], () => {
    if (nvlRef.value) {
      nvlRef.value.setLayout(layout.value);
      postSetup();
    }
  });

  watch(
    [
      () => layoutDirection.value,
      () => verlet.value,
      () => cytoscape.value,
      () => packing.value,
    ],
    () => {
      if (nvlRef.value) {
        const newOptions = {
          ...(nvlRef.value.getCurrentOptions().layoutOptions ?? {}),
          direction: layoutDirection.value,
          enableVerlet: verlet.value,
          enableCytoscape: cytoscape.value,
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
        updating.value = false;
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

  const showControls = ref<boolean>(false);

  const isLoading = computed(
    () => props.loading || (props.nodes?.length && updating.value),
  );
</script>

<template>
  <div class="graph-container">
    <!--    <h2>Graph</h2>-->
    <div class="graph-controls">
      <button @click="zoomToFit">Zoom to Fit</button>
      <!---Button to mark failed node -->
      <hr />

      <h3>Cursor</h3>
      <button
        @click="mouseMode = 'pointer'"
        :disabled="mouseMode === 'pointer'"
      >
        Pointer
      </button>
      <button @click="mouseMode = 'drag'" :disabled="mouseMode === 'drag'">
        Move
      </button>
      <button @click="mouseMode = 'lasso'" :disabled="mouseMode === 'lasso'">
        Lasso
      </button>
      <button @click="mouseMode = 'box'" :disabled="mouseMode === 'box'">
        Box
      </button>
      <hr />

      <button
        @click="
          () => {
            nvlRef?.deselectAll();
            counter++;
          }
        "
        :disabled="!selectedNodeIds().length"
        class="mark-failed-btn"
        :key="counter"
      >
        Deselect All
      </button>
      <button
        @click="markSelectedNodeAsFailed"
        :disabled="!selectedNodeIds().length"
        class="mark-failed-btn"
        :key="counter"
      >
        Toggle Failure ({{ selectedNodeIds().length }})
      </button>
      <hr />

      <template v-if="layout === 'hierarchical' || layout === 'grid'">
        <button
          @click="layoutDirection = 'up'"
          :disabled="layoutDirection === 'up'"
        >
          ⮝
        </button>
        <button
          @click="layoutDirection = 'down'"
          :disabled="layoutDirection === 'down'"
        >
          ⮟
        </button>
        <button
          @click="layoutDirection = 'left'"
          :disabled="layoutDirection === 'left'"
        >
          ⮜
        </button>
        <button
          @click="layoutDirection = 'right'"
          :disabled="layoutDirection === 'right'"
        >
          ⮞
        </button>
        <hr />
      </template>
      <h3>Layout</h3>
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
      <hr />
      <h3>Renderer</h3>
      <label>
        <input type="checkbox" v-model="verlet" />
        Verlet
      </label>
      <label>
        <input type="checkbox" v-model="cytoscape" />
        Cytos
      </label>
      <hr />
      <template v-if="layout === 'hierarchical'">
        <label>
          <input type="radio" value="stack" v-model="packing" />
          Stack
        </label>
        <label>
          <input type="radio" value="bin" v-model="packing" />
          Bin
        </label>
        <hr />
      </template>
      <button @click="showControls = !showControls">Help</button>
    </div>

    <div class="graph-holder">
      <div
        v-if="props.nodes.length || isLoading"
        class="graph-loader"
        :class="{ 'graph-loading': isLoading }"
      >
        <LoadingSpinner />
      </div>
      <div class="graph-help" :class="{ 'graph-show-help': showControls }">
        <h2>Controls</h2>
        <ul>
          <li>Right-click and drag the background to move the scene.</li>
          <li>Scroll in and out to zoom.</li>
          <li>Click on a node to select/deselect it.</li>
          <li>Left-click and drag to lasso or box select multiple nodes.</li>
          <li>Click and drag a node to move the node.</li>
          <li>Select a node to mark it as failed.</li>
        </ul>
        <button @click="showControls = false">Ok</button>
      </div>
      <div
        ref="nvl-container"
        class="graph"
        v-if="props.nodes.length"
        :class="{
          'graph-loading': isLoading,
          'graph-panning': isRightClickPanning,
          ['graph-cursor-' + mouseMode]: true,
          'graph-l-mouse-down': isLMouseDown,
          'graph-r-mouse-down': isRMouseDown,
        }"
        @click="counter++"
      ></div>
      <div v-else class="graph graph-empty">No nodes to display...</div>
    </div>
    <div class="graph-footer">
      <button @click="captureGraphImage">Save Graph Image to CMDB</button>
    </div>
  </div>

  <img v-if="img && debugImg" :src="img" alt="Graph Image" />
</template>

<style>
  .graph.graph-empty {
    align-content: center;
    text-align: center;
  }

  .graph-node {
    --p: 1px;
    min-height: 100%;
    max-height: 100%;
    width: 100%;
    border-radius: 50%;
    font-size: 6px;
    text-align: center;
    line-height: 1;
    height: 40px;
    padding: 11% 0 11%;
    overflow: hidden;
    color: black;
    word-break: auto-phrase;
  }
  .graph-node .aligner,
  .graph-node::before {
    content: "";
    float: left;
    height: 100%;
    width: 50%;
    shape-outside: radial-gradient(
      farthest-side at right,
      transparent calc(100% - var(--p)),
      #fff 0
    );
  }

  .graph-node .aligner {
    float: right;
    shape-outside: radial-gradient(
      farthest-side at left,
      transparent calc(100% - var(--p)),
      #fff 0
    );
  }
</style>
