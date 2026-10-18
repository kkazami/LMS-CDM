import { useArduinoStore, PinState } from "../stores/arduino-store";

/**
 * interpreter.ts
 *
 * A constrained Arduino C++ to JS transpiler/interpreter.
 * It uses Regex to convert standard Arduino functions into JS await calls,
 * allowing it to drive the 3D circuit simulation in real-time.
 */

// Basic delay that yields to the browser event loop
const delayMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class ArduinoSimulation {
  private isRunning: boolean = false;
  private currentPromise: Promise<void> | null = null;
  private loopContext: { stop: boolean } = { stop: false };

  constructor() {}

  public async run(cppCode: string) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loopContext.stop = false;

    // 1. Transpile C++ to JS
    const jsCode = this.transpile(cppCode);

    // 2. Setup the Sys interface (Mock Arduino API)
    const sys = {
      OUTPUT: "OUTPUT",
      INPUT: "INPUT",
      HIGH: 1,
      LOW: 0,
      
      pinMode: (pin: number | string, mode: string) => {
        // Just track it if needed, or ignore since pure voltage logic handles it
      },
      digitalWrite: (pin: number | string, val: PinState) => {
        useArduinoStore.getState().setPinVoltage(`uno-${pin}`, val);
      },
      digitalRead: (pin: number | string) => {
        // Mock returning 0 for now. Advanced: read from circuit solver
        return 0; 
      },
      delay: async (ms: number) => {
        await delayMs(ms);
      },
      Serial: {
        begin: (baud: number) => {},
        print: (msg: any) => {
          useArduinoStore.getState().logSerial(String(msg));
        },
        println: (msg: any) => {
          useArduinoStore.getState().logSerial(String(msg));
        }
      },
      // Yield to event loop to prevent infinite while() hangs
      yield: async () => await delayMs(1),
      checkRunning: () => !this.loopContext.stop
    };

    // 3. Execute in a sandbox environment
    try {
      // Create an async function from the transpiled code
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      
      // We inject `sys` and expose Arduino globals
      const executor = new AsyncFunction('sys', `
        const HIGH = sys.HIGH;
        const LOW = sys.LOW;
        const OUTPUT = sys.OUTPUT;
        const INPUT = sys.INPUT;
        const pinMode = sys.pinMode;
        const digitalWrite = sys.digitalWrite;
        const digitalRead = sys.digitalRead;
        const delay = sys.delay;
        const Serial = sys.Serial;
        
        // --- TRANSPILED CODE ---
        ${jsCode}
        // -----------------------

        // Bootstrap
        if (typeof setup === 'function') {
          await setup();
        }
        
        if (typeof loop === 'function') {
          while (sys.checkRunning()) {
            await loop();
            await sys.yield(); // Ensure browser doesn't lock
          }
        }
      `);

      useArduinoStore.getState().startSimulation();
      this.currentPromise = executor(sys);
      await this.currentPromise;
      
    } catch (err: any) {
      useArduinoStore.getState().logSerial(`[Compiler Error]: ${err.message}`);
      console.error(err);
      this.stop();
    }
  }

  public stop() {
    this.isRunning = false;
    this.loopContext.stop = true;
    useArduinoStore.getState().stopSimulation();
  }

  private transpile(code: string): string {
    let js = code;

    // 1. Remove standard C++ includes (like #include <Servo.h>)
    js = js.replace(/#include\s+<.*?>/g, '');

    // 2. Convert standard C++ types to JS (int, float, bool, String, const int)
    js = js.replace(/\b(?:const\s+)?(?:int|float|double|bool|String|char|long|short|byte)\s+([a-zA-Z_]\w*)\s*=/g, 'let $1 =');
    js = js.replace(/\b(?:const\s+)?(?:int|float|double|bool|String|char|long|short|byte)\s+([a-zA-Z_]\w*)\s*;/g, 'let $1;');

    // 3. Convert void function declarations to async JS functions
    js = js.replace(/void\s+([a-zA-Z_]\w*)\s*\((.*?)\)\s*\{/g, 'async function $1($2) {');

    // 4. Inject await before blocking API calls
    js = js.replace(/\bdelay\s*\(/g, 'await delay(');

    // 5. Very crude infinite loop protection (inject yield inside while and for loops)
    // This is fragile in Regex, but functional for simple toy CodeLab environments.
    js = js.replace(/(while\s*\(.*?\)\s*\{)/g, '$1 await sys.yield(); ');
    js = js.replace(/(for\s*\(.*?\)\s*\{)/g, '$1 await sys.yield(); ');

    return js;
  }
}

// Export a singleton instance for the UI to use
export const arduinoSim = new ArduinoSimulation();
