<script lang="ts">
  import { scene, updateNode, beginMutation, removeSelected, duplicateSelected, bringToFront, sendToBack } from "$lib/engine/scene";
  import { kindLabel } from "$lib/engine/types";
  import type { SceneNode, TextNode, RectNode, EllipseNode, LineNode } from "$lib/engine/types";

  let selected = $state<SceneNode | undefined>(undefined);

  scene.subscribe((s) => {
    selected = s.nodes.find((n) => n.id === s.selectedId);
  });

  const set = (patch: Partial<SceneNode>) => {
    if (!selected) return;
    updateNode(selected.id, patch);
  };

  const onInput = (patch: Partial<SceneNode>) => {
    if (!selected) return;
    beginMutation();
    set(patch);
  };

  const num = (v: string) => Number(v);

  const asText = (n: SceneNode) => n as TextNode;
  const asRect = (n: SceneNode) => n as RectNode;
  const asEllipse = (n: SceneNode) => n as EllipseNode;
  const asLine = (n: SceneNode) => n as LineNode;
</script>

<div class="flex h-full w-64 shrink-0 flex-col border-l border-border bg-surface-0">
  <div class="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted">
    {selected ? kindLabel[selected.kind] : "Properties"}
  </div>

  {#if !selected}
    <div class="p-4 text-sm text-muted">Select an object to edit its properties.</div>
  {:else}
    <div class="flex-1 overflow-y-auto p-3">
      <div class="mb-3">
        <label class="prop-label">Position</label>
        <div class="flex gap-2">
          <input class="prop-input" type="number" value={selected.x} oninput={(e) => onInput({ x: num(e.currentTarget.value) })} />
          <input class="prop-input" type="number" value={selected.y} oninput={(e) => onInput({ y: num(e.currentTarget.value) })} />
        </div>
      </div>
      <div class="mb-3">
        <label class="prop-label">Size</label>
        <div class="flex gap-2">
          <input class="prop-input" type="number" value={selected.width} oninput={(e) => onInput({ width: num(e.currentTarget.value) })} />
          <input class="prop-input" type="number" value={selected.height} oninput={(e) => onInput({ height: num(e.currentTarget.value) })} />
        </div>
      </div>
      <div class="mb-3">
        <label class="prop-label">Rotation</label>
        <input class="prop-input" type="number" value={selected.rotation} oninput={(e) => onInput({ rotation: num(e.currentTarget.value) })} />
      </div>

      {#if selected.kind === "text"}
        <div class="mb-3">
          <label class="prop-label">Text</label>
          <textarea class="prop-input" rows="2" value={asText(selected).text} oninput={(e) => onInput({ text: e.currentTarget.value } as Partial<SceneNode>)}></textarea>
        </div>
        <div class="mb-3">
          <label class="prop-label">Font size</label>
          <input class="prop-input" type="number" value={asText(selected).fontSize} oninput={(e) => onInput({ fontSize: num(e.currentTarget.value) } as Partial<SceneNode>)} />
        </div>
        <div class="mb-3">
          <label class="prop-label">Color</label>
          <input class="prop-input" type="color" value={asText(selected).fill} oninput={(e) => onInput({ fill: e.currentTarget.value } as Partial<SceneNode>)} />
        </div>
        <div class="mb-3">
          <label class="prop-label">Align</label>
          <select class="prop-input" value={asText(selected).align} onchange={(e) => onInput({ align: e.currentTarget.value as "left" | "center" | "right" } as Partial<SceneNode>)}>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      {/if}

      {#if selected.kind === "rect"}
        <div class="mb-3">
          <label class="prop-label">Fill</label>
          <input class="prop-input" type="color" value={asRect(selected).fill === "transparent" ? "#000000" : asRect(selected).fill} oninput={(e) => onInput({ fill: e.currentTarget.value } as Partial<SceneNode>)} />
        </div>
        <div class="mb-3">
          <label class="prop-label">Stroke</label>
          <input class="prop-input" type="color" value={asRect(selected).stroke} oninput={(e) => onInput({ stroke: e.currentTarget.value } as Partial<SceneNode>)} />
        </div>
        <div class="mb-3">
          <label class="prop-label">Stroke width</label>
          <input class="prop-input" type="number" value={asRect(selected).strokeWidth} oninput={(e) => onInput({ strokeWidth: num(e.currentTarget.value) } as Partial<SceneNode>)} />
        </div>
      {/if}

      {#if selected.kind === "ellipse"}
        <div class="mb-3">
          <label class="prop-label">Fill</label>
          <input class="prop-input" type="color" value={asEllipse(selected).fill === "transparent" ? "#000000" : asEllipse(selected).fill} oninput={(e) => onInput({ fill: e.currentTarget.value } as Partial<SceneNode>)} />
        </div>
        <div class="mb-3">
          <label class="prop-label">Stroke</label>
          <input class="prop-input" type="color" value={asEllipse(selected).stroke} oninput={(e) => onInput({ stroke: e.currentTarget.value } as Partial<SceneNode>)} />
        </div>
      {/if}

      {#if selected.kind === "line"}
        <div class="mb-3">
          <label class="prop-label">Stroke</label>
          <input class="prop-input" type="color" value={asLine(selected).stroke} oninput={(e) => onInput({ stroke: e.currentTarget.value } as Partial<SceneNode>)} />
        </div>
        <div class="mb-3">
          <label class="prop-label">Stroke width</label>
          <input class="prop-input" type="number" value={asLine(selected).strokeWidth} oninput={(e) => onInput({ strokeWidth: num(e.currentTarget.value) } as Partial<SceneNode>)} />
        </div>
      {/if}
    </div>

    <div class="flex shrink-0 gap-1 border-t border-border p-2">
      <button class="panel-btn" onclick={() => selected && bringToFront(selected.id)} title="Bring to front">
        <span class="material-symbols-rounded text-[18px]">bring_to_front</span>
      </button>
      <button class="panel-btn" onclick={() => selected && sendToBack(selected.id)} title="Send to back">
        <span class="material-symbols-rounded text-[18px]">send_to_back</span>
      </button>
      <button class="panel-btn" onclick={duplicateSelected} title="Duplicate (Ctrl+D)">
        <span class="material-symbols-rounded text-[18px]">content_copy</span>
      </button>
      <button class="panel-btn-danger" onclick={removeSelected} title="Delete">
        <span class="material-symbols-rounded text-[18px]">delete</span>
      </button>
    </div>
  {/if}
</div>

<style>
  .prop-label {
    display: block;
    font-size: 11px;
    margin-bottom: 4px;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .prop-input {
    width: 100%;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: inherit;
    padding: 4px 8px;
    font-size: 13px;
  }
  .panel-btn,
  .panel-btn-danger {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-muted);
    cursor: pointer;
  }
  .panel-btn:hover {
    color: #fff;
    background: var(--color-surface-3);
  }
  .panel-btn-danger:hover {
    color: #fff;
    background: var(--color-danger);
    border-color: transparent;
  }
</style>
