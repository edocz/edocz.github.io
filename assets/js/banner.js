class Texture {
    constructor() {
        this.sources = [];
        this.shaderID = 0;
    }

    run (A) {
        if (null === this.sources || void 0 === this.sources) throw "Sources is not exist.";
        $.when.apply(null, this.sources).done(A)
    }

    getTexture (url) {
        var name = url.split("/")[url.split("/").length - 1].split(".")[0];
        var e = $.Deferred();
        return (new THREE.TextureLoader()).load(url, function ( texture ) {
                texture.name = name;
                texture.chunkID = parseInt(name.split("_")[1]);
                Object.defineProperty(texture, "externalResourcesType", {
                    value: "texture"
                });
                e.resolve(texture);
            },
            function () {},
            // onError callback
            function ( err ) {
                console.error( 'An error happened.' );
                e.resolve();
            }
        );
        e.promise();
    }
}

class Banner {

    constructor(option) {
        const defaults = {
            id : "", 
            backScreenImgUrls: [],
            cellImgUrls: [],
            demo: !0,
            animation: !0,
            textureID: 0,
            changeTime: 250,
            changeDuration: 1,
            cellWidth: .35,
            cellBetween: .1,
            mouseRatio: .025,
            useSpringFx: !0
        };
        this.option = Object.assign(defaults, option);
        this.backScreenImgUrls = this.option.backScreenImgUrls;
        this.cellImgUrls = this.option.cellImgUrls;
        this.demo = this.option.demo;
        this.animation = this.option.animation;
        this.textureID = this.option.textureID;
        this.changeTime = this.option.changeTime;
        this.changeDuration = this.option.changeDuration;
        this.showSlideDuration = this.option.showSlideDuration;
        this.cellWidth = this.option.cellWidth;
        this.cellBetween = this.option.cellBetween;
        this.mouseRatio = this.option.mouseRatio;
        this.useSpringFx = this.option.useSpringFx;
        this.size = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        this.stopChanging = !1;
        this._appendTarget = document.getElementById(this.option.id);
        this._modeLock = !1;
        this._cnt = .5 * this.changeTime;
        this._pos = new THREE.Vector2(0,0);
        this._mouse = new THREE.Vector2(0,0);
        this._ease = {
            inOut: CustomEase.create("custom", "M0,0 C" + Number(.6) + "," + Number(0) + " " + Number(.4) + "," + Number(1) + " 1,1"),
            In: CustomEase.create("custom", "M0,0 C" + Number(.7) + "," + Number(0) + " " + Number(.7) + "," + Number(1) + " 1,1"),
            Out: CustomEase.create("custom", "M0,0 C" + Number(.3) + "," + Number(0) + " " + Number(0) + "," + Number(1) + " 1,1")
        };
        this._backScreenTextures = [];
        this._geometry = new THREE.PlaneGeometry(1,1,64,64);
        this._backScreenMaterial = null;//ShaderMaterial
        this._backScreen = null;//Mesh
        this._isChanging = !1;
        this._cellGeometry = new THREE.PlaneGeometry(this.cellWidth,.5 * this.cellWidth,8,8);
        this._cells = [];
        this._cellTextures = [];
        this._cellMaterials = [];
        this._group = new THREE.Group();
        this._slidersUniforms = {
            fader: {
                type: "f",
                value: 0
            },
            globalAlpha: {
                type: "f",
                value: 1
            },
            dragging: {
                type: "f",
                value: 1
            },
            time: {
                type: "f",
                value: 0
            },
            mouse: {
                type: "v2",
                value: this._pos
            },
            parallax: {
                type: "f",
                value: 0
            }
        };
        this.slideStatus = {
            lock: !1,
            dire: !1,
            edge: !1,
            current: 0
        };
        this._spring = {
            constant: .5 * this.cellBetween,
            duration: .5 * this.changeDuration
        };
        this.__events = {};
        this._rendering = null;
        this._renderer = null;
        this._camera = null;
        this._scene = null;
    }


    init () {
        this._setRenderer();
        this._setScene();
        this._setCamera();
        this._addEvent();
        return this;
    }

