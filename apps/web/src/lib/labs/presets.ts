import type { LabDefinition } from './schema';
import type { LabPresetKey } from './preset-catalog';
import { MYSQL_LAB } from './mysql';
import { WINDOWS_SERVER_SETUP, WINDOWS_SERVER_ADDS_DNS, WINDOWS_SERVER_DHCP, WINDOWS_SERVER_BACKUP } from './windows-server';

const UBUNTU_LAB: LabDefinition = {
  title: 'Install Ubuntu in a virtual machine', category: 'OPERATING_SYSTEMS',
  description: 'Install Ubuntu Desktop in an instructor-approved virtual machine and demonstrate that it boots.',
  objective: 'Choose the intended virtual disk, install Ubuntu Desktop, and verify the running system.',
  prerequisites: 'An instructor-approved VM with a disposable virtual disk and an approved Ubuntu Desktop ISO. Keep a backup or snapshot of any VM data you need.',
  requiredTools: 'Virtualization software, Ubuntu Desktop ISO, and a screenshot tool.', estimatedMinutes: 50,
  steps: [
    { key: 'prepare', type: 'INSTRUCTIONS', title: 'Prepare the virtual machine', required: true, config: { body: '1. Open the instructor-approved virtualization app and create or select your training VM. Use the assigned CPU, memory, storage, and Ubuntu release.\n2. Confirm the VM has its own disposable virtual disk. Back up any VM data you need.\n3. Attach the approved Ubuntu Desktop ISO to the VM’s virtual optical drive.\n4. Start the VM and confirm that you see the Ubuntu welcome/installer screen.\n\nExpected: the installer runs inside the VM window. If the ISO does not boot, check the VM’s optical-drive attachment and boot order with your instructor. Never boot the host computer into this installer for this lab.', resources: [{ type: 'LINK', title: 'Ubuntu installation guide with screenshots', url: 'https://ubuntu.com/tutorials/install-ubuntu-desktop', caption: 'Use the installer inside your VM. Menu labels can vary by Ubuntu release.' }] } },
    { key: 'install', type: 'INSTRUCTIONS', title: 'Install and restart', required: true, config: { body: '1. In the VM, choose Install Ubuntu and the standard interactive installation. Follow the assigned language, keyboard, and software choices.\n2. Review the installation target. It must be the disposable VIRTUAL disk from the previous step. If uncertain, stop before confirming.\n3. Create the assigned local account and finish installation. Keep passwords and recovery keys private.\n4. Restart the VM. Detach the ISO when prompted, then sign in to the installed desktop.\n\nExpected: Ubuntu boots from the virtual disk into the login/desktop screen. If the installer starts again, detach the ISO and check the VM boot order; do not repeat installation.' } },
    { key: 'verify', type: 'COMMAND', title: 'Check the installed system', required: true, config: { body: 'In the installed VM, open Terminal and run this display-only example locally. It reports the installed distribution; the LMS does not run it for you.', language: 'shell', command: 'cat /etc/os-release' } },
    { key: 'checks', type: 'CHECKLIST', title: 'Confirm the result', required: true, config: { items: [
      { id: 'vm', label: 'I installed to the intended virtual disk and can boot the VM without the installer ISO.', required: true },
      { id: 'version', label: 'The installed Ubuntu name and version are visible.', required: true },
      { id: 'token', label: 'My evidence token is visible in the screenshot or VM name.', required: true },
    ] } },
    { key: 'explain', type: 'TEXT_RESPONSE', title: 'Explain the installation choice', required: true, config: { prompt: 'How did you confirm the installer used the correct virtual disk, and how would you recover if that VM installation failed?', maxLength: 1500 } },
    { key: 'evidence', type: 'EVIDENCE_UPLOAD', title: 'Show the installed VM', required: true, config: { instructions: 'Upload a screenshot of the running Ubuntu VM and the /etc/os-release output with your evidence token. Hide passwords, account details, and host files.', minFiles: 1, maxFiles: 2 } },
  ],
};

