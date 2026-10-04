import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { DockerRuntime } from './docker-runtime';
import { ensure } from './contracts';
import { Approval, ApprovalPayload } from './types';

export interface SignerService { volume: string; owner: string; image: string; uid: number; publicKey: string }
const signer = `const fs=require('node:fs'),crypto=require('node:crypto');let input='';process.stdin.on('data',b=>input+=b);process.stdin.on('end',()=>{
const r=JSON.parse(input),key='/signer/approval.private.pem',pub='/signer/approval.public.pem',pass=process.env.HARNESS_SIGNER_PASSPHRASE;
if(!pass||pass.length<32)throw Error('Host-only passphrase required');
if(r.op==='provision'){const pair=crypto.generateKeyPairSync('ed25519');fs.writeFileSync(key,pair.privateKey.export({type:'pkcs8',format:'pem',cipher:'aes-256-cbc',passphrase:pass}),{flag:'wx',mode:384});fs.writeFileSync(pub,pair.publicKey.export({type:'spki',format:'pem'}),{flag:'wx',mode:384});console.log(JSON.stringify({publicKey:fs.readFileSync(pub,'utf8')}));}
else if(r.op==='sign'){const p=r.payload;if(p.version!==2||!['architecture','implementation','deployment'].includes(p.purpose)||!p.human||!p.runId||!['LOW','MEDIUM','HIGH','CRITICAL'].includes(p.risk)||!/^[a-f0-9]{64}$/.test(p.subject)||Date.parse(p.expiresAt)<=Date.now()||Date.parse(p.expiresAt)-Date.parse(p.issuedAt)>900000)throw Error('Invalid exact approval payload');
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v!==null&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const privateKey=crypto.createPrivateKey({key:fs.readFileSync(key),passphrase:pass});console.log(JSON.stringify({payload:p,signature:crypto.sign(null,Buffer.from(canonical(p)),privateKey).toString('base64')}));}
else throw Error('Unknown signer operation');});`;

export class IsolatedSigner {
  constructor(readonly docker: DockerRuntime) {}
  private invoke(service: Pick<SignerService, 'volume' | 'owner' | 'image' | 'uid'>, request: unknown): string {
    ensure(process.env.HARNESS_SIGNER_PASSPHRASE && process.env.HARNESS_SIGNER_PASSPHRASE.length >= 32, 'Host-only signer passphrase required');
    ensure(this.docker.call(['volume', 'inspect', service.volume, '--format', '{{index .Labels "harness.owner"}}']) === service.owner, 'Signer volume ownership differs');
    return execFileSync(this.docker.executable, ['run', '--rm', '--interactive', '--network=none', '--user', String(service.uid),
      '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=16', '--memory=128m',
      '--env', 'HARNESS_SIGNER_PASSPHRASE', '--mount', `type=volume,src=${service.volume},dst=/signer`,
      service.image, 'node', '-e', signer], { input: JSON.stringify(request), encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000, maxBuffer: 100000 });
  }
  provision(): SignerService {
    const owner = randomUUID(), volume = 'harness-signer-' + owner, image = this.docker.image('node:22-bookworm-slim'), uid = 10001;
    this.docker.call(['volume', 'create', '--label', 'harness.owner=' + owner, volume]);
    // Only this trusted provisioning command runs as root; signing itself has no root/capabilities/network.
    this.docker.call(['run', '--rm', '--network=none', '--read-only', '--cap-drop=ALL', '--cap-add=CHOWN', '--cap-add=FOWNER',
      '--security-opt=no-new-privileges', '--mount', `type=volume,src=${volume},dst=/signer`, image, 'node', '-e',
      "const fs=require('node:fs');fs.chownSync('/signer',10001,10001);fs.chmodSync('/signer',0o700)"]);
    const service = { volume, owner, image, uid };
    const result = JSON.parse(this.invoke(service, { op: 'provision' })); ensure(typeof result.publicKey === 'string', 'Signer returned no public key');
    return { ...service, publicKey: result.publicKey };
  }
  sign(service: SignerService, payload: ApprovalPayload): Approval {
    return JSON.parse(this.invoke(service, { op: 'sign', payload }));
  }
  probeDeniedRead(service: SignerService): boolean {
    const probe = "const fs=require('node:fs');try{fs.readFileSync('/signer/approval.private.pem');process.exit(2)}catch(e){if(e.code!=='EACCES')throw e;console.log('DENIED: separate worker UID cannot read protected signer key')}";
    const result = this.docker.call(['run', '--rm', '--network=none', '--user', '10002', '--read-only', '--cap-drop=ALL',
      '--security-opt=no-new-privileges', '--mount', `type=volume,src=${service.volume},dst=/signer,readonly`, service.image, 'node', '-e', probe]);
    return result.startsWith('DENIED:');
  }
}
