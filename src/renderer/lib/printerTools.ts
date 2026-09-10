import { get, writable } from "svelte/store";
import { AutoShutdownTime, SoundSettingsItemType } from "@mmote/niimbluelib";
import { printerClient, rfidInfo, ribbonRfidInfo } from "./printer";
import { toast } from "./toast";

export type SoundState = {
  bluetooth: boolean | undefined;
  power: boolean | undefined;
};

export const soundState = writable<SoundState>({ bluetooth: undefined, power: undefined });
export const autoShutdownTime = writable<AutoShutdownTime | undefined>(undefined);
export const packetLogOpen = writable<boolean>(false);

const client = () => get(printerClient);

const wrap = async <T>(label: string, fn: () => Promise<T>): Promise<T | undefined> => {
  try {
    return await fn();
  } catch (e) {
    toast(`${label} failed: ${e}`, "error");
    return undefined;
  }
};

export const refreshSounds = async () => {
  const c = client();
  if (!c) return;
  const bt = await wrap("Read bluetooth sound", () =>
    c.abstraction.isSoundEnabled(SoundSettingsItemType.BluetoothConnectionSound),
  );
  const pwr = await wrap("Read power sound", () =>
    c.abstraction.isSoundEnabled(SoundSettingsItemType.PowerSound),
  );
  soundState.set({ bluetooth: bt, power: pwr });
};

export const setBluetoothSound = async (enabled: boolean) => {
  const c = client();
  if (!c) return;
  await wrap("Set bluetooth sound", () =>
    c.abstraction.setSoundEnabled(SoundSettingsItemType.BluetoothConnectionSound, enabled),
  );
  await refreshSounds();
};

export const setPowerSound = async (enabled: boolean) => {
  const c = client();
  if (!c) return;
  await wrap("Set power sound", () =>
    c.abstraction.setSoundEnabled(SoundSettingsItemType.PowerSound, enabled),
  );
  await refreshSounds();
};

export const refreshAutoShutdown = async () => {
  const c = client();
  if (!c) return;
  const t = await wrap("Read auto-shutdown", () => c.abstraction.getAutoShutDownTime());
  autoShutdownTime.set(t);
};

export const setAutoShutdown = async (time: AutoShutdownTime) => {
  const c = client();
  if (!c) return;
  await wrap("Set auto-shutdown", () => c.abstraction.setAutoShutDownTime(time));
  await refreshAutoShutdown();
};

export const refreshRfid = async () => {
  const c = client();
  if (!c) return;
  const paper = await wrap("Read paper RFID", () => c.abstraction.rfidInfo());
  if (paper) rfidInfo.set(paper);
  const ribbon = await wrap("Read ribbon RFID", () => c.abstraction.rfidInfo2());
  if (ribbon) ribbonRfidInfo.set(ribbon);
};

export const firmwareUpgrade = async (data: Uint8Array, version: string) => {
  const c = client();
  if (!c) return;
  await wrap("Firmware upgrade", () => c.abstraction.firmwareUpgrade(data, version));
  toast("Firmware upgrade sent", "success");
};
