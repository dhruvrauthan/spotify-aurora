import React, { useState, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const AuroraScene = ({ vertex, fragment, phaseHue, staticScene = false }) => {
  const meshRef = useRef();

  // Load noise texture (make sure the path is correct)
  const noiseTexture = useTexture("/shader/noise2.png");
  const { viewport, mouse } = useThree();
  const [interactive, setInteractive] = useState(true);

  const width = viewport.width;
  const height = viewport.height;

  // Expose the mesh globally if needed for debugging
  useEffect(() => {
    window.auroraMesh = meshRef.current;
  }, []);

  // Define shader uniforms
  const uniforms = useMemo(
    () => ({
      iTime: { type: "f", value: 1.0 },
      iResolution: {
        type: "v2",
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      iMouse: { type: "v2", value: new THREE.Vector2(0, 0) },
      iChannel0: { type: "t", value: noiseTexture },
      phaseOffset: {
        type: "v3",
        value: new THREE.Vector3(2.15, -0.5, 1.2),
      },
      phaseHue: { type: "f", value: phaseHue },
    }),
    [noiseTexture]
  );

  // Update the phaseHue uniform when it changes
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.material.uniforms.phaseHue.value = phaseHue;
    }
  }, [phaseHue]);

  useEffect(() => {
    const handleGlobalMouseMove = (event) => {
      uniforms.iMouse.value.set(
        event.clientX,
        window.innerHeight - event.clientY
      );
    };
  
    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
  }, [uniforms]);

  // Update time uniform on each frame
  useFrame((state) => {
    if (!staticScene && meshRef.current) {
      const time = state.clock.getElapsedTime();
      meshRef.current.material.uniforms.iTime.value = time + 20;
    }
  });

  // Update mouse uniform on pointer move
  const handlePointerMove = (event) => {
    if (!staticScene) {
      uniforms.iMouse.value.set(
        event.clientX,
        window.innerHeight - event.clientY
      );
    }
  };

  return (
    <mesh ref={meshRef} onPointerMove={handlePointerMove}>
      <planeGeometry args={[width, height]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default AuroraScene;


// import { Canvas, useFrame } from "@react-three/fiber";
// import { useRef, useEffect, useState } from "react";
// import * as THREE from "three";

// const vertexShader = `
//   varying vec2 vUv;
//   void main() {
//     vUv = uv;
//     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//   }
// `;

// const fragmentShader = `
// // Aurora Shader (Converted from ShaderToy)
// uniform float iTime;
// uniform vec2 iResolution;
// uniform vec2 iMouse;
// varying vec2 vUv;

// #define time iTime

// mat2 mm2(in float a){float c = cos(a), s = sin(a);return mat2(c,s,-s,c);}
// mat2 m2 = mat2(0.95534, 0.29552, -0.29552, 0.95534);
// float tri(in float x){return clamp(abs(fract(x)-.5),0.01,0.49);}
// vec2 tri2(in vec2 p){return vec2(tri(p.x)+tri(p.y),tri(p.y+tri(p.x)));}

// float triNoise2d(in vec2 p, float spd) {
//     float z=1.8;
//     float z2=2.5;
// 	float rz = 0.;
//     p *= mm2(p.x*0.06);
//     vec2 bp = p;
// 	for (float i=0.; i<5.; i++ ) {
//         vec2 dg = tri2(bp*1.85)*.75;
//         dg *= mm2(time*spd);
//         p -= dg/z2;

//         bp *= 1.3;
//         z2 *= .45;
//         z *= .42;
// 		p *= 1.21 + (rz-1.0)*.02;
        
//         rz += tri(p.x+tri(p.y))*z;
//         p*= -m2;
// 	}
//     return clamp(1./pow(rz*29., 1.3),0.,.55);
// }

// float hash21(in vec2 n){ return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }

// vec4 aurora(vec3 ro, vec3 rd) {
//     vec4 col = vec4(0);
//     vec4 avgCol = vec4(0);
    
//     for(float i=0.;i<50.;i++) {
//         float of = 0.006*hash21(gl_FragCoord.xy)*smoothstep(0.,15., i);
//         float pt = ((.8+pow(i,1.4)*.002)-ro.y)/(rd.y*2.+0.4);
//         pt -= of;
//     	vec3 bpos = ro + pt*rd;
//         vec2 p = bpos.zx;
//         float rzt = triNoise2d(p, 0.06);
//         vec4 col2 = vec4(0,0,0, rzt);
//         col2.rgb = (sin(1.-vec3(2.15,-.5, 1.2)+i*0.043)*0.5+0.5)*rzt;
//         avgCol =  mix(avgCol, col2, .5);
//         col += avgCol*exp2(-i*0.065 - 2.5)*smoothstep(0.,5., i);
//     }
    
//     col *= (clamp(rd.y*15.+.4,0.,1.));
//     return col*1.8;
// }

// void main() {
//     vec2 p = vUv * 2.0 - 1.0;
//     p.x *= iResolution.x / iResolution.y;

//     vec3 ro = vec3(0,0,-6.7);
//     vec3 rd = normalize(vec3(p,1.3));

//     vec3 col = aurora(ro, rd).rgb;
    
//     gl_FragColor = vec4(col, 1.0);
// }
// `;

// const AuroraShader = () => {
//   const meshRef = useRef(null);
//   const materialRef = useRef(null);
//   const [resolution, setResolution] = useState(new THREE.Vector2(window.innerWidth, window.innerHeight));

//   // Resize listener to update resolution dynamically
//   useEffect(() => {
//     const handleResize = () => {
//       setResolution(new THREE.Vector2(window.innerWidth, window.innerHeight));
//     };
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   useFrame(({ clock, pointer }) => {
//     if (materialRef.current) {
//       materialRef.current.uniforms.iTime.value = clock.getElapsedTime();
//       materialRef.current.uniforms.iResolution.value = resolution;
//       materialRef.current.uniforms.iMouse.value.set(pointer.x * resolution.x, pointer.y * resolution.y);
//     }
//   });

//   return (
//     <mesh ref={meshRef}>
//       <planeGeometry args={[2, 2]} />
//       <shaderMaterial
//         ref={materialRef}
//         vertexShader={vertexShader}
//         fragmentShader={fragmentShader}
//         uniforms={{
//           iTime: { value: 0 },
//           iResolution: { value: resolution },
//           iMouse: { value: new THREE.Vector2(0, 0) }
//         }}
//       />
//     </mesh>
//   );
// };

// export default function AuroraScene() {
//   return (
//     <Canvas style={{ position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh" }}>
//       <AuroraShader />
//     </Canvas>
//   );
// }