    run () {
        var banner = this;
        banner.loadTextures(banner.backScreenImgUrls, banner.cellImgUrls, function() {
            banner._generateBackScreen();
            banner._scene.add(banner._group);
            banner._render();
        })
    }

    destroy () {
        this.removeListener(window, "resize.DistortionScreen"),
        this.removeListener(window, "keydown.DistortionScreen"),
        this.removeListener(window, "click.DistortionScreen"),
        this.removeListener(window, "deviceorientation.DistortionScreen"),
        this.removeListener(window, "mouseenter.DistortionScreen"),
        this.removeListener(window, "mousemove.DistortionScreen"),
        this.slideMode(!1),
        this._backScreenTextures = [],
        this._geometry.dispose(),
        this._backScreenMaterial.dispose(),
        this._backScreen.dispose(),
        this._cellGeometry.dispose(),
        this._cells = [],
        this._cellTextures = [],
        this._cellMaterials = [],
        this._group.dispose(),
        this._scene.remove([this._backScreen, this._group]),
        this._scene.dispose(),
        this._renderer.dispose(),
        this._renderer = null
    }

    loadTextures (backScreenImgUrls, cellImgUrls, callback) {
        var banner = this
            , n = $.Deferred()
            , o = $.Deferred()
            , backTexture = new Texture()
            , cellTexture = new Texture();
        backScreenImgUrls.forEach(function(imgUrl) {
            backTexture.sources.push(backTexture.getTexture(imgUrl))
        }),
        cellImgUrls.forEach(function(cellUrl) {
            cellTexture.sources.push(cellTexture.getTexture(cellUrl))
        }),
        backTexture.run(function() {
            for (var A = arguments.length, e = Array(A), t = 0; t < A; t++)
                e[t] = arguments[t];
            n.resolve(e)
        });
        cellTexture.run(function() {
            for (var A = arguments.length, e = Array(A), t = 0; t < A; t++)
                e[t] = arguments[t];
            o.resolve(e)
        });
        $.when.apply(null, [n.promise(), o.promise()]).done(function(backTextures, cellTextures) {
            cellTexture = null;
            backTexture = null;
            banner._backScreenTextures = backTextures;
            banner._cellTextures = cellTextures;
            callback();
        })
    }

    restart () {
        this.animation = !0;
        this._render();
    }

    changeTexture (A) {
        var banner = this;
        (new TimelineMax).to(this._backScreenMaterial.uniforms.waveLength, this.changeDuration, {
            value: 26,
            ease: this._ease.inOut
        }).to(this._backScreenMaterial.uniforms.waveLength, this.changeDuration, {
            value: 3,
            ease: this._ease.inOut
        }),
        new TimelineMax({
            onComplete: function() {
                A.onComplete(A.id)
            }
        }).to(this._backScreenMaterial.uniforms.ratio, this.changeDuration, {
            value: 0,
            ease: this._ease.inOut
        }).to(this._backScreenMaterial.uniforms.ratio, this.changeDuration, {
            value: 1,
            ease: this._ease.inOut,
            onStart: function() {
                A.onStart(A.id),
                banner._backScreenMaterial.uniforms.texture.value = banner._backScreenTextures[banner.textureID]
            }
        })
    }

    _render () {
        var banner = this;
        this._pos.y += (this._mouse.y - this._pos.y) * this.mouseRatio * .5,
        this._pos.x += (this._mouse.x - this._pos.x) * this.mouseRatio * .5,
        this._draw(this._cnt++),
        this._renderer.clear(),
        this._renderer.render(this._scene, this._camera),
        this.animation && (this._rendering && cancelAnimationFrame(this._rendering),
        this._rendering = requestAnimationFrame(function() {
            banner._render()
        }))
    }

