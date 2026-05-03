import { Suspense, useState, type CSSProperties, type FC, type PropsWithChildren, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewport, Grid, Environment, Stats } from '@react-three/drei'

type ViewportProps = PropsWithChildren<{
    showStats?: boolean
    /** HTML 오버레이 — Canvas 외부에 절대 배치 */
    overlay?: ReactNode
}>

type CameraMode = 'perspective' | 'orthographic'

export const Viewport: FC<ViewportProps> = ({ children, showStats = false, overlay }) => {
    const [cameraMode, setCameraMode] = useState<CameraMode>('perspective')

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <Toolbar cameraMode={cameraMode} onChangeCameraMode={setCameraMode} />
            {overlay}
            <Canvas
                key={cameraMode}
                shadows
                orthographic={cameraMode === 'orthographic'}
                camera={
                    cameraMode === 'perspective'
                        ? { position: [180, 180, 220], fov: 35, near: 0.1, far: 5000 }
                        : { position: [180, 180, 220], zoom: 2.4, near: -2000, far: 5000 }
                }
                gl={{ antialias: true, preserveDrawingBuffer: false }}
                style={{ background: 'linear-gradient(180deg, #3a3a3a 0%, #1f1f1f 100%)' }}>
                <Suspense fallback={null}>
                    <Lights />
                    <Floor />
                    {children}
                    <Environment preset='studio' />
                </Suspense>
                <OrbitControls
                    makeDefault
                    enableDamping
                    dampingFactor={0.08}
                    minDistance={20}
                    maxDistance={1500}
                    target={[0, 0, 0]}
                />
                <GizmoHelper alignment='bottom-right' margin={[80, 80]}>
                    <GizmoViewport axisColors={['#ff5d6c', '#7fdf68', '#5aa9ff']} labelColor='black' />
                </GizmoHelper>
                {showStats && <Stats />}
            </Canvas>
        </div>
    )
}

const Lights: FC = () => (
    <>
        {/* 전방위 균등 조명 — 어떤 시점에서도 표면 확인 가능 */}
        <ambientLight intensity={0.6} />
        <hemisphereLight args={['#dde2e8', '#2a2d33', 0.45]} />
        {/* 6방향 directional (그림자 없음 — 검사 용도) */}
        <directionalLight position={[300, 300, 300]} intensity={0.55} />
        <directionalLight position={[-300, 300, 300]} intensity={0.4} />
        <directionalLight position={[300, -300, 300]} intensity={0.4} />
        <directionalLight position={[-300, -300, 300]} intensity={0.4} />
        <directionalLight position={[0, 0, -400]} intensity={0.35} />
        <directionalLight position={[0, 0, 400]} intensity={0.35} />
    </>
)

const Floor: FC = () => (
    <>
        <Grid
            args={[1000, 1000]}
            position={[0, -10, 0]}
            cellSize={10}
            cellThickness={0.6}
            cellColor='#3a3f47'
            sectionSize={50}
            sectionThickness={1}
            sectionColor='#5a6068'
            fadeDistance={900}
            fadeStrength={1}
            infiniteGrid={false}
            followCamera={false}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10.05, 0]} receiveShadow>
            <planeGeometry args={[2000, 2000]} />
            <shadowMaterial transparent opacity={0.35} />
        </mesh>
    </>
)

type ToolbarProps = {
    cameraMode: CameraMode
    onChangeCameraMode: (mode: CameraMode) => void
}

const Toolbar: FC<ToolbarProps> = ({ cameraMode, onChangeCameraMode }) => (
    <div
        style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 10,
            display: 'flex',
            gap: 8,
            padding: '8px 12px',
            background: 'rgba(20, 20, 22, 0.78)',
            border: '1px solid #444',
            borderRadius: 8,
            backdropFilter: 'blur(8px)',
            color: '#e6e6e6',
            fontSize: 12,
            alignItems: 'center',
        }}>
        <span style={{ opacity: 0.7 }}>49-pcba viewer</span>
        <span style={{ opacity: 0.4 }}>|</span>
        <button
            type='button'
            onClick={() => onChangeCameraMode('perspective')}
            style={buttonStyle(cameraMode === 'perspective')}>
            Perspective
        </button>
        <button
            type='button'
            onClick={() => onChangeCameraMode('orthographic')}
            style={buttonStyle(cameraMode === 'orthographic')}>
            Orthographic
        </button>
    </div>
)

const buttonStyle = (active: boolean): CSSProperties => ({
    padding: '4px 10px',
    background: active ? '#3b82f6' : '#2a2a2c',
    color: active ? '#fff' : '#cfcfcf',
    border: '1px solid ' + (active ? '#3b82f6' : '#3a3a3d'),
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
})
