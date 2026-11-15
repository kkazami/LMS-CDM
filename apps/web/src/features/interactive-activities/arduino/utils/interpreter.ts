import { useArduinoStore } from '../stores/arduino-store';
import { parseSketch, type SketchInstruction, type SketchProgram } from './sketch-program';

export class ArduinoSimulation {
  private isRunning = false;
  private generation = 0;

  private active(generation: number) {
    return this.isRunning && this.generation === generation;
  }

  private async wait(ms: number, generation: number): Promise<boolean> {
    // Short slices allow stop/restart to cancel a long sketch delay without stale writes.
    let remaining = ms;
    while (remaining > 0 && this.active(generation)) {
      const slice = Math.min(remaining, 50);
      await new Promise<void>(resolve => setTimeout(resolve, slice));
      remaining -= slice;
    }
    return this.active(generation);
  }

  public async run(source: string) {
    if (this.isRunning) return;
    let program: SketchProgram;
    try { program = parseSketch(source); }
    catch (error) {
      useArduinoStore.getState().logSerial('[Compiler Error]: ' + (error instanceof Error ? error.message : 'Unsupported sketch.'));
      return;
    }
    const generation = ++this.generation;
    this.isRunning = true;
    useArduinoStore.getState().startSimulation();
    const modes: Record<number, string> = Object.create(null);
    const play = async (instructions: SketchInstruction[]) => {
      for (const instruction of instructions) {
        if (!this.active(generation)) return false;
        if (instruction.op === 'mode') {
          modes[instruction.pin] = instruction.mode;
          if (instruction.mode === 'INPUT') useArduinoStore.getState().setPinVoltage('uno-' + instruction.pin, null);
        } else if (instruction.op === 'write') {
          if (modes[instruction.pin] !== 'OUTPUT') throw new Error('Set OUTPUT mode before writing HIGH or LOW.');
          useArduinoStore.getState().setPinVoltage('uno-' + instruction.pin, instruction.value);
        }
        if (!await this.wait(instruction.op === 'wait' ? instruction.ms : 1, generation)) return false;
      }
      return true;
    };
    try {
      if (!await play(program.setup)) return;
      while (this.active(generation)) {
        if (!await play(program.loop) || !await this.wait(1, generation)) return;
      }
    } catch (error) {
      if (this.active(generation)) useArduinoStore.getState().logSerial('[Simulation Error]: ' + (error instanceof Error ? error.message : 'Preview stopped.'));
    } finally {
      if (this.generation === generation) {
        this.isRunning = false;
        useArduinoStore.getState().stopSimulation();
      }
    }
  }

  public stop() {
    this.isRunning = false;
    this.generation++;
    useArduinoStore.getState().stopSimulation();
  }
}

export const arduinoSim = new ArduinoSimulation();
