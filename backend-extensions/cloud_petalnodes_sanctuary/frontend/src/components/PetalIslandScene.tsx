import React from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { IslandStaticFallback } from './IslandStaticFallback';
import { buildVoxelIslandLayout, selectQualityProfile, type QualityTier } from './voxelIslandBuilder';
import { generateVoxelBlockPixels, type VoxelBlockKind } from './voxelTextures';

export interface PetalIslandSceneProps {
  paused?: boolean;
  resetSignal?: number;
  onTierChange?: (tier: QualityTier) => void;
}

function detectSoftwareGl(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (!dbg) return false;
    const label = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
    return /SwiftShader|llvmpipe|softpipe|Software Rasterizer/i.test(label);
  } catch {
    return false;
  }
}

function createVoxelMaterial(
  kind: VoxelBlockKind,
  anisotropy: number,
  disposables: { textures: THREE.Texture[]; materials: THREE.Material[] },
): THREE.MeshStandardMaterial {
  const pixels = generateVoxelBlockPixels(kind);

  const colorMap = new THREE.DataTexture(pixels.rgba, pixels.size, pixels.size, THREE.RGBAFormat);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.minFilter = THREE.NearestMipmapLinearFilter;
  colorMap.magFilter = THREE.NearestFilter;
  colorMap.generateMipmaps = true;
  colorMap.anisotropy = anisotropy;
  colorMap.needsUpdate = true;
  disposables.textures.push(colorMap);

  const normalMap = new THREE.DataTexture(pixels.normalRgba, pixels.size, pixels.size, THREE.RGBAFormat);
  normalMap.minFilter = THREE.NearestFilter;
  normalMap.magFilter = THREE.NearestFilter;
  normalMap.generateMipmaps = false;
  normalMap.needsUpdate = true;
  disposables.textures.push(normalMap);

  let emissiveMap: THREE.DataTexture | undefined;
  if (pixels.emissiveRgba) {
    emissiveMap = new THREE.DataTexture(pixels.emissiveRgba, pixels.size, pixels.size, THREE.RGBAFormat);
    emissiveMap.colorSpace = THREE.SRGBColorSpace;
    emissiveMap.minFilter = THREE.NearestFilter;
    emissiveMap.magFilter = THREE.NearestFilter;
    emissiveMap.needsUpdate = true;
    disposables.textures.push(emissiveMap);
  }

  const matOptions: THREE.MeshStandardMaterialParameters = {
    color: 0xffffff,
    map: colorMap,
    normalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: kind === 'water' ? 0.18 : kind === 'cherryLeaves' ? 0.85 : 0.72,
    metalness: 0.04,
    transparent: kind === 'water',
    opacity: kind === 'water' ? 0.86 : 1,
    alphaTest: kind === 'cherryLeaves' ? 0.5 : 0,
    side: kind === 'cherryLeaves' ? THREE.DoubleSide : THREE.FrontSide,
    emissive: emissiveMap ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
    emissiveIntensity: kind === 'lantern' ? 1.55 : kind === 'glowOre' ? 1.25 : 0,
  };
  if (emissiveMap) {
    matOptions.emissiveMap = emissiveMap;
  }

  const material = new THREE.MeshStandardMaterial(matOptions);

  disposables.materials.push(material);
  return material;
}

/**
 * Composite 5-part 3D Nodey mascot group anchored at bottom-center (0, 0, 0)
 * so he sits flush on the island grass.
 */