    _draw (A) {
        var banner = this
            , t = .01 * A;
        this._backScreenMaterial.uniforms.time.value = t;
        this._slidersUniforms.time.value = .5 * t;
        this._slidersUniforms.mouse.value = this._pos;
        this._isChanging || this.demo || this._modeLock || (this._modeLock = !0,
        this.textureID === this._backScreenTextures.length - 1 ? this.changeTexture({
            id: 0,
            onStart: function(A) {},
            onComplete: function(A) {}
        }):'');

        this.stopChanging || this.demo && A % this.changeTime == this.changeTime - 1 && (this._isChanging = !0,
        this.changeTexture({
            id: (this.textureID + 1) % this._backScreenTextures.length,
            onStart: function(A) {
                banner.textureID = A,
                banner.demo || (banner._modeLock = !0)
            },
            onComplete: function(A) {
                banner.demo ? banner._isChanging = !1 : ""
            }
        }))
    }

    resize () {
        this.size.width = window.innerWidth,
        this.size.height = window.innerHeight,
        this._camera.aspect = this.size.width / this.size.height,
        this._camera.updateProjectionMatrix(),
        this._backScreenMaterial.uniforms.resolution.value = new THREE.Vector2(this.size.width,this.size.height),
        this.size.width / this.size.height > 1 && (this._backScreen.scale.x = this._backScreen.scale.y = this.size.width / this.size.height * .57),
        this._renderer.setSize(this.size.width, this.size.height)
    }

    addListener (A, evtName, t) {
        var i = arguments.length > 3 && void 0 !== arguments[3] && arguments[3]
            , n = evtName.split(".")[0];
        window.addEventListener ? A.addEventListener(n, t, i) : window.attachEvent && A.attachEvent("on" + n, t);
        if (!this.__events.hasOwnProperty(evtName)) this.__events[evtName] = [];
        this.__events[evtName].push({
            target: A,
            eventType: n,
            handler: t,
            capture: i
        })
    }

    removeListener (A, evtName) {
        evtName in this.__events && this.__events[evtName].map(function(e) {
            window.removeEventListener ? A.removeEventListener(e.eventType, e.handler, e.capture) : window.detachEvent && A.detachEvent("on" + e.eventType, e.handler)
        })
    }

    _throwError (A, e) {
        if (A) throw e
    }

    _addEvent () {
        var banner = this;
        var e = ($(window),
            function(A) {
                banner._mouse.x = Math.min(1, Math.max(-1, A.pageX / banner.size.width * 2 - 1)),
                banner._mouse.y = Math.min(1, Math.max(-1, A.pageY / banner.size.height * 2 - 1))
            }
        );

        "ontouchstart" in window ? this.addListener(window, "deviceorientation.DistortionScreen", function(e) {
            banner._mouse = {
                x: .01 * e.gamma,
                y: .01 * -e.beta
            }
        }) : (this.addListener(window, "mouseenter.DistortionScreen", function(t) {
            e.call(banner, t)
        }),
        this.addListener(window, "mousemove.DistortionScreen", function(t) {
            e.call(banner, t)
        }));
        this.addListener(window, "resize.DistortionScreen", function() {
            banner.resize()
        })
    }

