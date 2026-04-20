import { computeBounds, DEFAULT_STAB } from './layout';
const num = '(-?\\d+(?:\\.\\d+)?)';
const matchOrThrow = (source, regex, label) => {
    const m = source.match(regex);
    if (!m)
        throw new Error(`reference parse failed: ${label}`);
    return m;
};
const matchAll = (source, regex) => [...source.matchAll(regex)];
export const parseReference = (source) => {
    const thickness = parseFloat(matchOrThrow(source, new RegExp(`const THICKNESS = ${num}`), 'THICKNESS')[1]);
    const ws = '\\s*';
    const sep = `,${ws}`;
    const outlineMatch = matchOrThrow(source, new RegExp(`const outline = translate\\(${ws}\\[${num}${sep}${num}${sep}0\\]${sep}roundedRectangle\\(\\{${ws}size:${ws}\\[${num}${sep}${num}\\]${sep}roundRadius:${ws}${num}${ws}\\}\\)${ws},?${ws}\\)`), 'outline');
    const switchMatch = matchOrThrow(source, new RegExp(`const switch_shape = roundedRectangle\\(\\{${ws}size:${ws}\\[${num}${sep}${num}\\]${sep}roundRadius:${ws}${num}${ws}\\}\\)`), 'switch_shape');
    const stabMatch = matchOrThrow(source, new RegExp(`const stab_pad = roundedRectangle\\(\\{${ws}size:${ws}\\[${num}${sep}${num}\\]${sep}roundRadius:${ws}${num}${ws}\\}\\)`), 'stab_pad');
    const holeRegex = new RegExp(`const hole\\w+ = translate\\(${ws}\\[${num}${sep}${num}${sep}0\\]${sep}circle\\(\\{${ws}radius:${ws}${num}${ws}\\}\\)${ws},?${ws}\\)`, 'g');
    const screwHoles = matchAll(source, holeRegex).map((m) => ({
        x: parseFloat(m[1]),
        y: parseFloat(m[2]),
        radius: parseFloat(m[3]),
    }));
    if (screwHoles.length === 0)
        throw new Error('reference parse failed: no screw holes found');
    return {
        thickness,
        outline: {
            center: [parseFloat(outlineMatch[1]), parseFloat(outlineMatch[2])],
            size: [parseFloat(outlineMatch[3]), parseFloat(outlineMatch[4])],
            cornerRadius: parseFloat(outlineMatch[5]),
        },
        switchCutout: {
            size: [parseFloat(switchMatch[1]), parseFloat(switchMatch[2])],
            cornerRadius: parseFloat(switchMatch[3]),
        },
        stabPad: {
            size: [parseFloat(stabMatch[1]), parseFloat(stabMatch[2])],
            cornerRadius: parseFloat(stabMatch[3]),
        },
        screwHoles,
    };
};
const EPS = 1e-6;
export const deriveDefaults = (ref, keys) => {
    const zeroPadding = { top: 0, bottom: 0, left: 0, right: 0 };
    const keyBounds = computeBounds(keys, zeroPadding);
    const [w, h] = ref.outline.size;
    const [cx, cy] = ref.outline.center;
    const outlineLeft = cx - w / 2;
    const outlineRight = cx + w / 2;
    const outlineTop = cy + h / 2;
    const outlineBottom = cy - h / 2;
    const padding = {
        top: outlineTop - keyBounds.maxY,
        bottom: keyBounds.minY - outlineBottom,
        left: keyBounds.minX - outlineLeft,
        right: outlineRight - keyBounds.maxX,
    };
    const h0 = ref.screwHoles[0];
    const screwHoleMargin = Math.min(h0.x - outlineLeft, outlineRight - h0.x, outlineTop - h0.y, h0.y - outlineBottom);
    const radii = new Set(ref.screwHoles.map((h) => h.radius));
    if (radii.size > 1) {
        console.warn('reference has multiple screw hole radii, using the first');
    }
    const stabPadSizeMatches = Math.abs(ref.stabPad.size[0] - DEFAULT_STAB.padSize[0]) < EPS && Math.abs(ref.stabPad.size[1] - DEFAULT_STAB.padSize[1]) < EPS;
    return {
        padding,
        thickness: ref.thickness,
        cornerRadius: ref.outline.cornerRadius,
        screwHoleRadius: h0.radius,
        screwHoleMargin,
        switchCutoutSize: ref.switchCutout.size[0],
        switchCutoutCornerRadius: ref.switchCutout.cornerRadius,
        stabilizer: stabPadSizeMatches
            ? { ...DEFAULT_STAB, padSize: ref.stabPad.size, padCornerRadius: ref.stabPad.cornerRadius }
            : DEFAULT_STAB,
    };
};
export const formatSummary = (ref, derived) => {
    const fmt = (n) => n.toFixed(3);
    return [
        `thickness:        ${fmt(ref.thickness)}`,
        `outline size:     ${fmt(ref.outline.size[0])} × ${fmt(ref.outline.size[1])}`,
        `outline center:   (${fmt(ref.outline.center[0])}, ${fmt(ref.outline.center[1])})`,
        `outline R:        ${fmt(ref.outline.cornerRadius)}`,
        `padding (TRBL):   ${fmt(derived.padding.top)} / ${fmt(derived.padding.right)} / ${fmt(derived.padding.bottom)} / ${fmt(derived.padding.left)}`,
        `switch cutout:    ${fmt(ref.switchCutout.size[0])} × ${fmt(ref.switchCutout.size[1])} R${fmt(ref.switchCutout.cornerRadius)}`,
        `stab pad:         ${fmt(ref.stabPad.size[0])} × ${fmt(ref.stabPad.size[1])} R${fmt(ref.stabPad.cornerRadius)}`,
        `screw holes (${ref.screwHoles.length}): R${fmt(derived.screwHoleRadius)}  margin=${fmt(derived.screwHoleMargin)}`,
        ...ref.screwHoles.map((h) => `  (${fmt(h.x)}, ${fmt(h.y)})`),
    ].join('\n');
};