const ROUTER_LAB: LabDefinition = {
  title: 'Configure a lab router LAN interface', category: 'NETWORKING',
  description: 'Configure one assigned LAN interface on an isolated router or simulator and verify connectivity.',
  objective: 'Apply an instructor-provided IPv4 plan to one lab interface and show its status and a client connectivity check.',
  prerequisites: 'An instructor-approved router or simulator, an isolated lab network, and an assigned interface and address plan. Do not modify shared or production equipment.',
  requiredTools: 'Router console or approved simulator, lab client, and screenshot tool.', estimatedMinutes: 40,
  steps: [
    { key: 'prepare', type: 'INSTRUCTIONS', title: 'Record the lab address plan', required: true, config: { body: '1. Open the assigned Cisco IOS router console or approved simulator. Work on the isolated training network only.\n2. Record the router interface name, router IPv4/mask, and client IPv4/mask from your instructor.\n3. Connect the client to that LAN interface using the assigned cable or simulator connection.\n4. Confirm the interface name on the device before using the example below.\n\nThe example uses router 192.0.2.1/24 and client 192.0.2.2/24. Replace these documentation addresses if your instructor assigned a different plan. Keep credentials out of evidence.', resources: [{ type: 'IMAGE', title: 'An isolated router and client lab', url: '/images/labs/isolated-lab-network.svg', caption: 'Example addresses only. Both lab interfaces share one subnet; use the assigned interface and address plan.' }] } },
    { key: 'configure', type: 'COMMAND', title: 'Configure the assigned interface', required: true, config: { body: 'Run on your approved router or simulator only. 192.0.2.1 is a documentation example, not a provided campus address. Adapt the interface and IP to your instructor-approved isolated lab plan.', language: 'cisco-ios', command: 'enable\nconfigure terminal\ninterface GigabitEthernet0/0\nip address 192.0.2.1 255.255.255.0\nno shutdown\nend\nshow ip interface brief' } },
    { key: 'client', type: 'INSTRUCTIONS', title: 'Configure the client and test connectivity', required: true, config: { body: '1. On the CLIENT lab adapter, set the assigned client IP and mask. For the example, use 192.0.2.2 and 255.255.255.0, not the router’s .1 address.\n2. Set the gateway to the router address only if your assigned plan requires it. This local interface test does not require internet or DNS.\n3. From that client, ping the router’s LAN address (192.0.2.1 in the example).\n4. On the router inspect show ip interface brief.\n\nExpected: the connected interface is up/up and the client receives ping replies. If not, check the connection, interface name/no shutdown, and both addresses/masks. Record the actual result; do not claim a passing test if it fails.', resources: [{ type: 'LINK', title: 'Cisco IPv4 interface configuration', url: 'https://www.cisco.com/c/en/us/td/docs/routers/ios-xe/ip-addressing/ip-addressing/m_config-ipv4-addr-0.html', caption: 'Reference for assigning an interface address and enabling the interface.' }] } },
    { key: 'check', type: 'CHECKLIST', title: 'Verify the lab network', required: true, config: { items: [
      { id: 'assigned', label: 'I used only my assigned lab interface and address plan.', required: true },
      { id: 'status', label: 'The interface shows its assigned address and expected status.', required: true },
      { id: 'connectivity', label: 'My lab client can reach the router address or I recorded the test result and cause.', required: true },
      { id: 'token', label: 'My evidence token appears in a safe label or the screenshot.', required: true },
    ] } },
    { key: 'explain', type: 'TEXT_RESPONSE', title: 'Explain the verification', required: true, config: { prompt: 'What did the interface status and client connectivity test show? If a test failed, what would you check first?', maxLength: 1500 } },
    { key: 'evidence', type: 'EVIDENCE_UPLOAD', title: 'Show the router result', required: true, config: { instructions: 'Upload one or two screenshots showing the assigned interface status, a lab client connectivity result, and your evidence token. Crop out credentials, unrelated interfaces, and real network details.', minFiles: 1, maxFiles: 2 } },
  ],
};

