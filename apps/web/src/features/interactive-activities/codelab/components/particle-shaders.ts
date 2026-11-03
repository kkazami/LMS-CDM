export const particleVertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  attribute vec3 aBase;
  attribute vec3 aSeed;
  varying vec2 vLocal;
  varying float vHalfLength;
  varying float vRadius;
  varying float vAlpha;

  vec2 gradient(vec2 cell) {
    float angle = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453) * 6.2831853;
    return vec2(cos(angle), sin(angle));
  }

  float simplex(vec2 p) {
    const float F = 0.366025404;
    const float G = 0.211324865;
    vec2 cell = floor(p + (p.x + p.y) * F);
    vec2 p0 = p - cell + (cell.x + cell.y) * G;
    vec2 corner = p0.x > p0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec2 p1 = p0 - corner + G;
    vec2 p2 = p0 - 1.0 + 2.0 * G;
    vec3 weight = max(0.5 - vec3(dot(p0, p0), dot(p1, p1), dot(p2, p2)), 0.0);
    weight *= weight;
    weight *= weight;
    return 70.0 * dot(weight, vec3(
      dot(gradient(cell), p0),
      dot(gradient(cell + corner), p1),
      dot(gradient(cell + 1.0), p2)
    ));
  }

  vec3 flow(float time) {
    float y = mod(aBase.y + 1.0 + time * 0.035, 2.0) - 1.0;
    float noise = simplex(vec2(y * 1.4, time * 0.055));
    float center = sin(y * 1.8 + time * 0.16) * 0.3 + noise * 0.16;
    float x = aBase.x * 1.65 + center;
    x += sin(y * 5.0 + time * 0.22 + aBase.z * 2.0) * 0.025;
    return vec3(x, y + noise * 0.035, aBase.z * 0.3);
  }

  void main() {
    vec3 p = flow(uTime);
    vec3 previous = flow(uTime - 0.035);
    float aspect = uResolution.x / uResolution.y;
    vec2 distanceToPointer = (p.xy - uPointer) * vec2(aspect, 1.0);
    float distanceFromPointer = length(distanceToPointer);
    float push = exp(-distanceFromPointer * distanceFromPointer * 28.0) * uPointerStrength;
    vec2 repulsion = distanceToPointer / max(distanceFromPointer, 0.025) * push * 0.12;
    p.xy += repulsion / vec2(aspect, 1.0);

    vec2 velocity = (p.xy - previous.xy) * uResolution;
    vec2 direction = normalize(velocity + vec2(0.01, 0.1));
    vec2 perpendicular = vec2(-direction.y, direction.x);
    float center = sin(p.y * 1.8 + uTime * 0.16) * 0.3;
    float density = exp(-pow((p.x - center) * 0.5, 2.0));
    float depth = 0.9 + aBase.z * 0.2;
    float dashLength = mix(1.3, 5.0, density) * depth * mix(0.65, 1.15, aSeed.z);
    float radius = mix(0.4, 1.0, density) * depth;
    vLocal = position.xy * vec2(dashLength + 1.5, radius * 2.0 + 1.5);
    vHalfLength = dashLength * 0.5;
    vRadius = radius;
    vec2 pixelOffset = direction * vLocal.x + perpendicular * vLocal.y;
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    clip.xy += pixelOffset * 2.0 / uResolution * clip.w;
    gl_Position = clip;

    float edge = (1.0 - smoothstep(0.82, 1.05, abs(p.y)))
      * (1.0 - smoothstep(0.95, 1.2, abs(p.x)));
    vAlpha = mix(0.12, 0.85, density) * pow(aSeed.x, 4.0) * edge;
  }
`;

export const particleFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying vec2 vLocal;
  varying float vHalfLength;
  varying float vRadius;
  varying float vAlpha;

  void main() {
    vec2 capsule = vec2(max(abs(vLocal.x) - max(vHalfLength - vRadius, 0.0), 0.0), vLocal.y);
    float distanceToEdge = length(capsule) - vRadius;
    float feather = max(fwidth(distanceToEdge), 0.15);
    float alpha = (1.0 - smoothstep(-feather, feather, distanceToEdge)) * vAlpha;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(uColor, alpha);
    #include <colorspace_fragment>
  }
`;
