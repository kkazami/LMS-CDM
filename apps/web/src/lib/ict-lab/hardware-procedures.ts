export interface HardwareProcedure {
  tools: string[];
  removeSteps: string[];
  installSteps: string[];
  cautions: string[];
  commonMistakes: string[];
}

export const HARDWARE_GENERAL_SAFETY: string[] = [
  "Shut down the computer, switch the PSU off and unplug the AC power cord.",
  "Press and hold the power button for about 5 seconds to discharge leftover power.",
  "Wear an anti-static (ESD) wrist strap clipped to bare metal on the case, or touch bare metal frequently.",
  "Work on a clean, flat, non-carpeted surface with good light.",
  "Hold components by their edges; never touch connectors, chips or gold contacts.",
  "Never force a part. If it does not fit, stop and check the alignment or notch.",
  "Keep screws in a small tray and take photos of cable positions before removing anything.",
];

export const HARDWARE_PROCEDURES: Record<string, HardwareProcedure> = {
  motherboard: {
    tools: ["Phillips #2 screwdriver", "ESD wrist strap", "Screw tray", "Zip ties"],
    removeSteps: [
      "Power off, switch off the PSU and unplug the AC cord. Press the power button once to discharge.",
      "Remove the side panel and take photos of every cable connection.",
      "Unplug the 24-pin ATX power, the 8-pin CPU power, the SATA cables, fan cables, USB/audio headers and the front-panel connectors (power switch, reset, LEDs).",
      "Remove the graphics card and any expansion cards, then the RAM modules.",
      "Remove the CPU cooler if it is large or heavy, or if you are replacing the board.",
      "Unscrew all motherboard screws (usually 6 to 9) while supporting the board.",
      "Tilt the board slightly to clear the rear I/O shield and lift it straight out.",
      "Place the board on an anti-static surface, such as its original box or an anti-static bag.",
    ],
    installSteps: [
      "Check that the case standoffs match the screw holes of your board form factor (for example ATX). Remove any extra standoffs, because an extra one can short the board.",
      "Install the rear I/O shield from the inside of the case if the board does not have one built in.",
      "Lower the board at a slight angle so the rear ports fit through the I/O shield, then level it onto the standoffs.",
      "Insert the screws and tighten them in a cross pattern until snug. Do not over-tighten.",
      "Install the CPU, RAM and cooler if they were removed.",
      "Connect the 24-pin ATX and 8-pin CPU power cables.",
      "Connect the front-panel headers following the motherboard manual, then the USB, audio, fan and SATA cables.",
      "Install the graphics card and expansion cards.",
      "Check for loose screws and cables touching fans, then power on and confirm the BIOS/UEFI screen appears.",
    ],
    cautions: [
      "Never leave a loose screw inside the case.",
      "Do not flex the board while pressing connectors.",
    ],
    commonMistakes: [
      "Leaving extra standoffs under the board.",
      "Forgetting the I/O shield.",
      "Mixing up the front-panel header pins.",
    ],
  },
  cpu: {
    tools: [
      "ESD wrist strap",
      "Thermal paste",
      "Isopropyl alcohol (90% or higher) and a lint-free cloth",
    ],
    removeSteps: [
      "Power off, unplug, and discharge as in the safety checklist.",
      "Remove the CPU cooler first (see the CPU cooler guide) and unplug its fan cable.",
      "Release the socket retention lever by pushing it down and out. On LGA sockets, also lift the load plate. On AM4 sockets, lift the lever to 90 degrees.",
      "Lift the CPU straight up by its edges without sliding it.",
      "Place the CPU in an anti-static case. Do not touch the pins or gold contacts.",
    ],
    installSteps: [
      "Open the socket lever (and the load plate on LGA sockets).",
      "Find the small triangle or gold marker on the CPU corner and match it to the marker on the socket. Check the notches as well.",
      "Lower the CPU flat into the socket without pressing. It should drop in by its own weight.",
      "Close the load plate and lock the lever. Firm resistance is normal. On Intel sockets the plastic cover pops off by itself when the lever is locked.",
      "Apply a pea-sized dot of thermal paste in the center of the CPU (skip if the cooler has paste already applied).",
      "Mount the CPU cooler and connect its fan cable to the CPU_FAN header.",
    ],
    cautions: [
      "Bent socket or CPU pins usually cannot be repaired.",
      "Never push the CPU into the socket.",
      "Never touch the contacts.",
    ],
    commonMistakes: [
      "Mismatching the corner marker.",
      "Forcing the lever closed with the CPU misaligned.",
      "Using too much thermal paste.",
    ],
  },
  "cpu-cooler": {
    tools: [
      "Phillips screwdriver",
      "Thermal paste",
      "Isopropyl alcohol and lint-free cloth",
    ],
    removeSteps: [
      "Power off, unplug and discharge.",
      "Unplug the cooler fan cable from the CPU_FAN header.",
      "Loosen the mounting screws or clips a few turns at a time in a diagonal (X) pattern so the pressure is released evenly.",
      "If the cooler is stuck, gently twist it left and right by about 10 to 15 degrees to break the thermal paste seal.",
      "Lift the cooler straight up and away from the CPU.",
      "Clean the old paste from the CPU and the cooler base with isopropyl alcohol and a lint-free cloth.",
    ],
    installSteps: [
      "Remove the protective plastic film from the cooler base, if there is one.",
      "Apply a pea-sized dot of thermal paste in the middle of the CPU (skip if the paste is already applied to the cooler).",
      "Align the cooler with the mounting holes or backplate and lower it straight down.",
      "Tighten the screws or clips in a diagonal (X) pattern, a little at a time, until snug.",
      "Connect the fan cable to the CPU_FAN header.",
      "Power on and check in the BIOS/UEFI that the CPU fan is spinning and the temperature is normal.",
    ],
    cautions: [
      "Uneven tightening can crack or tilt the CPU contact.",
      "Do not run the PC without a cooler.",
    ],
    commonMistakes: [
      "Forgetting the plastic film on the base.",
      "Not plugging in the fan cable.",
      "Too much thermal paste.",
    ],
  },
  ram: {
    tools: ["ESD wrist strap"],
    removeSteps: [
      "Power off, unplug and discharge.",
      "Push the retaining clips at the ends of the memory slot outward (some boards have a clip on one side only).",
      "The module pops up slightly. Pull it straight up by its edges.",
      "Store it in an anti-static bag.",
    ],
    installSteps: [
      "Check the manual for the correct slots. For two modules and dual-channel, this is usually slots A2 and B2.",
      "Open the clips on the slot.",
      "Match the notch on the module to the key in the slot. DDR4 and DDR5 are not interchangeable.",
      "Press down firmly and evenly on both ends until the clips snap shut with a click.",
      "Power on and check in the BIOS/UEFI that the full memory amount is detected.",
    ],
    cautions: [
      "Do not touch the gold contacts.",
      "Do not rock the module sideways.",
      "Use even pressure.",
    ],
    commonMistakes: [
      "Not pressing hard enough, so the module is half seated.",
      "Installing in the wrong slots, so dual-channel is lost.",
    ],
  },
  gpu: {
    tools: ["Phillips screwdriver", "ESD wrist strap"],
    removeSteps: [
      "Power off, unplug and discharge.",
      "Disconnect the PCIe power cables (6/8-pin or 12VHPWR) from the card. Press the latch where there is one.",
      "Remove the screws that hold the card bracket to the rear of the case.",
      "Push the retention latch at the end of the PCIe slot to release it.",
      "Support the card and pull it straight out of the slot, keeping it level.",
    ],
    installSteps: [
      "Remove the matching rear slot cover(s) from the case.",
      "Align the card with the top PCIe x16 slot.",
      "Press down evenly until the slot latch clicks.",
      "Fasten the bracket screws to the case.",
      "Connect the PCIe power cables and push them in fully.",
      "Connect the monitor cable to the graphics card, not to the motherboard ports.",
      "Power on and install the graphics driver.",
    ],
    cautions: [
      "Large cards are heavy, so support them.",
      "Do not force the card.",
      "Bent power connectors can overheat.",
    ],
    commonMistakes: [
      "Not fully seating the power connector.",
      "Plugging the monitor into the motherboard.",
      "Forgetting the PCIe latch.",
    ],
  },
  psu: {
    tools: ["Phillips screwdriver", "Zip ties"],
    removeSteps: [
      "Power off, switch the PSU off and unplug the AC cord.",
      "Disconnect all PSU cables from the components (24-pin ATX, CPU, PCIe, SATA, Molex). Press the latches first.",
      "If the PSU is modular, also unplug the cables from the PSU side.",
      "Support the PSU with one hand and remove the 4 screws on the rear of the case.",
      "Slide the PSU out of the case.",
    ],
    installSteps: [
      "Decide the fan direction. Point the fan down if the case has a vent and filter below, otherwise point it up toward the case.",
      "Slide the PSU into the mounting area and fasten the 4 screws.",
      "Route the cables behind the motherboard tray where possible.",
      "Connect the 24-pin ATX, the 8-pin CPU power, the PCIe power and the SATA power cables.",
      "Tie the cables neatly and keep them away from fans.",
      "Plug in the AC cord, switch the PSU on and power up.",
    ],
    cautions: [
      "Never open a PSU. Its capacitors can hold a dangerous charge even when unplugged.",
      "Check that the PSU wattage fits the system.",
    ],
    commonMistakes: [
      "Forgetting the PSU switch.",
      "Using cables from another PSU model.",
      "Blocking the fan intake.",
    ],
  },
  hdd: {
    tools: ["Phillips screwdriver"],
    removeSteps: [
      "Shut the computer down completely and back up important files if the drive is still in use.",
      "Unplug the SATA power and SATA data cables from the drive.",
      "Remove the screws or release the tool-less tray that holds the drive.",
      "Slide the drive out of the bay, holding it by its sides.",
      "Place the drive on an anti-static surface and avoid bumps.",
    ],
    installSteps: [
      "Slide the drive into a 3.5\" bay with the connectors facing the cable side.",
      "Secure it with 4 screws or the tool-less rails.",
      "Connect the SATA data cable to a SATA port on the motherboard.",
      "Connect the SATA power cable from the PSU.",
      "Power on, then initialize and format the drive in the operating system if it is new.",
    ],
    cautions: [
      "HDDs have moving parts. Never move or knock the PC while the drive is spinning.",
      "A drop can destroy the drive.",
    ],
    commonMistakes: [
      "Not connecting the power cable (only the data cable).",
      "Using a bay that is too small.",
      "Not initializing a new drive.",
    ],
  },
  ssd: {
    tools: [
      "Phillips screwdriver (a small one for M.2 screws)",
      "ESD wrist strap",
    ],
    removeSteps: [
      "Power off, unplug and discharge.",
      "2.5\" SATA SSD: unplug the SATA data and SATA power cables.",
      "2.5\" SATA SSD: remove the screws or bracket and slide the drive out.",
      "M.2 NVMe SSD: remove the M.2 heatsink if there is one, then take out the single retaining screw.",
      "M.2 NVMe SSD: the drive lifts up at about 30 degrees. Pull it out of the slot at that angle.",
    ],
    installSteps: [
      "2.5\" SATA SSD: mount it in a 2.5\" bay or adapter bracket and secure it with screws.",
      "2.5\" SATA SSD: connect the SATA data cable to the motherboard and the SATA power cable to the PSU.",
      "M.2 NVMe SSD: move the standoff to the length of your drive (usually 2280) if needed.",
      "M.2 NVMe SSD: insert the drive into the M.2 slot at about 30 degrees, press it flat and fasten the screw. Refit the heatsink.",
      "Power on and check the drive in the BIOS/UEFI. Initialize and format it in the operating system if it is new.",
    ],
    cautions: [
      "Handle SSDs by the edges and avoid touching the chips and gold contacts.",
      "Do not over-tighten the M.2 screw.",
    ],
    commonMistakes: [
      "Forgetting the SATA power cable.",
      "Losing the tiny M.2 screw.",
      "Installing into an M.2 slot that supports only SATA or only NVMe.",
    ],
  },
  "sata-cable": {
    tools: ["None"],
    removeSteps: [
      "Power off, unplug and discharge.",
      "Find both ends of the cable: one at the drive and one at the motherboard SATA port.",
      "If the connector has a latch, press it in.",
      "Pull each end by the plastic connector, never by the cable.",
    ],
    installSteps: [
      "Match the L-shaped key of the connector to the L-shaped port on the drive.",
      "Push it in until it is fully seated.",
      "Connect the other end to a motherboard SATA port (use SATA0 or SATA1 for the boot drive).",
      "Route the cable away from fans and avoid sharp bends. Use right-angle connectors if space is tight.",
    ],
    cautions: [
      "Do not pull on the cable itself.",
      "Do not bend it sharply.",
    ],
    commonMistakes: [
      "Trying to force the connector the wrong way.",
      "A half-seated connector, so the drive is not detected.",
    ],
  },
  "cmos-battery": {
    tools: ["None (a plastic tool if needed; never a metal screwdriver)"],
    removeSteps: [
      "Power off, unplug the AC cord and press the power button to discharge.",
      "Write down any custom BIOS/UEFI settings, because they will reset.",
      "Find the round CR2032 coin cell on the motherboard.",
      "Gently push the retaining clip or tab to the side. The battery pops up.",
      "Lift the battery out. Avoid shorting it with metal tools.",
    ],
    installSteps: [
      "Take a new CR2032 battery.",
      "Place it with the plus (+) side facing up (visible).",
      "Slide it under the clip and press until it clicks.",
      "Reconnect power and start the PC.",
      "Enter the BIOS/UEFI and set the correct date and time.",
    ],
    cautions: [
      "Lithium batteries must be recycled at a proper collection point, not thrown in the trash.",
      "Do not short or bend the battery.",
    ],
    commonMistakes: [
      "Installing the battery upside down.",
      "Forgetting to reset the date and time.",
      "Using a metal tool that shorts the battery.",
    ],
  },
  "case-fan": {
    tools: ["Phillips screwdriver", "Zip ties"],
    removeSteps: [
      "Power off, unplug and discharge.",
      "Unplug the fan cable from the motherboard fan header (SYS_FAN or CHA_FAN), a splitter or a Molex adapter.",
      "Hold the fan and remove the 4 screws, or release the rubber mounts.",
      "Lift the fan out of the case.",
    ],
    installSteps: [
      "Check the airflow arrows on the fan frame. Front and bottom fans usually bring air in, rear and top fans usually push air out.",
      "Position the fan with the arrows pointing the right way and secure it with 4 screws.",
      "Connect the fan cable to a fan header, matching the key (4-pin PWM fans fit a 3-pin header too).",
      "Tie the cable so it cannot touch the blades.",
      "Power on and check that the fan spins.",
    ],
    cautions: [
      "Keep fingers and cables away from the blades.",
      "A fan installed backwards can disturb the airflow.",
    ],
    commonMistakes: [
      "Installing the fan in the wrong airflow direction.",
      "Forgetting to connect power.",
      "Cable touching the blades.",
    ],
  },
  nic: {
    tools: ["Phillips screwdriver", "ESD wrist strap"],
    removeSteps: [
      "Power off, unplug and discharge.",
      "Unplug the network (RJ45) cable. For Wi-Fi cards, unscrew the antennas.",
      "Remove the bracket screw that holds the card to the case.",
      "Release the slot latch if there is one, then pull the card straight out of the PCIe slot.",
    ],
    installSteps: [
      "Choose a matching slot. A typical NIC uses PCIe x1 (a longer slot also works).",
      "Remove the rear slot cover for that slot.",
      "Align the card and press it down evenly until it is fully seated.",
      "Fasten the bracket screw.",
      "For Wi-Fi cards, screw the antennas on before powering on.",
      "Plug in the network cable, power on, install the driver if needed and check that the link light is on.",
    ],
    cautions: [
      "Do not force the card.",
      "Do not power on a Wi-Fi card without antennas for long periods.",
    ],
    commonMistakes: [
      "Half-seated card.",
      "Forgetting to install the antennas.",
      "Using a very short bracket in a full-size case.",
    ],
  },
};

export function getHardwareProcedure(
  partId: string | null | undefined
): HardwareProcedure | undefined {
  if (!partId || !Object.prototype.hasOwnProperty.call(HARDWARE_PROCEDURES, partId)) {
    return undefined;
  }
  return HARDWARE_PROCEDURES[partId];
}
