<script lang="ts">
  import { scene, updateNode, beginMutation, removeSelected, duplicateSelected, bringToFront, sendToBack } from "$lib/engine/scene";
  import { kindLabel } from "$lib/engine/types";
  import type { SceneNode, TextNode, RectNode, EllipseNode, LineNode, QrNode, BarcodeNode, ArUcoNode } from "$lib/engine/types";

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
  const asQr = (n: SceneNode) => n as QrNode;
  const asBarcode = (n: SceneNode) => n as BarcodeNode;
  const asArUco = (n: SceneNode) => n as ArUcoNode;
</script>

<div class="flex h-full w-64 shrink-0 flex-col border-l border-border bg-surface-0">
  <div class="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted">
    {selected ? kindLabel[selected.kind] : "Properties"}
  </div>

  {#if !selected}
    <div class="p-4 text-sm text-muted">Select an object to edit its properties.</div>
  {:else}
    <div class="flex-1 overflow-y-auto p-3">
      <label class="mb-3 block">
        <span class="prop-label">Position</span>
        <div class="flex gap-2">
          <input class="prop-input" type="number" value={selected.x} oninput={(e) => onInput({ x: num(e.currentTarget.value) })} />
          <input class="prop-input" type="number" value={selected.y} oninput={(e) => onInput({ y: num(e.currentTarget.value) })} />
        </div>
      </label>
      <label class="mb-3 block">
        <span class="prop-label">Size</span>
        <div class="flex gap-2">
          <input class="prop-input" type="number" value={selected.width} oninput={(e) => onInput({ width: num(e.currentTarget.value) })} />
          <input class="prop-input" type="number" value={selected.height} oninput={(e) => onInput({ height: num(e.currentTarget.value) })} />
        </div>
      </label>
      <label class="mb-3 block">
        <span class="prop-label">Rotation</span>
        <input class="prop-input" type="number" value={selected.rotation} oninput={(e) => onInput({ rotation: num(e.currentTarget.value) })} />
      </label>

      {#if selected.kind === "text"}
        <label class="mb-3 block">
          <span class="prop-label">Text</span>
          <textarea class="prop-input" rows="2" value={asText(selected).text} oninput={(e) => onInput({ text: e.currentTarget.value } as Partial<SceneNode>)}></textarea>
        </label>
        <label class="mb-3 block">
          <span class="prop-label">Font size</span>
          <input class="prop-input" type="number" value={asText(selected).fontSize} oninput={(e) => onInput({ fontSize: num(e.currentTarget.value) } as Partial<SceneNode>)} />
        </label>
        <label class="mb-3 block">
          <span class="prop-label">Color</span>
          <input class="prop-input" type="color" value={asText(selected).fill} oninput={(e) => onInput({ fill: e.currentTarget.value } as Partial<SceneNode>)} />
        </label>
        <label class="mb-3 block">
          <span class="prop-label">Align</span>
          <select class="prop-input" value={asText(selected).align} onchange={(e) => onInput({ align: e.currentTarget.value as "left" | "center" | "right" } as Partial<SceneNode>)}>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
      {/if}

      {#if selected.kind === "rect"}
        <label class="mb-3 block">
          <span class="prop-label">Fill</span>
          <input class="prop-input" type="color" value={asRect(selected).fill === "transparent" ? "#000000" : asRect(selected).fill} oninput={(e) => onInput({ fill: e.currentTarget.value } as Partial<SceneNode>)} />
        </label>
        <label class="mb-3 block">
          <span class="prop-label">Stroke</span>
          <input class="prop-input" type="color" value={asRect(selected).stroke} oninput={(e) => onInput({ stroke: e.currentTarget.value } as Partial<SceneNode>)} />
        </label>
        <label class="mb-3 block">
          <span class="prop-label">Stroke width</span>
          <input class="prop-input" type="number" value={asRect(selected).strokeWidth} oninput={(e) => onInput({ strokeWidth: num(e.currentTarget.value) } as Partial<SceneNode>)} />
        </label>
      {/if}

      {#if selected.kind === "ellipse"}
        <label class="mb-3 block">
          <span class="prop-label">Fill</span>
          <input class="prop-input" type="color" value={asEllipse(selected).fill === "transparent" ? "#000000" : asEllipse(selected).fill} oninput={(e) => onInput({ fill: e.currentTarget.value } as Partial<SceneNode>)} />
        </label>
        <label class="mb-3 block">
          <span class="prop-label">Stroke</span>
          <input class="prop-input" type="color" value={asEllipse(selected).stroke} oninput={(e) => onInput({ stroke: e.currentTarget.value } as Partial<SceneNode>)} />
        </label>
      {/if}

      {#if selected.kind === "line"}
        <label class="mb-3 block">
          <span class="prop-label">Stroke</span>
          <input class="prop-input" type="color" value={asLine(selected).stroke} oninput={(e) => onInput({ stroke: e.currentTarget.value } as Partial<SceneNode>)} />
        </label>
        <label class="mb-3 block">
          <span class="prop-label">Stroke width</span>
          <input class="prop-input" type="number" value={asLine(selected).strokeWidth} oninput={(e) => onInput({ strokeWidth: num(e.currentTarget.value) } as Partial<SceneNode>)} />
        </label>
      {/if}

      {#if selected.kind === "qrcode"}
        <label class="mb-3 block">
          <span class="prop-label">Text</span>
          <textarea class="prop-input" rows="2" value={asQr(selected).text} oninput={(e) => onInput({ text: e.currentTarget.value } as Partial<SceneNode>)}></textarea>
        </label>
        <label class="mb-3 block">
          <span class="prop-label">Error correction</span>
          <select class="prop-input" value={asQr(selected).ecc} onchange={(e) => onInput({ ecc: e.currentTarget.value as "L" | "M" | "Q" | "H" } as Partial<SceneNode>)}>
            <option value="L">L (7%)</option>
            <option value="M">M (15%)</option>
            <option value="Q">Q (25%)</option>
            <option value="H">H (30%)</option>
          </select>
        </label>
      {/if}

      {#if selected.kind === "barcode"}
        <label class="mb-3 block">
          <span class="prop-label">Text</span>
          <input class="prop-input" value={asBarcode(selected).text} oninput={(e) => onInput({ text: e.currentTarget.value } as Partial<SceneNode>)} />
        </label>
        <label class="mb-3 block">
          <span class="prop-label">Encoding</span>
          <select class="prop-input" value={asBarcode(selected).encoding} onchange={(e) => onInput({ encoding: e.currentTarget.value } as Partial<SceneNode>)}>
            <option value="CODE128">CODE128B</option>
            <option value="EAN13">EAN13</option>
          </select>
        </label>
      {/if}

      {#if selected.kind === "aruco"}
        <label class="mb-3 block">
          <span class="prop-label">Dictionary</span>
          <select class="prop-input" value={String(asArUco(selected).size)} onchange={(e) => onInput({ size: num(e.currentTarget.value) } as Partial<SceneNode>)}>
            <option value="4">4x4 (50)</option>
            <option value="5">5x5 (50)</option>
            <option value="6">6x6 (50)</option>
          </select>
        </label>
        <label class="mb-3 block">
          <span class="prop-label">Marker id</span>
          <input class="prop-input" type="number" min="0" max="49" value={asArUco(selected).markerId} oninput={(e) => onInput({ markerId: num(e.currentTarget.value) } as Partial<SceneNode>)} />
        </label>
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
