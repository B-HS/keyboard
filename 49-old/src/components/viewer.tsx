import { useEffect, useRef, type FC } from "react";
import {
  prepareRender,
  drawCommands,
  cameras,
  controls,
  entitiesFromSolids,
} from "@jscad/regl-renderer";
import { measurements } from "@jscad/modeling";
import type { Geom3 } from "@jscad/modeling/src/geometries/types";

const { measureAggregateBoundingBox } = measurements;

type ViewerProps = {
  solids: Geom3[];
};

type Vec3 = [number, number, number];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3): Vec3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export const Viewer: FC<ViewerProps> = ({ solids }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const solidsRef = useRef<Geom3[]>(solids);
  solidsRef.current = solids;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const perspectiveCamera = cameras.perspective;
    const orbitControls = controls.orbit;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    resize();

    const camera = {
      ...perspectiveCamera.defaults,
      position: [0, 0, 500] as Vec3,
      target: [0, 0, 0] as Vec3,
    };
    let orbitState = { ...orbitControls.defaults };

    perspectiveCamera.setProjection(camera, camera, {
      width: canvas.width,
      height: canvas.height,
    });
    perspectiveCamera.update(camera, camera);

    const renderer = prepareRender({ glOptions: { canvas } });

    const gridOptions = {
      visuals: {
        drawCmd: "drawGrid",
        show: false,
        color: [0.4, 0.4, 0.4, 1] as [number, number, number, number],
        subColor: [0.2, 0.2, 0.2, 1] as [number, number, number, number],
        fadeOut: false,
        transparent: true,
      },
      size: [500, 500] as [number, number],
      ticks: [25, 5] as [number, number],
    };
    const axisOptions = {
      visuals: { drawCmd: "drawAxis", show: false },
      size: 200,
      alwaysVisible: false,
    };

    let cachedSolids: Geom3[] = [];
    let cachedEntities: unknown[] = [];
    let initialFramingDone = false;

    const frameToSolids = () => {
      if (solidsRef.current.length === 0) return;
      const bb = measureAggregateBoundingBox(solidsRef.current);
      const [[x0, y0, z0], [x1, y1, z1]] = bb as [Vec3, Vec3];
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const cz = (z0 + z1) / 2;
      const diag = Math.max(x1 - x0, y1 - y0, z1 - z0) || 100;
      const d = diag * 1.6;
      camera.target = [cx, cy, cz];
      camera.position = [cx + d * 0.6, cy - d, cz + d * 0.7];
      perspectiveCamera.update(camera, camera);
    };

    let running = true;
    const render = () => {
      if (!running) return;

      if (solidsRef.current !== cachedSolids) {
        cachedSolids = solidsRef.current;
        cachedEntities = entitiesFromSolids({}, ...cachedSolids) as unknown[];
        if (!initialFramingDone && cachedSolids.length > 0) {
          frameToSolids();
          initialFramingDone = true;
        }
      }

      renderer({
        camera,
        drawCommands: {
          drawAxis: drawCommands.drawAxis,
          drawGrid: drawCommands.drawGrid,
          drawMesh: drawCommands.drawMesh,
        },
        entities: [gridOptions, axisOptions, ...cachedEntities],
      });
      requestAnimationFrame(render);
    };
    render();

    type DragMode = "none" | "orbit" | "pan";
    let dragMode: DragMode = "none";
    let lastX = 0;
    let lastY = 0;

    const onDown = (e: MouseEvent) => {
      e.preventDefault();
      lastX = e.clientX;
      lastY = e.clientY;
      const isPan = e.button === 2 || e.shiftKey;
      dragMode = isPan ? "pan" : "orbit";
    };
    const onUp = () => {
      dragMode = "none";
    };
    const onMove = (e: MouseEvent) => {
      if (dragMode === "none") return;
      const dx = ((e.clientX - lastX) * Math.PI) / (canvas.width / dpr);
      const dy = ((e.clientY - lastY) * Math.PI) / (canvas.height / dpr);
      if (dragMode === "pan") {
        const updated = orbitControls.pan(
          { controls: orbitState, camera, speed: 300 },
          [dx, dy],
        );
        orbitState = { ...orbitState, ...updated.controls };
        camera.position = updated.camera.position;
        camera.target = updated.camera.target;
      } else {
        const updated = orbitControls.rotate(
          { controls: orbitState, camera, speed: 1.2 },
          [dx, dy],
        );
        orbitState = { ...orbitState, ...updated.controls };
      }
      const upd = orbitControls.update({ controls: orbitState, camera });
      orbitState = { ...orbitState, ...upd.controls };
      camera.position = upd.camera.position;
      perspectiveCamera.update(camera, camera);
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const cursorWorldPoint = (clientX: number, clientY: number): Vec3 => {
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);

      const target = camera.target as Vec3;
      const position = camera.position as Vec3;
      const forward = norm(sub(target, position));
      const worldUp: Vec3 = [0, 0, 1];
      const rightDir = norm(cross(forward, worldUp));
      const upDir = cross(rightDir, forward);

      const dist = len(sub(target, position));
      const fovY = (camera as { fov: number }).fov;
      const halfH = dist * Math.tan(fovY / 2);
      const aspect = rect.width / rect.height;
      const halfW = halfH * aspect;

      return add(
        add(target, scale(rightDir, ndcX * halfW)),
        scale(upDir, ndcY * halfH),
      );
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const pivot = cursorWorldPoint(e.clientX, e.clientY);
      const target = camera.target as Vec3;
      const position = camera.position as Vec3;
      const factor = Math.pow(1.12, e.deltaY / 100);

      const newTarget = add(pivot, scale(sub(target, pivot), factor));
      const newPosition = add(pivot, scale(sub(position, pivot), factor));
      const newDist = len(sub(newPosition, newTarget));
      if (newDist < 20 || newDist > 5000) return;

      camera.target = newTarget;
      camera.position = newPosition;
      perspectiveCamera.update(camera, camera);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "f" || e.key === "F") {
        frameToSolids();
      }
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKey);

    const onResize = () => {
      resize();
      perspectiveCamera.setProjection(camera, camera, {
        width: canvas.width,
        height: canvas.height,
      });
      perspectiveCamera.update(camera, camera);
    };
    window.addEventListener("resize", onResize);

    return () => {
      running = false;
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="viewer-canvas" />;
};
