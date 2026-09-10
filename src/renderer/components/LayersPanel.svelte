<script lang="ts">
  import { scene, selectNode, updateNode } from "$lib/engine/scene";
  import { kindLabel } from "$lib/engine/types";
  import type { SceneNode } from "$lib/engine/types";

  let nodes = $state<SceneNode[]>([]);
  let selectedId = $state<string | undefined>(undefined);

  scene.subscribe((s) => {
    nodes = [...s.nodes].reverse();
    selectedId = s.selectedId;
  });

  const toggleVisible = (node: SceneNode, e: MouseEvent) => {
    e.stopPropagation();
    updateNode(node.id, { visible: !node.visible });
  };

  const iconFor = (kind: SceneNode["kind"]) => {
    if (kind === "text") return "title";
    if (kind === "qrcode") return "qr_code";
    if (kind === "barcode") return "barcode";
    if (kind === "ellipse") return "circle";
    return "rectangle";
  };
</script>

<div class="flex flex-col border-t border-border">
  <div class="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted">
    Layers ({nodes.length})
  </div>
  <div class="max-h-64 overflow-y-auto">
    {#if nodes.length === 0}
      <div class="px-3 py-2 text-xs text-muted">No objects.</div>
    {/if}
    {#each nodes as node (node.id)}
      <div
        role="button"
        tabindex="0"
        class="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors {selectedId === node.id ? 'bg-surface-2 text-white' : 'text-muted hover:bg-surface-1'}"
        onclick={() => selectNode(node.id)}
        onkeydown={(e) => e.key === "Enter" && selectNode(node.id)}
      >
        <span class="material-symbols-rounded text-[16px]">{node.locked ? "lock" : iconFor(node.kind)}</span>
        <span class="flex-1 truncate">{node.name}</span>
        <button class="material-symbols-rounded text-[16px] opacity-60 hover:opacity-100" title="Toggle visibility" onclick={(e) => toggleVisible(node, e)}>
          {node.visible ? "visibility" : "visibility_off"}
        </button>
      </div>
    {/each}
  </div>
</div>