const RJ45_LAB: LabDefinition = {
  title: 'Crimp and test an RJ45 patch cable', category: 'HARDWARE',
  description: 'Assemble a straight-through Ethernet patch cable and verify its wire map.',
  objective: 'Terminate both ends with the assigned T568 scheme and demonstrate a passing tester result.',
  prerequisites: 'Instructor-approved cable and compatible plugs, supervised access to cutting/crimping tools, and the assigned T568A or T568B scheme.',
  requiredTools: 'Cable, matching 8P8C modular plugs, stripper/crimper, wire-map tester, eye protection as required by the lab, and camera.', estimatedMinutes: 45,
  steps: [
    { key: 'prepare', type: 'INSTRUCTIONS', title: 'Confirm the wiring scheme', required: true, config: { body: '1. Confirm your cable type, matching 8P8C plugs, crimper, and cable tester with the instructor. Keep the cable disconnected from powered equipment.\n2. Use the same assigned T568A or T568B scheme on BOTH ends for this straight-through patch cable.\n3. Identify pin 1 using the plug manufacturer’s drawing. For T568B, pins 1–8 are white/orange, orange, white/green, blue, white/blue, green, white/brown, brown.\n\nThe diagram below is T568B only. If your class uses T568A, use the linked reference and the instructor’s pinout instead.', resources: [{ type: 'IMAGE', title: 'T568B pin-to-color reference', url: '/images/labs/rj45-t568b.svg', caption: 'Read the numbered pins, not an assumed left/right plug view. Use the plug manufacturer’s orientation.' }, { type: 'LINK', title: 'Fluke Networks: T568A and T568B diagrams', url: 'https://www.flukenetworks.com/knowledge-base/application-or-standards-articles-copper/differences-between-wiring-codes-t568a-vs', caption: 'Compare the two schemes before arranging the conductors.' }] } },
    { key: 'assemble', type: 'INSTRUCTIONS', title: 'Terminate both ends', required: true, config: { body: '1. With instructor supervision, strip only the jacket length specified for your plug. Avoid nicking the conductors.\n2. Arrange all eight conductors in the assigned pin order. Keep pair twists close to the plug contacts.\n3. Trim evenly as required by the plug, insert fully, and confirm each conductor reaches its contact. The jacket must sit under the strain relief.\n4. Recheck the pin order, then crimp with the matching tool. Repeat using the SAME scheme at the other end.\n5. Connect both ends to the tester, run its wire-map test, and compare pins 1–8.\n\nExpected: 1-to-1 mapping with no open, short, or reversal. A basic continuity pass does not certify bandwidth or detect every split-pair fault; report the tester model and its actual result. If a fault appears, recheck the pin order and seating before replacing a plug.' } },
    { key: 'test', type: 'CHECKLIST', title: 'Read the cable tester', required: true, config: { items: [
      { id: 'scheme', label: 'Both ends use the same assigned T568 scheme.', required: true },
      { id: 'seated', label: 'All conductors are seated and the jacket is held by the plug.', required: true },
      { id: 'wiremap', label: 'The tester reports the expected 1-to-1 wire map with no open, short, or reversal.', required: true },
      { id: 'token', label: 'My evidence token is visible beside the finished cable or tester.', required: true },
    ] } },
    { key: 'explain', type: 'TEXT_RESPONSE', title: 'Explain the test result', required: true, config: { prompt: 'Why must both ends use the same wiring scheme for this straight-through cable? What would a wire-map failure tell you?', maxLength: 1500 } },
    { key: 'evidence', type: 'EVIDENCE_UPLOAD', title: 'Show the finished cable', required: true, config: { instructions: 'Upload clear photos of both finished plugs and the wire-map tester result with your evidence token. A combined image is fine. Do not include other students or unrelated equipment.', minFiles: 1, maxFiles: 3 } },
  ],
};

