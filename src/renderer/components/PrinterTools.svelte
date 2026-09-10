<script lang="ts">
  import { onMount } from "svelte";
  import { AutoShutdownTime, LabelType } from "@mmote/niimbluelib";
  import { connectionState, printerMeta, rfidInfo, ribbonRfidInfo, packetLog, connectedPrinterName } from "$lib/printer";
  import {
    soundState,
    autoShutdownTime,
    refreshSounds,
    setBluetoothSound,
    setPowerSound,
    refreshAutoShutdown,
    setAutoShutdown,
    refreshRfid,
    firmwareUpgrade,
  } from "$lib/printerTools";
  import { toast } from "$lib/toast";

  let fwInput = $state<HTMLInputElement>();
  let fwVersion = $state<string>("");

  const connected = $derived($connectionState === "connected");

  const shutdownOptions: { value: AutoShutdownTime; label: string }[] = [
    { value: AutoShutdownTime.ShutdownTime1, label: "15 minutes" },
    { value: AutoShutdownTime.ShutdownTime2, label: "30 minutes" },
    { value: AutoShutdownTime.ShutdownTime3, label: "45/60 minutes" },
    { value: AutoShutdownTime.ShutdownTime4, label: "60/never" },
  ];

  const rfidRows = (info: typeof $rfidInfo): [string, string][] => {
    if (!info) return [];
    const labelType = info.consumablesType !== undefined ? LabelType[info.consumablesType] : "-";
    return [
      ["Tag present", String(info.tagPresent)],
      ["UUID", info.uuid],
      ["Barcode", info.barCode],
      ["Serial", info.serialNumber],
      ["All paper", String(info.allPaper)],
      ["Used paper", String(info.usedPaper)],
      ["Type", labelType],
    ];
  };

  onMount(async () => {
    if (connected) {
      await Promise.all([refreshSounds(), refreshAutoShutdown(), refreshRfid()]);
    }
  });

  const onFirmwarePick = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!fwVersion.trim()) {
      toast("Enter a firmware version first", "warning");
      return;
    }
    file.arrayBuffer().then((buf) => {
      firmwareUpgrade(new Uint8Array(buf), fwVersion.trim());
    });
  };
</script>

<div class="flex h-full flex-col overflow-y-auto bg-surface-1">
  <div class="mx-auto w-full max-w-2xl p-6">
    <h2 class="mb-1 text-lg font-medium">Printer tools</h2>
    <p class="mb-6 text-sm text-muted">
      {#if connected}
        {$connectedPrinterName} ({$printerMeta?.model ?? "unknown model"})
      {:else}
        Connect a printer to use these tools.
      {/if}
    </p>

    <section class="mb-6 rounded-lg border border-border bg-surface-0 p-4">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-medium">RFID</h3>
        <button class="tool-btn" disabled={!connected} onclick={refreshRfid} title="Read RFID">
          <span class="material-symbols-rounded text-[18px]">refresh</span>
        </button>
      </div>

      <div class="mb-3">
        <div class="mb-1 text-xs uppercase tracking-wide text-muted">Paper</div>
        {#if $rfidInfo}
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {#each rfidRows($rfidInfo) as [key, value] (key)}
              <dt class="text-muted">{key}</dt>
              <dd class="font-mono break-all">{value}</dd>
            {/each}
          </dl>
        {:else}
          <div class="text-sm text-muted">No paper RFID data.</div>
        {/if}
      </div>

      <div>
        <div class="mb-1 text-xs uppercase tracking-wide text-muted">Ribbon</div>
        {#if $ribbonRfidInfo}
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {#each rfidRows($ribbonRfidInfo) as [key, value] (key)}
              <dt class="text-muted">{key}</dt>
              <dd class="font-mono break-all">{value}</dd>
            {/each}
          </dl>
        {:else}
          <div class="text-sm text-muted">No ribbon RFID data.</div>
        {/if}
      </div>
    </section>

    <section class="mb-6 rounded-lg border border-border bg-surface-0 p-4">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-medium">Sound</h3>
        <button class="tool-btn" disabled={!connected} onclick={refreshSounds} title="Read sound state">
          <span class="material-symbols-rounded text-[18px]">refresh</span>
        </button>
      </div>

      <label class="mb-2 flex items-center justify-between text-sm">
        <span>Bluetooth connection sound</span>
        <input
          type="checkbox"
          class="h-4 w-4"
          checked={$soundState.bluetooth ?? false}
          disabled={!connected || $soundState.bluetooth === undefined}
          onchange={(e) => setBluetoothSound(e.currentTarget.checked)}
        />
      </label>
      <label class="flex items-center justify-between text-sm">
        <span>Power sound</span>
        <input
          type="checkbox"
          class="h-4 w-4"
          checked={$soundState.power ?? false}
          disabled={!connected || $soundState.power === undefined}
          onchange={(e) => setPowerSound(e.currentTarget.checked)}
        />
      </label>
    </section>

    <section class="mb-6 rounded-lg border border-border bg-surface-0 p-4">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-medium">Auto shutdown</h3>
        <button class="tool-btn" disabled={!connected} onclick={refreshAutoShutdown} title="Read auto-shutdown">
          <span class="material-symbols-rounded text-[18px]">refresh</span>
        </button>
      </div>

      <label class="block text-sm">
        <span class="mb-1 block text-xs uppercase tracking-wide text-muted">Timeout</span>
        <select class="tool-select" value={$autoShutdownTime} disabled={!connected || $autoShutdownTime === undefined} onchange={(e) => setAutoShutdown(Number(e.currentTarget.value) as AutoShutdownTime)}>
          {#each shutdownOptions as opt (opt.value)}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </label>
    </section>

    <section class="mb-6 rounded-lg border border-border bg-surface-0 p-4">
      <h3 class="mb-3 text-sm font-medium">Firmware</h3>
      <label class="mb-2 block text-sm">
        <span class="mb-1 block text-xs uppercase tracking-wide text-muted">Version</span>
        <input class="tool-input" bind:value={fwVersion} placeholder="e.g. 1.2.3" />
      </label>
      <input type="file" class="hidden" accept=".bin,.img" bind:this={fwInput} onchange={onFirmwarePick} />
      <button class="action-btn" disabled={!connected} onclick={() => fwInput?.click()}>
        <span class="material-symbols-rounded text-[18px]">upload</span> Choose firmware file
      </button>
      <p class="mt-2 text-xs text-muted">Uploads the raw firmware binary to the printer. Use with care.</p>
    </section>

    <section class="mb-6 rounded-lg border border-border bg-surface-0 p-4">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-medium">Packet log</h3>
        <span class="text-xs text-muted">{$packetLog.length} entries</span>
      </div>
      <pre class="max-h-64 overflow-auto rounded border border-border bg-surface-2 p-2 text-[11px] leading-tight text-muted font-mono">{#each $packetLog as line (line)}{line}
{/each}</pre>
    </section>
  </div>
</div>

<style>
  .tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    width: 28px;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-muted);
    cursor: pointer;
  }
  .tool-btn:hover:not(:disabled) {
    color: #fff;
    background: var(--color-surface-3);
  }
  .tool-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .tool-select,
  .tool-input {
    width: 100%;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: inherit;
    padding: 5px 8px;
    font-size: 13px;
  }
  .action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-muted);
    padding: 6px 12px;
    font-size: 13px;
    cursor: pointer;
  }
  .action-btn:hover:not(:disabled) {
    color: #fff;
    background: var(--color-surface-3);
  }
  .action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
