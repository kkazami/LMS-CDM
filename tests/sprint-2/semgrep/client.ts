// Parse-only scanner fixtures. Never execute this file.
// ruleid: desktop-disabled-isolation
const unsafeNode = { nodeIntegration: true };
// ruleid: desktop-disabled-isolation
const unsafeContext = { contextIsolation: false };
// ruleid: desktop-disabled-isolation
const unsafeSandbox = { sandbox: false };
// ruleid: desktop-disabled-isolation
const unsafeWebSecurity = { webSecurity: false };
// ruleid: desktop-disabled-isolation
const unsafeMixedContent = { allowRunningInsecureContent: true };
// ok: desktop-disabled-isolation
const safe = { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, allowRunningInsecureContent: false };
// ruleid: client-dynamic-code
eval('dummy');
// ruleid: client-dynamic-code
new Function('return "dummy"');
// ruleid: desktop-certificate-bypass
app.commandLine.appendSwitch('ignore-certificate-errors');
