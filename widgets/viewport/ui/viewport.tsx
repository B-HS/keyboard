import { Suspense, useState, type CSSProperties, type FC, type PropsWithChildren, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewport, Grid, Environment, Stats } from '@react-three/drei'
import * as THREE from 'three'

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
                gl={{
                    antialias: true,
                    preserveDrawingBuffer: false,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.0,
                }}
                style={{ background: 'linear-gradient(180deg, #87ceeb 0%, #c8e0f0 60%, #f0f4f8 100%)' }}>
                <Suspense fallback={null}>
                    <Lights />
                    <Floor />
                    {children}
                    {/* 'park' HDR — 야외 정오 자연광 IBL (간접조명 + 반사 환경). */}
                    <Environment preset='park' />
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

/**
 * 현실 야외 태양광 시뮬레이션 (정오 ~ 오후 3시).
 *
 * - Sun (directionalLight): 단일 강한 방향광 + 그림자. 색온도 5500K (#fffaf0, 약간 따뜻한 흰색).
 *   고도 ~60° 방위각 ~30° (오후 태양 위치).
 * - Sky / Ground (hemisphereLight): 하늘 산란광 (cool blue) + 지면 반사광 (warm earth).
 *   현실에선 ambient 가 hemisphere 에 포함됨 → ambientLight 별도 사용 안 함.
 * - 추가 fill 없음 — 현실엔 fill light 없음. 그림자 영역은 hemisphere + IBL (Environment) 로 채워짐.
 */
const Lights: FC = () => (
    <>
        {/* 하늘(파랑) + 지면(따뜻한 갈색) 산란광. ambient 대체. */}
        <hemisphereLight args={['#bcdcff', '#6b5b3e', 0.6]} />

        {/* 태양 — 단일 강한 방향광 + 그림자 */}
        <directionalLight
            position={[400, 800, 300]}
            intensity={3.0}
            color='#fffaf0'
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={1}
            shadow-camera-far={2000}
            shadow-camera-left={-300}
            shadow-camera-right={300}
            shadow-camera-top={300}
            shadow-camera-bottom={-300}
            shadow-bias={-0.0001}
            shadow-normalBias={0.02}
        />
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
