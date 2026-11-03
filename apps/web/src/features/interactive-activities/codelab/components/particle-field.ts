import {
  Color, Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry,
  Mesh, OrthographicCamera, Scene, ShaderMaterial, Vector2, WebGLRenderer,
} from "three";
import { particleFragmentShader, particleVertexShader } from "./particle-shaders";

export function createParticleField(host: HTMLDivElement, dark: boolean) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 3;
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute([
    -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
  ], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uPointer: { value: new Vector2(3, 3) },
    uPointerStrength: { value: 0 },
    uColor: { value: new Color(dark ? "#4d6bff" : "#000000") },
  };
  const material = new ShaderMaterial({
    uniforms, vertexShader: particleVertexShader, fragmentShader: particleFragmentShader,
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 767px)");
  const targetPointer = new Vector2(3, 3);
  let pointerActive = false, inView = false, lost = false, disposed = false;
  let frame = 0, previousTime = 0, particleTime = 0;

  function populate() {
    const columns = mobile.matches ? 50 : 100;
    const rows = mobile.matches ? 40 : 80;
    const count = columns * rows;
    const base = new Float32Array(count * 3);
    const seed = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      base[i * 3] = ((i % columns) + Math.random() * 0.6) / columns * 2 - 1;
      base[i * 3 + 1] = (Math.floor(i / columns) + Math.random() * 0.6) / rows * 2 - 1;
      base[i * 3 + 2] = Math.random() - 0.5;
      seed[i * 3] = Math.random();
      seed[i * 3 + 1] = Math.random();
      seed[i * 3 + 2] = Math.random();
    }
    geometry.setAttribute("aBase", new InstancedBufferAttribute(base, 3));
    geometry.setAttribute("aSeed", new InstancedBufferAttribute(seed, 3));
    geometry.instanceCount = count;
  }

  function render() {
    if (!disposed && !lost) renderer.render(scene, camera);
  }

  function tick(now: number) {
    frame = 0;
    const dt = previousTime ? Math.min((now - previousTime) / 1000, 0.05) : 0;
    previousTime = now;
    particleTime += dt;
    uniforms.uTime.value = particleTime;
    const ease = 1 - Math.exp(-dt * 7);
    uniforms.uPointer.value.lerp(targetPointer, ease);
    uniforms.uPointerStrength.value += ((pointerActive ? 1 : 0) - uniforms.uPointerStrength.value) * ease;
    render();
    frame = requestAnimationFrame(tick);
  }

  function syncMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    if (!disposed && !lost && inView && !document.hidden && !reducedMotion.matches) {
      frame = requestAnimationFrame(tick);
    } else if (reducedMotion.matches) {
      uniforms.uPointerStrength.value = 0;
      render();
    }
  }

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile.matches ? 1.25 : 1.5));
    renderer.setSize(Math.max(width, 1), Math.max(height, 1));
    uniforms.uResolution.value.set(Math.max(width, 1), Math.max(height, 1));
    render();
  }

  function pointerMove(event: PointerEvent) {
    if (!inView || document.hidden || event.pointerType === "touch" || reducedMotion.matches) return;
    const bounds = host.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    pointerActive = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    if (pointerActive) targetPointer.set(x * 2 - 1, 1 - y * 2);
  }
  const pointerLeave = () => { pointerActive = false; };
  const contextLost = (event: Event) => { event.preventDefault(); lost = true; syncMotion(); };
  const contextRestored = () => { lost = false; resize(); syncMotion(); };
  const breakpointChanged = () => { geometry.dispose(); populate(); resize(); };
  const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; syncMotion(); });
  const resizeObserver = new ResizeObserver(resize);

  populate();
  resize();
  observer.observe(host);
  resizeObserver.observe(host);
  window.addEventListener("pointermove", pointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", pointerLeave);
  document.addEventListener("visibilitychange", syncMotion);
  reducedMotion.addEventListener("change", syncMotion);
  mobile.addEventListener("change", breakpointChanged);
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  renderer.domElement.addEventListener("webglcontextrestored", contextRestored);

  return {
    setTheme(nextDark: boolean) { uniforms.uColor.value.set(nextDark ? "#4d6bff" : "#000000"); render(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", pointerMove);
      document.documentElement.removeEventListener("pointerleave", pointerLeave);
      document.removeEventListener("visibilitychange", syncMotion);
      reducedMotion.removeEventListener("change", syncMotion);
      mobile.removeEventListener("change", breakpointChanged);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", contextRestored);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
