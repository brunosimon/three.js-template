import * as THREE from 'three'
import ThreeOrbitControls from 'three-orbit-controls'
import { EffectComposer, RenderPass, EffectPass, SMAAEffect } from 'postprocessing'
import * as dat from 'dat.gui'

import TDSLoader from './Loaders/TDSLoader.js'
import Sizes from './Sizes.js'
import Time from './Time.js'

const OrbitControls = ThreeOrbitControls(THREE)

export default class Application
{
    /**
     * Constructor
     */
    constructor(_options)
    {
        // Options
        this.$canvas = _options.$canvas
        this.useComposer = _options.useComposer

        // Set up
        this.time = new Time()
        this.sizes = new Sizes()
        this.tdsLoader = new TDSLoader()

        // Load resources
        this.resources = {}

        this.resources.searchImage = new Image()
        this.resources.searchImage.addEventListener('load', () =>
        {
            this.resources.areaImage = new Image()
            this.resources.areaImage.addEventListener('load', () =>
            {
                this.tdsLoader.load('suzanne.3ds', (_suzanne) =>
                {
                    this.resources.suzanne = _suzanne.children[0]

                    // Set environment
                    this.setEnvironment()

                    // Set debug
                    this.setDebug()
                })
            })
            this.resources.areaImage.src = SMAAEffect.areaImageDataURL
        })
        this.resources.searchImage.src = SMAAEffect.searchImageDataURL
    }

    /**
     * Set environments
     */
    setEnvironment()
    {
        // Scene
        this.scene = new THREE.Scene()

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.$canvas })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.renderer.setSize(this.sizes.viewport.width, this.sizes.viewport.height)

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, this.sizes.viewport.width / this.sizes.viewport.height, 1, 100)
        this.camera.position.set(0, 1, -3)
        this.camera.lookAt(new THREE.Vector3())
        this.scene.add(this.camera)

        // Controls
        this.controls = new OrbitControls(this.camera, this.$canvas)

        // Suzanne
        this.resources.suzanne.geometry.rotateX(- Math.PI * 0.5)
        this.resources.suzanne.geometry.rotateY(Math.PI)
        this.suzanne = new THREE.Mesh(this.resources.suzanne.geometry, new THREE.MeshNormalMaterial())
        this.scene.add(this.suzanne)

        // Composer
        this.composer = new EffectComposer(this.renderer, { depthTexture: true })

        // Passes
        this.passes = {}
        this.passes.list = []
        this.passes.updateRenderToScreen = () =>
        {
            let enabledPassFound = false

            for(let i = this.passes.list.length - 1; i >= 0; i--)
            {
                const pass = this.passes.list[i]

                if(pass.enabled && !enabledPassFound)
                {
                    pass.renderToScreen = true
                    enabledPassFound = true
                }
                else
                {
                    pass.renderToScreen = false
                }
            }
        }

        this.passes.render = new RenderPass(this.scene, this.camera)
        this.composer.addPass(this.passes.render)
        this.passes.list.push(this.passes.render)

        this.passes.smaa = new EffectPass(this.camera, new SMAAEffect(this.resources.searchImage, this.resources.areaImage))
        this.passes.smaa.enabled = window.devicePixelRatio <= 1
        this.composer.addPass(this.passes.smaa)
        this.passes.list.push(this.passes.smaa)

        this.passes.updateRenderToScreen()

        // Time tick
        this.time.on('tick', () =>
        {
            this.suzanne.rotation.y += 0.01

            // Renderer
            if(this.useComposer)
            {
                this.composer.render(this.scene, this.camera)
            }
            else
            {
                this.renderer.render(this.scene, this.camera)
            }
        })

        // Resize event
        this.sizes.on('resize', () =>
        {
            this.camera.aspect = this.sizes.viewport.width / this.sizes.viewport.height
            this.camera.updateProjectionMatrix()

            this.renderer.setSize(this.sizes.viewport.width, this.sizes.viewport.height)

            if(this.useComposer)
            {
                for(const _pass of this.passes.list)
                {
                    if(_pass.setSize)
                    {
                        _pass.setSize(this.sizes.viewport.width, this.sizes.viewport.height)
                    }
                }
                this.composer.setSize(this.sizes.viewport.width, this.sizes.viewport.height)
            }
        })
    }

    /**
     * Set debug
     */
    setDebug()
    {
        this.debug = new dat.GUI()

        this.debug.add(this.suzanne.scale, 'x', 0.01, 10, 0.001)
        this.debug.add(this.suzanne.scale, 'y', 0.01, 10, 0.001)
        this.debug.add(this.suzanne.scale, 'z', 0.01, 10, 0.001)
    }

    /**
     * Destructor
     */
    destructor()
    {
        this.time.off('tick')
        this.sizes.off('resize')

        this.controls.dispose()
        this.renderer.dispose()
        this.composer.dispose()
        this.debug.destroy()
    }
}
