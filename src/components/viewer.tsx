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
      position: [0, 0, 500] as [number, number, number],
      target: [0, 0, 0] as [number, number, number],
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
      const [[x0, y0, z0], [x1, y1, z1]] = bb as [
        [number, number, number],
        [number, number, number],
      ];
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

    let dragging = false;
    let shift = false;
    let lastX = 0;
    let lastY = 0;

    const onDown = (e: MouseEvent) => {
      dragging = true;
      shift = e.shiftKey || e.button === 2;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = ((e.clientX - lastX) * Math.PI) / (canvas.width / dpr);
      const dy = ((e.clientY - lastY) * Math.PI) / (canvas.height / dpr);
      if (shift) {
        const updated = orbitControls.pan(
          { controls: orbitState, camera, speed: 300 },
          [dx, dy],
        );
        orbitState = { ...orbitState, ...updated.controls };
        camera.position = updated.camera.position;
        camera.target = updated.camera.target;
      } else {
        const updated = orbitControls.rotate(
          { controls: orbitState, camera, speed: 1 },
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
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const [tx, ty, tz] = camera.target as [number, number, number];
      const [px, py, pz] = camera.position;
      const dx = px - tx;
      const dy = py - ty;
      const dz = pz - tz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const factor = Math.pow(1.15, e.deltaY / 100);
      const newDist = Math.max(20, Math.min(5000, dist * factor));
      const scale = newDist / dist;
      camera.position = [tx + dx * scale, ty + dy * scale, tz + dz * scale];
      perspectiveCamera.update(camera, camera);
    };
    const onContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContextMenu);

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
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="viewer-canvas" />;
};
