import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { serialize } from '@jscad/stl-serializer';
import { Viewer } from './components/viewer';
import { Controls } from './components/controls';
import { buildSolids, DEFAULT_BUILD_PARAMS, DEFAULT_SWITCH_ORIENT, DEFAULT_KEYCAP_ORIENT, DEFAULT_STABILIZER_ORIENT, loadSwitchGeom, loadKeycapGeoms, loadStabilizerGeom, keys49, } from './models';
export const App = () => {
    const [visibility, setVisibility] = useState({
        caseTop: true,
        caseBottom: true,
        switches: true,
        lolin: true,
        perfBoard: true,
        slideSwitch: true,
        stabilizers: true,
        keycaps: true,
        footPads: true,
        batteryCover: true,
        batteries: true,
        batteryContacts: false,
        phone: false,
        wobkeyZen65: false,
    });
    const [params, setParams] = useState(DEFAULT_BUILD_PARAMS);
    const [switchOrient, setSwitchOrient] = useState(DEFAULT_SWITCH_ORIENT);
    const [switchGeom, setSwitchGeom] = useState(null);
    const [keycapOrient, setKeycapOrient] = useState(DEFAULT_KEYCAP_ORIENT);
    const [keycapsReady, setKeycapsReady] = useState(0);
    const [stabilizerOrient, setStabilizerOrient] = useState(DEFAULT_STABILIZER_ORIENT);
    const [stabilizerGeom, setStabilizerGeom] = useState(null);
    useEffect(() => {
        loadSwitchGeom()
            .then(setSwitchGeom)
            .catch((e) => console.error('Switch STL load failed', e));
        loadKeycapGeoms(keys49)
            .then(() => setKeycapsReady((n) => n + 1))
            .catch((e) => console.error('Keycap STL load failed', e));
        loadStabilizerGeom()
            .then(setStabilizerGeom)
            .catch((e) => console.error('Stabilizer STL load failed', e));
    }, []);
    const solids = useMemo(() => buildSolids(visibility, params, switchGeom, switchOrient, keycapOrient, stabilizerGeom, stabilizerOrient), [visibility, params, switchGeom, switchOrient, keycapOrient, keycapsReady, stabilizerGeom, stabilizerOrient]);
    const handleExportStl = () => {
        const rawData = serialize({ binary: true }, ...solids);
        const blob = new Blob(rawData, { type: 'application/sla' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'keyboard-49.stl';
        a.click();
        URL.revokeObjectURL(url);
    };
    return (_jsxs("div", { className: 'app', children: [_jsx(Controls, { visibility: visibility, setVisibility: setVisibility, params: params, setParams: setParams, switchOrient: switchOrient, setSwitchOrient: setSwitchOrient, keycapOrient: keycapOrient, setKeycapOrient: setKeycapOrient, stabilizerOrient: stabilizerOrient, setStabilizerOrient: setStabilizerOrient, onExportStl: handleExportStl }), _jsxs("div", { className: 'viewer-wrap', children: [_jsx(Viewer, { solids: solids }), _jsx("div", { className: 'help', children: "\uB4DC\uB798\uADF8: \uD68C\uC804 \u00B7 Shift+\uB4DC\uB798\uADF8 or \uC6B0\uD074\uB9AD: \uC774\uB3D9 \u00B7 \uD720: \uC90C" })] })] }));
};
