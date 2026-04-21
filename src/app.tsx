import { useEffect, useMemo, useState, type FC } from "react";
import { serialize } from "@jscad/stl-serializer";
import type { Geom3 } from "@jscad/modeling/src/geometries/types";
import { Viewer } from "./components/viewer";
import { Controls } from "./components/controls";
import {
  buildSolids,
  DEFAULT_BUILD_PARAMS,
  DEFAULT_SWITCH_ORIENT,
  DEFAULT_KEYCAP_ORIENT,
  DEFAULT_STABILIZER_ORIENT,
  loadSwitchGeom,
  loadKeycapGeoms,
  loadStabilizerGeom,
  loadPlateGeom,
  keys49,
  type BuildParams,
  type PartVisibility,
  type SwitchOrient,
  type KeycapOrient,
  type StabilizerOrient,
} from "./models";

export const App: FC = () => {
  const [visibility, setVisibility] = useState<PartVisibility>({
    caseTop: true,
    caseBottom: true,
    plate: true,
    switches: false,
    lolin: false,
    stabilizers: false,
    keycaps: false,
    footPads: false,
    phone: false,
    wobkeyZen65: false,
  });
  const [params, setParams] = useState<BuildParams>(DEFAULT_BUILD_PARAMS);
  const [switchOrient, setSwitchOrient] = useState<SwitchOrient>(
    DEFAULT_SWITCH_ORIENT,
  );
  const [switchGeom, setSwitchGeom] = useState<Geom3 | null>(null);
  const [keycapOrient, setKeycapOrient] = useState<KeycapOrient>(
    DEFAULT_KEYCAP_ORIENT,
  );
  const [keycapsReady, setKeycapsReady] = useState(0);
  const [stabilizerOrient, setStabilizerOrient] = useState<StabilizerOrient>(
    DEFAULT_STABILIZER_ORIENT,
  );
  const [stabilizerGeom, setStabilizerGeom] = useState<Geom3 | null>(null);
  const [plateGeom, setPlateGeom] = useState<Geom3 | null>(null);
  const [hmrTick, setHmrTick] = useState(0);

  useEffect(() => {
    loadSwitchGeom()
      .then(setSwitchGeom)
      .catch((e) => console.error("Switch STL load failed", e));
    loadKeycapGeoms(keys49)
      .then(() => setKeycapsReady((n) => n + 1))
      .catch((e) => console.error("Keycap STL load failed", e));
    loadStabilizerGeom()
      .then(setStabilizerGeom)
      .catch((e) => console.error("Stabilizer STL load failed", e));
    loadPlateGeom()
      .then(setPlateGeom)
      .catch((e) => console.error("Plate STL load failed", e));
  }, []);

  useEffect(() => {
    if (import.meta.hot) {
      import.meta.hot.accept(() => setHmrTick((n) => n + 1));
      import.meta.hot.accept("./models", () => setHmrTick((n) => n + 1));
      import.meta.hot.accept("./models/case", () => setHmrTick((n) => n + 1));
      import.meta.hot.accept("./models/accessories", () =>
        setHmrTick((n) => n + 1),
      );
      import.meta.hot.accept("./models/build-solids", () =>
        setHmrTick((n) => n + 1),
      );
      import.meta.hot.accept("./models/plate", () => setHmrTick((n) => n + 1));
    }
  }, []);

  const solids = useMemo(
    () =>
      buildSolids(
        visibility,
        params,
        switchGeom,
        switchOrient,
        keycapOrient,
        stabilizerGeom,
        stabilizerOrient,
        plateGeom,
      ),
    [
      visibility,
      params,
      switchGeom,
      switchOrient,
      keycapOrient,
      keycapsReady,
      stabilizerGeom,
      stabilizerOrient,
      plateGeom,
      hmrTick,
    ],
  );

  const handleExportStl = () => {
    const rawData = serialize({ binary: true }, ...solids);
    const blob = new Blob(rawData, { type: "application/sla" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "keyboard-49.stl";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <Controls
        visibility={visibility}
        setVisibility={setVisibility}
        params={params}
        setParams={setParams}
        switchOrient={switchOrient}
        setSwitchOrient={setSwitchOrient}
        keycapOrient={keycapOrient}
        setKeycapOrient={setKeycapOrient}
        stabilizerOrient={stabilizerOrient}
        setStabilizerOrient={setStabilizerOrient}
        onExportStl={handleExportStl}
      />
      <div className="viewer-wrap">
        <Viewer solids={solids} />
        <div className="help">
          LMB/MMB: 회전 · RMB or Shift+드래그: 이동 · 휠: 커서 기준 줌 · F:
          프레이밍
        </div>
      </div>
    </div>
  );
};
