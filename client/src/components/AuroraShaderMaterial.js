import * as THREE from "three";

// Aurora Shader Material
const AuroraShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    color1: { value: new THREE.Color("#ff00ff") }, // Default Colors
    color2: { value: new THREE.Color("#00ffff") }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec2 resolution;
    uniform vec3 color1;
    uniform vec3 color2;
    
    varying vec2 vUv;

    float triNoise2d(vec2 p, float spd) {
        float rz = 0.;
        for (float i = 0.; i < 5.; i++ ) {
            rz += sin(p.x + sin(p.y)) * 0.5 + 0.5;
            p *= 1.5;
        }
        return clamp(rz * 0.6, 0., 1.);
    }

    void main() {
        vec2 p = vUv - 0.5;
        float n = triNoise2d(p * 2.0, 0.06);
        vec3 aurora = mix(color1, color2, n);
        gl_FragColor = vec4(aurora, 1.0);
    }
  `,
});

export default AuroraShaderMaterial;