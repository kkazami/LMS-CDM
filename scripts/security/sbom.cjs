// Lockfile inventory, including optional/platform and build dependencies; not a shipped-binary inventory.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const [workspace, revision, output] = process.argv.slice(2);
if (!workspace || !/^[a-f0-9]{40}$/.test(revision || '') || !output) throw Error('workspace, exact revision and output required');
const YAML = require(path.resolve(workspace, 'node_modules/.pnpm/node_modules/yaml'));
const bytes = fs.readFileSync(path.join(workspace, 'pnpm-lock.yaml'));
const lock = YAML.parse(bytes.toString());
if (lock.lockfileVersion !== '9.0' || !lock.packages || !lock.snapshots || !lock.importers) throw Error('Unsupported lockfile');
const purl = key => {
  const base = key.split('(')[0], split = base.lastIndexOf('@');
  if (split < 1) throw Error(`Invalid package reference ${key}`);
  return 'pkg:npm/' + base.slice(0, split).split('/').map(encodeURIComponent).join('/') + '@' + base.slice(split + 1);
};
const components = Object.entries(lock.packages).map(([key, data]) => {
  const split = key.lastIndexOf('@');
  const item = { type: 'library', name: key.slice(0, split), version: key.slice(split + 1), 'bom-ref': purl(key), purl: purl(key) };
  const integrity = data.resolution?.integrity;
  if (integrity?.startsWith('sha512-')) item.hashes = [{ alg: 'SHA-512', content: Buffer.from(integrity.slice(7), 'base64').toString('hex') }];
  return item;
});
const refs = new Set(components.map(item => item['bom-ref']));
const edges = new Map(components.map(item => [item['bom-ref'], new Set()]));
const root = 'cdm-lms@' + revision;
const workspaceRef = name => name === '.' ? root : 'workspace:' + name;
for (const name of Object.keys(lock.importers)) {
  const ref = workspaceRef(name); refs.add(ref); edges.set(ref, new Set());
  if (name !== '.') components.push({ type: 'application', name, version: revision, 'bom-ref': ref });
}
function addEdges(ref, dependencies, importer) {
  for (const [name, value] of Object.entries(dependencies || {})) {
    const version = typeof value === 'object' ? value.version : value;
    const target = version.startsWith('link:') ? workspaceRef(path.posix.normalize(path.posix.join(importer, version.slice(5)))) : purl(name + '@' + version);
    if (!refs.has(target)) throw Error(`Unresolved SBOM edge ${ref} -> ${target}`);
    edges.get(ref).add(target);
  }
}
for (const [key, snapshot] of Object.entries(lock.snapshots)) {
  const ref = purl(key);
  if (!edges.has(ref)) throw Error('Snapshot missing package metadata');
  addEdges(ref, snapshot.dependencies); addEdges(ref, snapshot.optionalDependencies);
}
for (const [name, data] of Object.entries(lock.importers)) {
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) addEdges(workspaceRef(name), data[field], name);
}
const bom = { bomFormat: 'CycloneDX', specVersion: '1.6', version: 1,
  metadata: { component: { type: 'application', name: 'CdM LMS', version: revision, 'bom-ref': root },
    properties: [{ name: 'cdm:lock:sha256', value: createHash('sha256').update(bytes).digest('hex') },
      { name: 'cdm:scope', value: 'All pnpm lockfile workspaces; optional/platform and build dependencies included; license analysis pending' }] },
  components, dependencies: [...edges].map(([ref, deps]) => ({ ref, dependsOn: [...deps].sort() })) };
if (output === '-') console.log(JSON.stringify(bom));
else {
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(bom, null, 2) + '\n');
  console.log(JSON.stringify({ components: components.length, dependencyNodes: edges.size, lockSha256: bom.metadata.properties[0].value }));
}
