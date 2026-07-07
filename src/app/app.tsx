import { useEffect, useState, type FC } from 'react'
import type { LayerKey, ReferenceToggle } from '@renderer/types'
import { loadSettings, saveSettings, type ViewerSettings } from '@entities/viewer-settings/viewer-settings'
import { ViewerCanvas } from '@widgets/viewer/viewer-canvas'
import { ControlPanel } from '@widgets/control-panel/control-panel'

export const App: FC = () => {
    const [settings, setSettings] = useState<ViewerSettings>(loadSettings)
    const [references, setReferences] = useState<ReferenceToggle[]>([])
    const [layerKeys, setLayerKeys] = useState<LayerKey[]>([])

    useEffect(() => {
        saveSettings(settings)
    }, [settings])

    return (
        <>
            <ViewerCanvas
                settings={settings}
                onReady={(refs, keys) => {
                    setReferences(refs)
                    setLayerKeys(keys)
                }}
            />
            <ControlPanel settings={settings} references={references} layerKeys={layerKeys} onChange={setSettings} />
        </>
    )
}