const FIBER_LAB: LabDefinition = {
  title: 'Terminate and test a fiber-optic connector', category: 'HARDWARE',
  description: 'Prepare a non-live training fiber with the instructor-approved connector kit and document the result.',
  objective: 'Follow the specific connector kit procedure, inspect the end face safely, and record an instructor-approved test.',
  prerequisites: 'Instructor supervision; a disconnected, verified non-live training fiber; the exact connector and kit instructions; a sharps container. Do not work on an active link.',
  requiredTools: 'Approved fiber termination kit, eye protection, fiber scrap container, purpose-made cleaning supplies, approved inspection tool and test set, camera.', estimatedMinutes: 60,
  steps: [
    { key: 'safety', type: 'INSTRUCTIONS', title: 'Confirm the fiber is safe to handle', required: true, config: { body: 'Have the instructor verify that the training fiber is disconnected and carries no optical signal before handling or inspection. Never look directly into a fiber end or through an unfiltered microscope. Wear the required eye protection and put every glass scrap in the designated sharps container. Do not touch active network fibers.' } },
    { key: 'terminate', type: 'INSTRUCTIONS', title: 'Follow the assigned connector kit', required: true, config: { body: '1. Identify the exact connector, fiber type, and kit with the instructor. The instructor must supply that kit’s procedure or attach it to this step before the hands-on task.\n2. Watch the instructor demonstration, then follow the kit’s preparation, stripping, cleaning, cleaving, and attachment sequence. Use its stated dimensions and tools; there is no universal strip/cleave length.\n3. Secure the connector/strain relief as specified and place every glass scrap in the approved container.\n\nThe optional FOA video demonstrates a Panduit OptiCam prepolished/splice connector. It is an example of one kit, not a procedure for other connectors. If your kit differs or a step is unclear, stop for the instructor demonstration rather than improvising.', resources: [{ type: 'YOUTUBE', title: 'FOA: Panduit OptiCam connector demonstration', url: 'https://www.youtube.com/watch?v=9zGAyRtbTBM', caption: 'Kit-specific example from FOA (2013). Use only alongside the current instructions for your assigned kit.' }] } },
    { key: 'inspect', type: 'INSTRUCTIONS', title: 'Inspect, clean, and test', required: true, config: { body: '1. Confirm again with the instructor that the training fiber is non-live.\n2. Use the approved filtered inspection tool to inspect the connector end face. Clean with fiber-specific supplies if needed, then reinspect.\n3. Run the assigned continuity or insertion-loss test using the instructor’s equipment and method.\n4. Record the test type, measured result, and instructor-provided pass criteria.\n\nExpected: an acceptable end face and a documented result against the assigned criterion. A visible-light continuity check alone does not certify insertion loss. Never connect to a live link just to test the connector.', resources: [{ type: 'YOUTUBE', title: 'FOA: connector inspection demonstration', url: 'https://www.youtube.com/watch?v=IyumH8CiUPQ', caption: 'Optional visual reference. Keep the non-live-fiber and approved-scope requirements in the written step.' }, { type: 'LINK', title: 'FOA inspection and cleaning guide', url: 'https://www.thefoa.org/tech/ref/testing/test/scope.html', caption: 'Reference images for contamination and connector inspection.' }] } },
    { key: 'checks', type: 'CHECKLIST', title: 'Document the result', required: true, config: { items: [
      { id: 'safe', label: 'The instructor confirmed a non-live training fiber and safe scrap disposal.', required: true },
      { id: 'kit', label: 'I followed the assigned connector kit instructions.', required: true },
      { id: 'inspection', label: 'The connector was safely inspected and cleaned if needed.', required: true },
      { id: 'result', label: 'I recorded the approved test result and pass criteria.', required: true },
      { id: 'token', label: 'My evidence token is visible beside the finished work or test record.', required: true },
    ] } },
    { key: 'explain', type: 'TEXT_RESPONSE', title: 'Explain your test', required: true, config: { prompt: 'Which connector method and test did you use? What was the result, and how did you determine whether it passed?', maxLength: 1500 } },
    { key: 'evidence', type: 'EVIDENCE_UPLOAD', title: 'Show the connector and result', required: true, config: { instructions: 'Upload up to three photos or a PDF showing the finished training connector, approved inspection or test result, and your evidence token. Do not photograph active equipment labels or other students.', minFiles: 1, maxFiles: 3 } },
  ],
};

/** Examples are copied into instructor-owned drafts; editing or publishing never mutates this catalog. */
export const LAB_PRESETS = {
  MYSQL: MYSQL_LAB,
  UBUNTU: UBUNTU_LAB,
  ROUTER: ROUTER_LAB,
  RJ45: RJ45_LAB,
  FIBER: FIBER_LAB,
  WINDOWS_SERVER_SETUP,
  WINDOWS_SERVER_ADDS_DNS,
  WINDOWS_SERVER_DHCP,
  WINDOWS_SERVER_BACKUP,
} satisfies Record<LabPresetKey, LabDefinition>;
