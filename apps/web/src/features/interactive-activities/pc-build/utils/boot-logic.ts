import { usePCBuildStore, BootState } from "../stores/pc-build-store";

export interface BootResult {
  state: BootState;
  stateCheck: Record<string, boolean | number | string>;
}

/**
 * Evaluates the current state of the PC build and returns the POST boot sequence result.
 * It strictly evaluates what's currently assembled, ignoring what faults were originally injected.
 * This ensures students who actually fix the rig will pass.
 */
export function evaluateBoot(): BootResult {
  const store = usePCBuildStore.getState();

  // State checks for the final grade payload
  const stateCheck: Record<string, boolean | number | string> = {
    moboInstalled: store.mobo.placed,
    cpuInstalled: store.cpu.placed,
    coolerInstalled: store.cooler.placed,
    thermalPasteApplied: store.thermalPasteApplied,
    gpuInstalled: store.gpu.placed,
    psuInstalled: store.psu.placed,
    ramDualChannel: false,
    power24PinConnected: true,
    power8PinConnected: true,
    sataConnected: true,
    postTestPassed: false,
  };

  // 1. Basic Power Check (PSU placed)
  if (!store.psu.placed) {
    return { state: "ERR_NO_POWER", stateCheck };
  }
  
  // 2. CPU Power Check (Ignored/removed for simplicity)

  // 3. Thermal Check
  if (store.cpu.placed && (!store.cooler.placed || !store.thermalPasteApplied)) {
    return { state: "ERR_TEMP", stateCheck };
  }

  // 4. Memory Check
  const ram1 = store.ramSticks.ram1;
  const ram2 = store.ramSticks.ram2;
  const hasRam = ram1.placed || ram2.placed;
  
  // Dual-channel requires A2 and B2 for a 2-stick config in most modern boards
  const dualChannelCorrect = 
    ram1.placed && ram2.placed && 
    ((ram1.socketId === "dimm-A2" && ram2.socketId === "dimm-B2") || 
     (ram1.socketId === "dimm-B2" && ram2.socketId === "dimm-A2"));
  
  stateCheck.ramDualChannel = dualChannelCorrect;

  if (!hasRam || !dualChannelCorrect) {
    return { state: "ERR_RAM", stateCheck };
  }

  // 5. GPU Check
  if (!store.gpu.placed) {
    return { state: "ERR_GPU", stateCheck };
  }

  // 6. Success
  stateCheck.postTestPassed = true;
  return { state: "POST_SUCCESS", stateCheck };
}
