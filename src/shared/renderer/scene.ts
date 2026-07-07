import { AmbientLight, Color, DirectionalLight, Group, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { TAARenderPass } from 'three/addons/postprocessing/TAARenderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { applyTranslucencyMode, type TranslucencyMode } from './materials'

const TAA_SAMPLE_LEVEL = 4
const TAA_ACCUM_FRAMES = 40
const BACKGROUND = 0x1a1a1f

export type Viewer = ReturnType<typeof createViewer>

export const createViewer = (canvas: HTMLCanvasElement) => {
    const scene = new Scene()
    scene.background = new Color(BACKGROUND)

    const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 5000)
    camera.position.set(40, 170, 210)

    const renderer = new WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    scene.add(new AmbientLight(0xffffff, 0.5))
    const key = new DirectionalLight(0xffffff, 1.1)
    key.position.set(80, 220, 140)
    scene.add(key)
    const fill = new DirectionalLight(0xffffff, 0.4)
    fill.position.set(-140, 90, -120)
    scene.add(fill)
    const accent = new DirectionalLight(0xfff2e0, 0.65)
    accent.position.set(260, 300, 170)
    scene.add(accent)

    const root = new Group()
    root.rotation.x = -Math.PI / 2
    scene.add(root)

    const composer = new EffectComposer(renderer)
    const taaPass = new TAARenderPass(scene, camera)
    taaPass.sampleLevel = TAA_SAMPLE_LEVEL
    taaPass.unbiased = false
    composer.addPass(taaPass)
    composer.addPass(new OutputPass())
    composer.setSize(window.innerWidth, window.innerHeight)

    let dirty = true
    let accumFrame = 0
    let frameHandle = 0
    let translucencyMode: TranslucencyMode = 'hash'

    const setTranslucencyMode = (mode: TranslucencyMode) => {
        if (translucencyMode === mode) return
        translucencyMode = mode
        applyTranslucencyMode(scene, mode)
    }

    const invalidate = () => {
        dirty = true
    }
    controls.addEventListener('change', invalidate)

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
        composer.setSize(window.innerWidth, window.innerHeight)
        invalidate()
    }
    window.addEventListener('resize', handleResize)

    const tick = () => {
        frameHandle = requestAnimationFrame(tick)
        controls.update()
        if (dirty) {
            dirty = false
            accumFrame = 0
            taaPass.accumulate = false
            setTranslucencyMode('blend')
            renderer.render(scene, camera)
            return
        }
        if (accumFrame < TAA_ACCUM_FRAMES) {
            taaPass.accumulate = true
            if (accumFrame === 0) {
                setTranslucencyMode('hash')
                ;(taaPass as TAARenderPass & { accumulateIndex: number }).accumulateIndex = -1
            }
            composer.render()
            accumFrame++
        }
    }
    tick()

    const dispose = () => {
        cancelAnimationFrame(frameHandle)
        window.removeEventListener('resize', handleResize)
        controls.removeEventListener('change', invalidate)
        controls.dispose()
        renderer.dispose()
    }

    return { scene, camera, renderer, controls, root, invalidate, dispose }
}