    _generateBackScreen () {
        this._backScreenMaterial = new THREE.ShaderMaterial({
            vertexShader: `precision mediump float;

            uniform vec2 resolution;
            uniform float time;
            uniform sampler2D texture;
            uniform float ratio;
            uniform float waveLength;
            uniform vec2 mouse;
            
            varying vec2 vUv;
            varying vec4 vPosition;
            
            void main()	{
                vUv = uv;
                lowp vec2 m = mouse * -0.025;
                lowp mat4 transform = mat4(
                     1.0,  0.0,  0.0,  0.0,
                     0.0,  1.0,  0.0,  0.0,
                     0.0,  0.0,  1.0,  0.0,
                     m.x,  m.y,  0.0,  1.0
                );
            
                lowp float vWave = sin( time + (position.x + position.y) * waveLength );
            
                vPosition = projectionMatrix * modelViewMatrix * vec4( position.x + m.x, position.y + m.y, vWave, 1.0 );
                gl_Position = vPosition * transform;
            }
            `,
            fragmentShader: `precision mediump float;

            varying vec2 vUv;
            varying vec4 vPosition;
            
            uniform vec2 resolution;
            uniform vec2 mouse;
            uniform float time;
            uniform float ratio;
            uniform float waveLength;
            uniform sampler2D texture;
            
            #ifdef MOBILE
                #define WAVE_RATIO 2
                #define LIGHT_RATIO float(WAVE_RATIO * 5)
            #else
                #define WAVE_RATIO 8
                #define LIGHT_RATIO float(WAVE_RATIO * 15)
            #endif
            
            
            void main()	{
            
                /*
                reference https://codepen.io/kenjiSpecial/pen/IFCzK?editors=1001
                ------------------------------------------------- */
                vec2 p = 7.68 * (gl_FragCoord.xy / resolution.xy - vec2(0.5, 1.0)) - vec2( mouse.x, -15.0 );
                vec2 i = p;
            
                float c = 1.0;
            
                for(int n = 0; n < WAVE_RATIO; n++){
                    float t = ( 1.0 - ( 10.0 / float( n + 10 ) ) ) * time;
                    float ix = i.x + mouse.x;
                    float iy = i.y + mouse.y;
                    i = vec2( cos( t - ix ) + sin( t + iy ), sin( t - iy ) + cos( t + ix ) ) + p;
                    c += float( n ) / length( vec2( p.x / ( sin( t + i.x ) / 1.1 ), p.y / ( cos( t + i.y ) / 1.1 ) ) ) * 20.0;
                }
            
                c /= LIGHT_RATIO;
                c = 1.8 - sqrt( c );
            
                /*
                ------------------------------------------------- */
            
                vec4 tx = texture2D( texture, vec2(vUv.s + 0.015, vUv.t + 0.015)) * texture2D( texture, vec2( vUv.s + cos(c) * mouse.x * 0.75, vUv.t + cos(c) * mouse.y * 0.75 ) ) * 0.75;
                vec4 newTx = vec4(tx.rgb, tx.a * ratio);
                vec4 ct = c * c * c * newTx;
                gl_FragColor = (ct - newTx * newTx - vec4( tx.rgb * 0.5, tx.a * vPosition.z * c * 0.001 ));
            }`,
            transparent: !0,
            side: 0,
            uniforms: {
                texture: {
                    type: "t",
                    value: this._backScreenTextures[this.textureID]
                },
                time: {
                    type: "f",
                    value: 1
                },
                ratio: {
                    type: "f",
                    value: 1
                },
                waveLength: {
                    type: "f",
                    value: 3
                },
                resolution: {
                    type: "v2",
                    value: new THREE.Vector2(this.size.width,this.size.height)
                },
                mouse: this._slidersUniforms.mouse
            },
            defines: {
                MOBILE: window.MOBILE || window.TABLET,
                DEBUG: !0
            }
        });
        this._backScreen = new THREE.Mesh(this._geometry,this._backScreenMaterial);
        this._scene.add(this._backScreen);
        this.size.width / this.size.height > 1 && (this._backScreen.scale.x = this._backScreen.scale.y = this.size.width / this.size.height * .57);
    }

    _webglAvailable () {
        try {
            var A = document.createElement("canvas");
            return !(!window.WebGLRenderingContext || !A.getContext("webgl") && !A.getContext("experimental-webgl"))
        } catch (A) {
            return !1
        }
    }

    _setRenderer () {
        this._webglAvailable() ? this._renderer = new THREE.WebGLRenderer({
            antialias: !0,
            alpha: !0,
            preserveDrawingBuffer: !0
        }) : this._renderer = new r.h,
        this._renderer.autoClearColor = !1,
        this._renderer.setClearColor(262150),
        this._renderer.setPixelRatio(window.devicePixelRatio),
        this._renderer.setSize(this.size.width, this.size.height),
        null === this._appendTarget ? document.body.appendChild(this._renderer.domElement) : this._appendTarget.appendChild(this._renderer.domElement)
    }

    _setCamera () {
        this._camera = new THREE.PerspectiveCamera(1,this.size.width / this.size.height,1,1000);
        this._camera.position.set(0, 0, 38);
        this._camera.lookAt(new THREE.Vector3(0,0,0));
    }

    _setScene () {
        this._scene = new THREE.Scene();
    }

}