function buildVoxelNodeyGroup(disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] }): THREE.Group {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, metalness: 0.05 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x29232a, roughness: 0.35, metalness: 0.1 });
  const petalMat = new THREE.MeshStandardMaterial({
    color: 0xf4a6c1,
    roughness: 0.5,
    emissive: 0xf4a6c1,
    emissiveIntensity: 0.15,
  });
  const centerMat = new THREE.MeshStandardMaterial({ color: 0xffc75a, roughness: 0.4 });
  disposables.materials.push(bodyMat, eyeMat, petalMat, centerMat);

  const legGeo = new THREE.BoxGeometry(0.16, 0.16, 0.18);
  const cubeGeo = new THREE.BoxGeometry(0.62, 0.56, 0.58);
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.1, 0.04);
  const petalGeo = new THREE.BoxGeometry(0.18, 0.07, 0.18);
  const shadowGeo = new THREE.CircleGeometry(0.42, 16);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x29232a, transparent: true, opacity: 0.25, depthWrite: false });
  disposables.geometries.push(legGeo, cubeGeo, eyeGeo, petalGeo, shadowGeo);
  disposables.materials.push(shadowMat);

  const contact = new THREE.Mesh(shadowGeo, shadowMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.015;
  group.add(contact);

  const legL = new THREE.Mesh(legGeo, bodyMat);
  legL.position.set(-0.16, 0.08, 0);
  const legR = new THREE.Mesh(legGeo, bodyMat);
  legR.position.set(0.16, 0.08, 0);

  const cube = new THREE.Mesh(cubeGeo, bodyMat);
  cube.position.set(0, 0.44, 0);
  cube.castShadow = true;

  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.13, 0.46, 0.3);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.13, 0.46, 0.3);

  const blossom = new THREE.Group();
  blossom.position.set(0, 0.76, 0);
  const center = new THREE.Mesh(petalGeo, centerMat);
  center.scale.set(0.75, 1, 0.75);
  blossom.add(center);
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(petalGeo, petalMat);
    const a = (i * Math.PI) / 2;
    p.position.set(Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14);
    blossom.add(p);
  }

  group.add(legL, legR, cube, eyeL, eyeR, blossom);
  return group;
}

/**
 * Composite 4-part Sprout sapling figure anchored at bottom-center (0, 0, 0).
 */
function buildVoxelSproutGroup(disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] }): THREE.Group {
  const group = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x6faf5b, roughness: 0.75 });
  const podMat = new THREE.MeshStandardMaterial({ color: 0xfef2e4, roughness: 0.62 });
  const budMat = new THREE.MeshStandardMaterial({ color: 0xff8fab, roughness: 0.55 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x29232a, roughness: 0.3 });
  disposables.materials.push(stemMat, podMat, budMat, eyeMat);

  const stemGeo = new THREE.BoxGeometry(0.12, 0.34, 0.12);
  const leafGeo = new THREE.BoxGeometry(0.24, 0.08, 0.14);
  const headGeo = new THREE.BoxGeometry(0.38, 0.34, 0.36);
  const eyeGeo = new THREE.BoxGeometry(0.06, 0.08, 0.04);
  disposables.geometries.push(stemGeo, leafGeo, headGeo, eyeGeo);

  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.set(0, 0.17, 0);

  const leafL = new THREE.Mesh(leafGeo, stemMat);
  leafL.position.set(-0.18, 0.2, 0);
  leafL.rotation.z = 0.25;

  const leafR = new THREE.Mesh(leafGeo, budMat);
  leafR.position.set(0.18, 0.24, 0);
  leafR.rotation.z = -0.25;

  const head = new THREE.Mesh(headGeo, podMat);
  head.position.set(0, 0.48, 0);
  head.castShadow = true;

  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.08, 0.49, 0.19);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.08, 0.49, 0.19);

  group.add(stem, leafL, leafR, head, eyeL, eyeR);
  return group;
}

