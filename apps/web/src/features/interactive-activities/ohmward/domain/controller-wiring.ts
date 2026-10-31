import type { ResponseState } from './types';
import { validateGraph } from './graph';
import { canonicalPin } from './uno';
import { wireNets } from './nets';
export type ControllerSpec={outputPin:string;inputPin?:string;sensor?:'light-sensor'|'temperature-sensor'|'ultrasonic-sensor'|'soil-sensor';button?:boolean;triggerPin?:string;outputKind?:'led'|'pump';resistanceOhms:number};
export function controllerWiring(state:ResponseState,spec:ControllerSpec):{valid:boolean;message:string}{
  if(spec.outputKind==='pump')return pumpWiring(state,spec);
  const {parts,error}=validateGraph(state);const fail=(message:string)=>({valid:false,message});if(error)return fail(error);
  const expected=['uno','resistor','led',...(spec.button?['button']:[]),...(spec.sensor?[spec.sensor]:[])];
  if(parts.length!==expected.length||expected.some(kind=>parts.filter(part=>part.kind===kind).length!==1))return fail('Use one Uno, one resistor, one LED and exactly the input module named by this task. Other networks are unsupported.');
  const board=parts.find(p=>p.kind==='uno')!,resistor=parts.find(p=>p.kind==='resistor')!,led=parts.find(p=>p.kind==='led')!;
  if(resistor.properties.value!==spec.resistanceOhms||led.properties.value!==2)return fail(`Use a ${spec.resistanceOhms} Ω series resistor and the specified 2 V LED.`);
  const {end,eq}=wireNets(parts,state.wires);
  const out=end(board.id,spec.outputPin),ground=end(board.id,'GND1'),supply=end(board.id,'5V');
  const allowedPins=new Set([canonicalPin(spec.outputPin),'GND',...(spec.inputPin?[canonicalPin(spec.inputPin)]:[]),...(spec.triggerPin?[canonicalPin(spec.triggerPin)]:[]),...(spec.sensor?['5V']:[])]);
  for(const wire of state.wires)for(const pin of [wire.from,wire.to])if(pin.componentId===board.id&&!allowedPins.has(canonicalPin(pin.terminalId)))return fail('A wire uses a different Uno pin from the task specification.');
  if(eq(out,ground)||eq(supply,ground)||eq(out,supply))return fail('A supply/output short or direct power bypass is unsafe. Remove the bypass before testing.');
  const r=[end(resistor.id,'left'),end(resistor.id,'right')],anode=end(led.id,'anode'),cathode=end(led.id,'cathode');
  if(eq(r[0],r[1])||eq(anode,cathode))return fail('Do not bypass the resistor or LED.');
  const path=r.some((first,i)=>eq(out,first)&&eq(r[1-i],anode)&&eq(cathode,ground)||eq(out,anode)&&eq(cathode,first)&&eq(r[1-i],ground));
  if(!path)return fail('Wire the specified output through the resistor and LED anode, then return the cathode to GND. The resistor may appear before or after the LED.');
  if([r[0],r[1],anode,cathode].some(pin=>eq(pin,supply)))return fail('The 5V rail must not bypass the controlled LED output path.');
  if(spec.button){
    const button=parts.find(p=>p.kind==='button')!,input=end(board.id,spec.inputPin!),left=end(button.id,'left'),right=end(button.id,'right');
    if([ground,supply,out,...r,anode,cathode].some(pin=>eq(input,pin))||!(eq(input,left)&&eq(right,ground)||eq(input,right)&&eq(left,ground)))return fail('Connect the button between the specified input and GND, without tying its signal to power or the LED path. INPUT_PULLUP makes pressed = LOW.');
  }
  if(spec.sensor){
    const sensor=parts.find(p=>p.kind===spec.sensor)!,signal=end(sensor.id,spec.sensor==='ultrasonic-sensor'?'echo':'signal'),input=end(board.id,spec.inputPin!);
    if(!eq(end(sensor.id,'vcc'),supply)||!eq(end(sensor.id,'ground'),ground)||!eq(signal,input)||[ground,supply,out,...r,anode,cathode].some(pin=>eq(signal,pin)))return fail('Connect sensor VCC to 5V, ground to the shared GND and signal only to the specified signal input.');
    if(spec.sensor==='ultrasonic-sensor'){
      if(!spec.triggerPin)return fail('Specify a distinct ultrasonic trigger pin.');
      const trigger=end(board.id,spec.triggerPin),trig=end(sensor.id,'trig');
      if(!eq(trigger,trig)||[ground,supply,out,input,...r,anode,cathode].some(pin=>eq(trigger,pin)))return fail('Wire TRIG to its distinct output and ECHO to its input, isolated from LED/power nets.');
    }
  }
  return {valid:true,message:'The specified input and protected LED output use the supported Uno wiring model.'};
}
function pumpWiring(state:ResponseState,spec:ControllerSpec):{valid:boolean;message:string}{
  const {parts,error}=validateGraph(state),fail=(message:string)=>({valid:false,message});if(error)return fail(error);
  const expected=['uno','soil-sensor','pump-driver','pump'];
  if(parts.length!==4||expected.some(kind=>parts.filter(part=>part.kind===kind).length!==1)||!spec.inputPin)return fail('Use exactly one Uno, calibrated soil module, virtual pump-driver module and pump. GPIO must not power the pump.');
  const board=parts.find(p=>p.kind==='uno')!,soil=parts.find(p=>p.kind==='soil-sensor')!,driver=parts.find(p=>p.kind==='pump-driver')!,pump=parts.find(p=>p.kind==='pump')!;
  const {end,eq}=wireNets(parts,state.wires);
  const groups=[
    [end(board.id,'GND1'),end(soil.id,'ground'),end(driver.id,'ground')],
    [end(board.id,'5V'),end(soil.id,'vcc'),end(driver.id,'vcc')],
    [end(board.id,spec.inputPin),end(soil.id,'signal')],
    [end(board.id,spec.outputPin),end(driver.id,'control')],
    [end(driver.id,'load-positive'),end(pump.id,'positive')],
    [end(driver.id,'load-negative'),end(pump.id,'negative')],
  ];
  if(groups.some(group=>group.some(pin=>!eq(pin,group[0]))))return fail('Connect soil VCC/GND/signal, driver logic VCC/GND/control, and pump only to the driver load output pair.');
  if(groups.some((group,i)=>groups.some((other,j)=>i<j&&eq(group[0],other[0]))))return fail('A pump load, signal or supply net is shorted/bypassed. The GPIO controls only the driver input; it never supplies motor current.');
  const allowed=new Set(['GND','5V',canonicalPin(spec.inputPin),canonicalPin(spec.outputPin)]);
  if(state.wires.some(wire=>[wire.from,wire.to].some(pin=>pin.componentId===board.id&&!allowed.has(canonicalPin(pin.terminalId)))))return fail('Use only the specified Uno signal pins and logic power/reference connections.');
  return {valid:true,message:'Pump is connected through a virtual driver with abstracted separate load supply and protection; no motor current is drawn from GPIO.'};
}
