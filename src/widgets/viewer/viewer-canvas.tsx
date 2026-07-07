import { useEffect, useRef, type FC } from 'react'
import { createViewer, type Viewer } from '@renderer/scene'
import { LAYER_KEYS, type LayerKey, type ProjectUnit, type ReferenceToggle } from '@renderer/types'
import type { ViewerSettings } from '@entities/viewer-settings/viewer-settings'
import * as project65 from '@65/project'

const PROJECTS = [project65]
const GAP_BETWEEN = 80

type ViewerCanvasProps = {
    settings: ViewerSettings
    onReady: (references: ReferenceToggle[], layerKeys: LayerKey[]) => void
}

type ViewerState = { viewer: Viewer; units: ProjectUnit[]; references: ReferenceToggle[] }

export const ViewerCanvas: FC<ViewerCanvasProps> = ({ settings, onReady }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const stateRef = useRef<ViewerState | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const viewer = createViewer(canvas)
        const units: ProjectUnit[] = []
        let cursor = 0
        for (const mod of PROJECTS) {
            const unit = mod.createProject(viewer.invalidate)
            viewer.root.add(unit.group)
            unit.group.position.x = cursor - unit.bounds.xMin
            cursor += unit.bounds.xMax - unit.bounds.xMin + GAP_BETWEEN
            units.push(unit)
        }
        const width = cursor - GAP_BETWEEN
        const centerX = width / 2
        const yCenter = (Math.min(...units.map((u) => u.bounds.yMin)) + Math.max(...units.map((u) => u.bounds.yMax))) / 2
        viewer.camera.position.set(centerX, 5 + width * 0.7, -yCenter + width * 1.1)
        viewer.controls.target.set(centerX, 5, -yCenter)
        viewer.controls.update()

        const references = units.flatMap((u) => u.references)
        const layerKeys = LAYER_KEYS.filter((key) => units.some((u) => u.layerKeys.includes(key)))
        stateRef.current = { viewer, units, references }
        onReady(references, layerKeys)
        return () => {
            viewer.dispose()
            stateRef.current = null
        }
    }, [])

    useEffect(() => {
        const state = stateRef.current
        if (!state) return
        for (const unit of state.units) {
            for (const key of LAYER_KEYS) {
                if (!unit.layerKeys.includes(key)) continue
                unit.setLayerStyle(key, settings.layers[key])
            }
        }
        state.viewer.invalidate()
    }, [settings.layers])

    useEffect(() => {
        const state = stateRef.current
        if (!state) return
        for (const ref of state.references) {
            const result = ref.set(settings.references[ref.key] ?? false)
            if (result instanceof Promise) result.then(state.viewer.invalidate)
        }
        state.viewer.invalidate()
    }, [settings.references])

    return <canvas ref={canvasRef} className='block h-screen w-screen' />
}
