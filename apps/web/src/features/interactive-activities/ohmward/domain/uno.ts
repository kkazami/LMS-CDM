export type UnoPin = { id:string; label:string; digital:boolean; analog:boolean; pwm:boolean; role:'signal'|'power'|'ground'|'reference'|'reset'; alias?:string; note:string };
const pwmPins=new Set([3,5,6,9,10,11]);
export const UNO_PINS:UnoPin[]=[
  ...Array.from({length:14},(_,i)=>({id:`D${i}`,label:`${pwmPins.has(i)?'~':''}D${i}`,digital:true,analog:false,pwm:pwmPins.has(i),role:'signal' as const,note:i===0?'UART RX; serial conflicts are not simulated.':i===1?'UART TX; serial conflicts are not simulated.':i===13?'Connected to the onboard LED; external LED still needs protection.':pwmPins.has(i)?'Supports PWM switching, not a DAC voltage.':'Digital input/output.'})),
  ...Array.from({length:6},(_,i)=>({id:`A${i}`,label:`A${i}`,digital:true,analog:true,pwm:false,role:'signal' as const,note:'10-bit ADC input (0–1023 at the selected reference); can also act as digital GPIO.'})),
  {id:'SDA',label:'SDA',digital:true,analog:true,pwm:false,role:'signal',alias:'A4',note:'Duplicate I2C SDA connection to A4, not an independent pin.'},
  {id:'SCL',label:'SCL',digital:true,analog:true,pwm:false,role:'signal',alias:'A5',note:'Duplicate I2C SCL connection to A5, not an independent pin.'},
  ...['GND1','GND2','GND3'].map(id=>({id,label:'GND',digital:false,analog:false,pwm:false,role:'ground' as const,alias:'GND',note:'Common reference/return. These ground headers share one net.'})),
  {id:'5V',label:'5V',digital:false,analog:false,pwm:false,role:'power',note:'Regulated 5 V rail in the powered educational model; not a GPIO.'},
  {id:'3V3',label:'3.3V',digital:false,analog:false,pwm:false,role:'power',note:'3.3 V supply output, not an ADC channel or GPIO.'},
  {id:'VIN',label:'VIN',digital:false,analog:false,pwm:false,role:'power',note:'External supply input; not interchangeable with the regulated 5 V rail. VIN supply circuitry is not simulated.'},
  {id:'IOREF',label:'IOREF',digital:false,analog:false,pwm:false,role:'reference',note:'Logic voltage reference, 5 V on Uno R3.'},
  {id:'AREF',label:'AREF',digital:false,analog:false,pwm:false,role:'reference',note:'ADC reference input. This model fixes the ADC reference at 5 V and does not support external AREF.'},
  {id:'RESET',label:'RESET',digital:false,analog:false,pwm:false,role:'reset',note:'Resets the board; not programmable GPIO in this model.'},
];
export const unoPin=(id:string)=>UNO_PINS.find(pin=>pin.id===id);
export const canonicalPin=(id:string)=>unoPin(id)?.alias??id;
export const UNO_REFERENCE={title:'Arduino Uno R3 official pinout',url:'https://docs.arduino.cc/resources/pinouts/A000066-full-pinout.pdf'};
export const UNO_ASSUMPTIONS=['Powered Uno R3/ATmega328P-style board at 5 V, with a fixed 5 V ADC reference; not Uno R4.','ADC samples are integers 0–1023. PWM duty is an integer 0–255 and represents switching, not true analog voltage.','Power-supply regulation, timers/frequency conflicts, serial/SPI/I2C protocols, interrupts, electrical loading and physical hardware execution are unsupported.'];