export default function PetalIslandScene({
  paused = false,
  resetSignal = 0,
  onTierChange,
}: PetalIslandSceneProps) {
  const mountRef = React.useRef<HTMLDivElement | null>(null);
  const pausedRef = React.useRef(paused);
  const resetOrbitRef = React.useRef<(() => void) | null>(null);

  const [fallbackReason, setFallbackReason] = React.useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  React.useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  React.useEffect(() => {
    if (resetSignal > 0) resetOrbitRef.current?.();
  }, [resetSignal]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setPrefersReducedMotion(mq.matches);
      if (mq.matches) {
        onTierChange?.('static');
        setFallbackReason('Static sanctuary view (reduced motion enabled)');
      } else {
        setFallbackReason((prev) =>
          prev === 'Static sanctuary view (reduced motion enabled)' ? null : prev,
        );
      }
    };
    sync();
    mq.addEventListener?.('change', sync);
    return () => {
      mq.removeEventListener?.('change', sync);
    };
  }, [onTierChange]);

  React.useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    if (prefersReducedMotion) {
      onTierChange?.('static');
      setFallbackReason('Static sanctuary view (reduced motion enabled)');
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      onTierChange?.('static');
      setFallbackReason('Static sanctuary view (WebGL unavailable)');
      return;
    }

    const isSoftwareGl = detectSoftwareGl(renderer);
    const isCoarseSmallScreen =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(pointer: coarse)').matches &&
      Math.min(window.innerWidth, window.innerHeight) < 768;

    const profile = selectQualityProfile({
      hasWebGL: true,
      reducedMotion: false,
      isSoftwareGl,
      isCoarseSmallScreen,
      hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 8,
    });
    onTierChange?.(profile.tier);

    const width = Math.max(260, container.clientWidth || 460);
    const height = Math.max(180, container.clientHeight || 240);

    renderer.setPixelRatio(profile.pixelRatio);
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = profile.enableShadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.setAttribute('data-testid', 'petal-island-canvas');
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D Petalnodes cherry-blossom voxel sanctuary');
    container.appendChild(renderer.domElement);

    const disposables: {
      geometries: THREE.BufferGeometry[];
      materials: THREE.Material[];
      textures: THREE.Texture[];
    } = {
      geometries: [],
      materials: [],
      textures: [],
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfceef3);
    scene.fog = new THREE.FogExp2(0xfceef3, 0.022);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    disposables.textures.push(envTex);
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.2, 80);

    // Sky gradient dome behind the floating island
    const skyGeo = new THREE.SphereGeometry(42, 16, 12);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color(0xcfe6ff) },
        uHorizon: { value: new THREE.Color(0xffe9de) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        varying vec3 vWorldPos;
        void main() {
          float h = clamp(normalize(vWorldPos).y * 0.9 + 0.25, 0.0, 1.0);
          gl_FragColor = vec4(mix(uHorizon, uTop, smoothstep(0.0, 0.85, h)), 1.0);
        }
      `,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);
    disposables.geometries.push(skyGeo);
    disposables.materials.push(skyMat);

    // Warm/cool contrast lighting
    const hemi = new THREE.HemisphereLight(0xcfe6ff, 0xc9b79c, 0.78);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffe2c4, 1.85);
    sun.position.set(11, 13, 9);
    sun.castShadow = profile.enableShadows;
    sun.shadow.mapSize.width = profile.shadowMapSize;
    sun.shadow.mapSize.height = profile.shadowMapSize;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 36;
    const d = 8.5;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);

    const islandGroup = new THREE.Group();
    scene.add(islandGroup);

    const layout = buildVoxelIslandLayout(profile.petalCount);

    // Lantern glow fill
    const lanternLight = new THREE.PointLight(0xffc75a, 1.4, 8, 2);
    lanternLight.position.set(layout.lanternLightPos.x, layout.lanternLightPos.y, layout.lanternLightPos.z);
    islandGroup.add(lanternLight);

    // Group placements by VoxelBlockKind for single InstancedMesh per block kind
    const grouped = new Map<VoxelBlockKind, typeof layout.blocks>();
    for (const b of layout.blocks) {
      const list = grouped.get(b.kind);
      if (list) list.push(b);
      else grouped.set(b.kind, [b]);
    }

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    disposables.geometries.push(boxGeo);
    const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const dummy = new THREE.Object3D();
    const colorScratch = new THREE.Color();

    grouped.forEach((placements, kind) => {
      const mat = createVoxelMaterial(kind, maxAniso, disposables);
      const inst = new THREE.InstancedMesh(boxGeo, mat, placements.length);
      inst.castShadow = profile.enableShadows && kind !== 'water';
      inst.receiveShadow = profile.enableShadows;

      placements.forEach((p, idx) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        inst.setMatrixAt(idx, dummy.matrix);
        if (p.tintHex !== undefined) {
          colorScratch.setHex(p.tintHex);
          inst.setColorAt(idx, colorScratch);
        }
      });

      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.computeBoundingSphere();
      islandGroup.add(inst);
    });

    // Mascots sitting flush on top surface
    const nodey = buildVoxelNodeyGroup(disposables);
    nodey.position.set(layout.nodeyAnchor.x, layout.nodeyAnchor.y, layout.nodeyAnchor.z);
    islandGroup.add(nodey);

    const sprout = buildVoxelSproutGroup(disposables);
    sprout.position.set(layout.sproutAnchor.x, layout.sproutAnchor.y, layout.sproutAnchor.z);
    islandGroup.add(sprout);

    // Soft contact-shadow disc under island for low tier ground separation
    const islandDropGeo = new THREE.CircleGeometry(4.4, 24);
    const islandDropMat = new THREE.MeshBasicMaterial({
      color: 0xd9bfd0,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const islandDrop = new THREE.Mesh(islandDropGeo, islandDropMat);
    islandDrop.rotation.x = -Math.PI / 2;
    islandDrop.position.y = -4.9;
    islandGroup.add(islandDrop);
    disposables.geometries.push(islandDropGeo);
    disposables.materials.push(islandDropMat);

    // Drifting cherry-blossom petals
    let petalMesh: THREE.InstancedMesh | null = null;
    if (layout.petals.length > 0) {
      const petalGeo = new THREE.PlaneGeometry(1, 0.72);
      const petalMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      });
      disposables.geometries.push(petalGeo);
      disposables.materials.push(petalMat);

      petalMesh = new THREE.InstancedMesh(petalGeo, petalMat, layout.petals.length);
      layout.petals.forEach((pt, idx) => {
        dummy.position.set(pt.x, pt.y, pt.z);
        dummy.scale.setScalar(pt.scale);
        dummy.updateMatrix();
        petalMesh!.setMatrixAt(idx, dummy.matrix);
        colorScratch.setHex(pt.colorHex);
        petalMesh!.setColorAt(idx, colorScratch);
      });
      petalMesh.instanceMatrix.needsUpdate = true;
      if (petalMesh.instanceColor) petalMesh.instanceColor.needsUpdate = true;
      petalMesh.computeBoundingSphere();
      islandGroup.add(petalMesh);
    }

    // Optional post-processing composer on GPU medium/high tiers
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (profile.enableBloom && !isSoftwareGl) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.28, 0.45, 0.88);
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Orbit interaction state
    const DEFAULT_AZIMUTH = 0.65;
    const DEFAULT_POLAR = 1.14;
    const ORBIT_RADIUS = 16.8;
    let targetAzimuth = DEFAULT_AZIMUTH;
    let currentAzimuth = DEFAULT_AZIMUTH;
    let targetPolar = DEFAULT_POLAR;
    let currentPolar = DEFAULT_POLAR;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    resetOrbitRef.current = () => {
      targetAzimuth = DEFAULT_AZIMUTH;
      targetPolar = DEFAULT_POLAR;
    };

    const updateCamera = () => {
      const sinP = Math.sin(currentPolar);
      camera.position.set(
        Math.sin(currentAzimuth) * sinP * ORBIT_RADIUS,
        Math.cos(currentPolar) * ORBIT_RADIUS + 0.9,
        Math.cos(currentAzimuth) * sinP * ORBIT_RADIUS,
      );
      camera.lookAt(0, 1.25, 0);
    };
    updateCamera();

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      targetAzimuth -= dx * 0.008;
      targetPolar = Math.min(1.38, Math.max(0.68, targetPolar - dy * 0.006));
    };
    const onPointerUp = () => {
      dragging = false;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Visibility & offscreen pausing
    let isInViewport = true;
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          isInViewport = entries.some((entry) => entry.isIntersecting);
        },
        { threshold: 0.05 },
      );
      io.observe(container);
    }

    let contextLost = false;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      onTierChange?.('static');
      setFallbackReason('Static sanctuary view (graphics context reset)');
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const onResize = () => {
      if (!container || contextLost) return;
      const w = Math.max(240, container.clientWidth);
      const h = Math.max(180, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composer?.setSize(w, h);
      bloomPass?.resolution.set(w, h);
    };

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onResize);
      ro.observe(container);
    }

    let rafId = 0;
    let timerId = 0;
    let disposed = false;
    const startMs = performance.now();
    let lastMs = startMs;
    const glCtx = renderer.getContext();

    const afterDraw = (cb: () => void, delayMs = 220) => {
      if (disposed || contextLost) return;
      if (!glCtx.isContextLost()) {
        glCtx.finish();
      }
      timerId = window.setTimeout(cb, delayMs);
    };

    const tick = () => {
      if (disposed || contextLost) return;

      const hidden = typeof document !== 'undefined' && document.hidden;
      const nowMs = performance.now();
      const dt = Math.min(0.05, Math.max(0, (nowMs - lastMs) / 1000));
      lastMs = nowMs;
      const elapsed = (nowMs - startMs) / 1000;

      if (!pausedRef.current && isInViewport && !hidden) {
        if (!dragging) {
          targetAzimuth += dt * 0.14;
        }
        const damp = 1 - Math.exp(-6 * dt);
        currentAzimuth += (targetAzimuth - currentAzimuth) * damp;
        currentPolar += (targetPolar - currentPolar) * damp;
        updateCamera();

        islandGroup.position.y = Math.sin(elapsed * 0.9) * 0.14;
        nodey.position.y = layout.nodeyAnchor.y + Math.abs(Math.sin(elapsed * 2.1)) * 0.04;
        sprout.rotation.z = Math.sin(elapsed * 1.8) * 0.06;

        if (petalMesh) {
          for (let i = 0; i < layout.petals.length; i++) {
            const pt = layout.petals[i];
            const fallY = ((pt.y - elapsed * pt.speedY + 8) % 8.2) - 0.5;
            const px = pt.x + Math.sin(elapsed * 0.9 + pt.phase) * pt.driftX * 1.6;
            const pz = pt.z + Math.cos(elapsed * 0.7 + pt.phase) * pt.driftX;
            dummy.position.set(px, fallY, pz);
            dummy.rotation.set(elapsed * 0.8 + pt.phase, elapsed * 0.5 + pt.phase, pt.phase);
            dummy.scale.setScalar(pt.scale);
            dummy.updateMatrix();
            petalMesh.setMatrixAt(i, dummy.matrix);
          }
          petalMesh.instanceMatrix.needsUpdate = true;
        }

        if (composer) composer.render();
        else renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick, dragging ? 60 : 220);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    // Draw initial frame immediately
    if (composer) composer.render();
    else renderer.render(scene, camera);

    if (isSoftwareGl) afterDraw(tick, 220);
    else rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      io?.disconnect();
      ro?.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      composer?.dispose();
      scene.clear();
      disposables.geometries.forEach((g) => g.dispose());
      disposables.materials.forEach((m) => m.dispose());
      disposables.textures.forEach((t) => t.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onTierChange, prefersReducedMotion]);

  if (fallbackReason) {
    return <IslandStaticFallback reason={fallbackReason} />;
  }

  return (
    <div
      ref={mountRef}
      data-testid="petal-island-mount"
      className="relative h-full w-full overflow-hidden rounded-xl border border-[#EEE5E9] bg-[#FCEEF3] cursor-grab active:cursor-grabbing"
    />
  );
}
