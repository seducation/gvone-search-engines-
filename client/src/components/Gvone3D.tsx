import { useEffect, useRef } from "react";
import {
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import { cn } from "@/lib/utils";
import type { GestureMode } from "@/lib/gesture";

type Props = { mode: GestureMode; motion?: { x: number; y: number }; className?: string };

function material(scene: Scene, name: string, color: Color3, roughness = 0.8) {
  const value = new StandardMaterial(name, scene);
  value.diffuseColor = color;
  value.specularColor = new Color3(0.08, 0.1, 0.14);
  value.roughness = roughness;
  return value;
}

const GVONE_REFERENCE_TEXTURE = "/manus-storage/gvone-reference_4282b8a2.webp";

function createGvone(scene: Scene) {
  const root = new TransformNode("gvone-root", scene);
  const blue = material(scene, "gvone-fur", new Color3(0.08, 0.43, 0.82), 1);
  const blueLight = material(scene, "gvone-fur-light", new Color3(0.17, 0.58, 0.94), 1);
  const white = material(scene, "gvone-eyes", new Color3(0.97, 0.98, 0.95), 0.45);
  const black = material(scene, "gvone-pupils", new Color3(0.015, 0.025, 0.04), 0.25);
  const mouth = material(scene, "gvone-mouth", new Color3(0.07, 0.015, 0.04), 0.7);

  const body = MeshBuilder.CreateSphere("gvone-body", { segments: 32, diameter: 2.35 }, scene);
  body.scaling = new Vector3(0.72, 1.12, 0.58);
  body.position.y = 1.9;
  body.material = blue;
  body.parent = root;

  const belly = MeshBuilder.CreateSphere("gvone-belly", { segments: 28, diameter: 1.35 }, scene);
  belly.scaling = new Vector3(0.8, 1.15, 0.22);
  belly.position = new Vector3(0, 1.72, -0.49);
  belly.material = blueLight;
  belly.parent = root;

  const head = MeshBuilder.CreateSphere("gvone-head", { segments: 32, diameter: 1.8 }, scene);
  head.scaling = new Vector3(0.92, 0.9, 0.76);
  head.position.y = 3.02;
  head.material = blue;
  head.parent = root;

  const eyeLeft = MeshBuilder.CreateSphere("gvone-eye-left", { segments: 24, diameter: 0.42 }, scene);
  eyeLeft.position = new Vector3(-0.28, 3.18, -0.7);
  eyeLeft.material = white;
  eyeLeft.parent = root;
  const eyeRight = eyeLeft.clone("gvone-eye-right") as Mesh;
  eyeRight.position.x = 0.28;
  eyeRight.parent = root;
  const pupilLeft = MeshBuilder.CreateSphere("gvone-pupil-left", { segments: 18, diameter: 0.15 }, scene);
  pupilLeft.position = new Vector3(-0.28, 3.18, -0.9);
  pupilLeft.material = black;
  pupilLeft.parent = root;
  const pupilRight = pupilLeft.clone("gvone-pupil-right") as Mesh;
  pupilRight.position.x = 0.28;
  pupilRight.parent = root;

  const mouthMesh = MeshBuilder.CreateSphere("gvone-mouth", { segments: 24, diameter: 0.42 }, scene);
  mouthMesh.scaling = new Vector3(0.7, 1.25, 0.26);
  mouthMesh.position = new Vector3(0, 2.74, -0.72);
  mouthMesh.material = mouth;
  mouthMesh.parent = root;

  const makeLimb = (name: string, position: Vector3, scale: Vector3, rotation: Vector3, mat = blue) => {
    const limb = MeshBuilder.CreateCapsule(name, { height: 1.45, radius: 0.24, tessellation: 20 }, scene);
    limb.position = position;
    limb.scaling = scale;
    limb.rotation = rotation;
    limb.material = mat;
    limb.parent = root;
    return limb;
  };

  makeLimb("gvone-arm-left", new Vector3(-0.84, 2.65, 0), new Vector3(0.7, 0.95, 0.7), new Vector3(0, 0, -0.62));
  makeLimb("gvone-arm-right", new Vector3(0.84, 2.65, 0), new Vector3(0.7, 0.95, 0.7), new Vector3(0, 0, 0.62));
  makeLimb("gvone-leg-left", new Vector3(-0.34, 0.62, 0), new Vector3(0.62, 0.82, 0.7), new Vector3(0, 0, -0.08));
  makeLimb("gvone-leg-right", new Vector3(0.34, 0.62, 0), new Vector3(0.62, 0.82, 0.7), new Vector3(0, 0, 0.08));

  const handLeft = MeshBuilder.CreateSphere("gvone-hand-left", { segments: 20, diameter: 0.55 }, scene);
  handLeft.scaling = new Vector3(0.8, 1.15, 0.75);
  handLeft.position = new Vector3(-1.25, 3.35, 0);
  handLeft.material = blueLight;
  handLeft.parent = root;
  const handRight = handLeft.clone("gvone-hand-right") as Mesh;
  handRight.position.x = 1.25;
  handRight.parent = root;

  const footLeft = MeshBuilder.CreateSphere("gvone-foot-left", { segments: 24, diameter: 0.8 }, scene);
  footLeft.scaling = new Vector3(1.1, 0.62, 1.35);
  footLeft.position = new Vector3(-0.43, 0.04, -0.1);
  footLeft.material = blueLight;
  footLeft.parent = root;
  const footRight = footLeft.clone("gvone-foot-right") as Mesh;
  footRight.position.x = 0.43;
  footRight.parent = root;

  const tailPath = [
    new Vector3(0.58, 1.45, 0.18),
    new Vector3(1.0, 1.1, 0.25),
    new Vector3(1.34, 0.82, 0.34),
    new Vector3(1.52, 1.12, 0.32),
    new Vector3(1.42, 1.48, 0.24),
  ];
  const tail = MeshBuilder.CreateTube("gvone-tail", { path: tailPath, radius: 0.19, tessellation: 18, cap: 2 }, scene);
  tail.material = blueLight;
  tail.parent = root;

  const referencePlane = MeshBuilder.CreatePlane("gvone-reference-layer", { width: 4.1, height: 4.1 }, scene);
  const referenceMaterial = new StandardMaterial("gvone-reference-material", scene);
  referenceMaterial.diffuseTexture = new Texture(GVONE_REFERENCE_TEXTURE, scene);
  referenceMaterial.diffuseTexture.hasAlpha = true;
  referenceMaterial.useAlphaFromDiffuseTexture = true;
  referenceMaterial.alpha = 0.045;
  referenceMaterial.backFaceCulling = false;
  referencePlane.material = referenceMaterial;
  referencePlane.position = new Vector3(0, 1.85, 0.34);
  referencePlane.parent = root;

  root.position.y = -1.55;
  root.scaling = new Vector3(1.02, 1.02, 1.02);
  return root;
}

export default function Gvone3D({ mode, motion = { x: 0, y: 0 }, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const motionRef = useRef(motion);
  modeRef.current = mode;
  motionRef.current = motion;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, alpha: true });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0, 0, 0, 0);
    const camera = new ArcRotateCamera("gvone-camera", -Math.PI / 2, Math.PI / 2.15, 7.2, new Vector3(0, 1.8, 0), scene);
    camera.lowerRadiusLimit = 6.4;
    camera.upperRadiusLimit = 8;
    camera.detachControl();
    const light = new HemisphericLight("gvone-light", new Vector3(-0.4, 1, -0.7), scene);
    light.intensity = 1.3;
    light.groundColor = new Color3(0.18, 0.2, 0.28);
    createGvone(scene);
    let frame = 0;
    let pointerTargetX = 0;
    let pointerTargetY = 0;
    let antigravityX = 0;
    let antigravityY = 0;
    let velocityX = 0;
    let velocityY = 0;
    const onPointerMove = (event: PointerEvent) => {
      pointerTargetX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 0.42;
      pointerTargetY = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * -0.24;
    };
    const onPointerLeave = () => { pointerTargetX = 0; pointerTargetY = 0; };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    engine.runRenderLoop(() => {
      const root = scene.getTransformNodeByName("gvone-root");
      if (root) {
        const time = performance.now() * 0.001;
        camera.target.x += (pointerTargetX - camera.target.x) * 0.06;
        camera.target.y += (1.8 + pointerTargetY - camera.target.y) * 0.06;
        const current = modeRef.current;
        const input = reduceMotion ? { x: 0, y: 0 } : motionRef.current;
        velocityX = (velocityX + input.x * 0.018) * 0.93;
        velocityY = (velocityY + input.y * 0.018) * 0.93;
        antigravityX += velocityX;
        antigravityY += velocityY;
        const distance = Math.hypot(antigravityX, antigravityY);
        const boundary = 0.8;
        if (distance > boundary) {
          const nx = antigravityX / distance;
          const ny = antigravityY / distance;
          antigravityX = nx * boundary;
          antigravityY = ny * boundary;
          velocityX *= -0.62;
          velocityY *= -0.62;
        }
        const lift = reduceMotion ? 0 : current === "listening" ? Math.sin(time * 6) * 0.07 : Math.sin(time * 1.7) * 0.04;
        root.position.x = antigravityX;
        root.position.y = -1.55 + lift + antigravityY;
        root.rotation.y = reduceMotion ? 0 : Math.sin(time * 0.8) * (current === "touched" ? 0.12 : 0.035);
        const pulse = reduceMotion ? 1 : current === "speaking" ? 1 + Math.sin(time * 8) * 0.035 : current === "listening" ? 1.035 : 1;
        root.scaling.setAll(pulse);
      }
      scene.render();
      frame += 1;
      if (frame % 2 === 0) engine.resize();
    });
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className={cn("gvone-3d-canvas", className)} aria-label="Interactive 3D gvone character" />;
}
