/**
 * 3D Birthday Celebration - Three.js Scene Engine (Story Guided Mode)
 * Curtains, Garlands, Interactive Balloons, Covered Cake, & Slicing
 */

class BirthdayScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = new THREE.Clock();

    // Scene Groups
    this.cakeGroup = new THREE.Group();
    this.cakeSliceGroup = null;
    this.cakeKnife = null;
    this.isCakeSliced = false;
    this.candles = [];
    this.flames = [];
    this.candleLights = [];
    this.candlesLit = false;
    this.currentAge = 22;

    // Table & Cloth Cover
    this.tableGroup = new THREE.Group();
    this.clothCover = null;
    this.isClothRemoved = false;

    // Decorative Arches
    this.decorGroup = new THREE.Group();
    this.garlandLights = [];

    // Interactive Balloons
    this.tableBalloons = [];
    this.generalBalloons = [];
    this.tableBalloonsRemaining = 5;

    // Gift & Extras
    this.giftGroup = new THREE.Group();
    this.giftLid = null;
    this.giftOpened = false;
    this.discoBallGroup = null;
    this.discoSpotlights = [];
    this.isDiscoActive = false;

    this.fireworks = [];
    this.confettiList = [];
    this.sparklerActive = false;

    // VFX Systems Properties
    this.vfxAuraParticles = null;
    this.vfxAuraParticlesData = [];
    this.vfxAuraRing = null;
    this.vfxAuraIntensity = 1.0;
    this.vfxBokehParticles = null;
    this.vfxBokehData = [];
    this.vfxStarTrails = [];
    this.vfxLastStarSpawn = 0;
    this.vfxActiveFireworks = [];
    this.vfxSmokeParticles = [];
    this.vfxSliceSparks = [];

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Tap-and-Hold Camera Gesture State
    this.isPointerDown = false;
    this.pointerStartPos = { x: 0, y: 0 };
    this.pointerLastPos = { x: 0, y: 0 };
    this.holdTimer = null;
    this.isHoldGestureActive = false;

    // Color theme - Default to romantic Rose Gold & Velvet Pink
    this.currentTheme = 'rose-glamour';
    this.themeColors = {
      'midnight-gold': {
        cakeBase: 0xfbf6e2,
        cakeTop: 0x3d1c06,
        frosting: 0xffd700,
        plate: 0x221a2e,
        plateTrim: 0xffd700,
        giftBox: 0x1f143d,
        giftRibbon: 0xffd700,
        balloons: [0xffd700, 0x00e676, 0x00b0ff, 0xffd700, 0x00e676, 0x00b0ff],
        lightGlow: 0xffaa00
      },
      'rose-glamour': {
        cakeBase: 0xffe6ea,
        cakeTop: 0xff9bb2,
        frosting: 0xff4d79,
        plate: 0x2d1120,
        plateTrim: 0xff758c,
        giftBox: 0xff4d79,
        giftRibbon: 0xffffff,
        balloons: [0xff758c, 0xff7eb3, 0xffcad4, 0xffffff, 0xf72585, 0xb5179e],
        lightGlow: 0xff6b8b
      },
      'cyber-neon': {
        cakeBase: 0x162447,
        cakeTop: 0x1f4068,
        frosting: 0x00f2fe,
        plate: 0x0b1021,
        plateTrim: 0x00f2fe,
        giftBox: 0x0f3460,
        giftRibbon: 0x00f2fe,
        balloons: [0x00f2fe, 0x4facfe, 0x43e97b, 0xfa709a, 0xfee140, 0x7f00ff],
        lightGlow: 0x00d4ff
      },
      'cosmic-purple': {
        cakeBase: 0x301b52,
        cakeTop: 0x562382,
        frosting: 0xc471ed,
        plate: 0x180b2b,
        plateTrim: 0x21d4fd,
        giftBox: 0x6b11ff,
        giftRibbon: 0x21d4fd,
        balloons: [0xb721ff, 0x21d4fd, 0x8a2be2, 0xff007f, 0x9400d3, 0x00ffff],
        lightGlow: 0xb721ff
      },
      'pastel-rainbow': {
        cakeBase: 0xfff0f5,
        cakeTop: 0xe6e6fa,
        frosting: 0xfbc2eb,
        plate: 0x2a2438,
        plateTrim: 0xa6c1ee,
        giftBox: 0xfbc2eb,
        giftRibbon: 0xa6c1ee,
        balloons: [0xfbc2eb, 0xa6c1ee, 0xb5ead7, 0xffdac1, 0xff9aa2, 0xe2f0cb],
        lightGlow: 0xfbc2eb
      }
    };

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0c071e, 0.012);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);

    const initCam = this.getCelebrationCameraCoords();
    this.camera.position.set(initCam.pos.x, initCam.pos.y, initCam.pos.z);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 65;
    this.controls.target.set(initCam.target.x, initCam.target.y, initCam.target.z);
    this.controls.enableRotate = false; // Screen rotate na ho by default - tap & hold required
    this.controls.enableZoom = true;

    this.setupLighting();
    this.createFloorAndStage();
    this.createBackgroundDecor();
    this.createPartyTable();
    this.createBirthdayCake();
    this.createClothCover();
    this.createTableBalloons(5);
    this.createPartyFriends();
    this.createPhotoFrame();
    this.createStandBoardWithLights();
    this.createCornerPolesAndDiwaliLights();
    this.createSurpriseGift();
    this.createDiscoBall();
    this.createConfettiStorm();
    this.createRosePetalsSystem();
    this.initVfxSystem();

    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.onWindowResize(), 150);
    });
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('pointercancel', this.onPointerUp.bind(this));

    // Reset controls state on window blur/focus (prevents spinning on file dialog open/close)
    window.addEventListener('blur', () => {
      if (this.controls) {
        this.controls.state = -1;
      }
    });
    window.addEventListener('focus', () => {
      if (this.controls) {
        this.controls.state = -1;
      }
    });

    // Real-Time Firecrackers Video & Chroma-Key Player
    this.initFirecrackersVideoPlayer();

    // Auto-detect device type (Mobile, Tablet, Desktop) and apply perfect framing
    this.applyAdaptiveLayout();

    this.animate();
  }

  /* =========================================================
     REAL-TIME FIRECRACKERS VIDEO & CHROMA-KEY (GREEN REMOVAL)
     ========================================================= */
  initFirecrackersVideoPlayer() {
    this.fcVideo = document.getElementById('firecrackers-video');
    this.fcCanvas = document.getElementById('firecrackers-canvas');
    if (!this.fcVideo || !this.fcCanvas) return;

    this.fcCtx = this.fcCanvas.getContext('2d', { willReadFrequently: true });
    this.isFcPlaying = false;

    // Buffer canvas for GPU-speed native 1280x720 HD chroma-key processing (4K crisp edges)
    this.fcBufferCanvas = document.createElement('canvas');
    this.fcBufferCanvas.width = 1280;
    this.fcBufferCanvas.height = 720;
    this.fcBufferCtx = this.fcBufferCanvas.getContext('2d', { willReadFrequently: true });
    this.fcAudioBoosted = false;
  }

  initFirecrackerAudioBoost() {
    if (this.fcAudioBoosted || !this.fcVideo) return;
    try {
      if (window.birthdayAudio) {
        window.birthdayAudio.init();
        if (window.birthdayAudio.ctx) {
          const source = window.birthdayAudio.ctx.createMediaElementSource(this.fcVideo);
          const boostGain = window.birthdayAudio.ctx.createGain();
          boostGain.gain.setValueAtTime(2.2, window.birthdayAudio.ctx.currentTime); // 2.2x Volume Boost
          source.connect(boostGain);
          boostGain.connect(window.birthdayAudio.ctx.destination);
          this.fcAudioBoosted = true;
        }
      }
    } catch(e) {}
  }

  playGreenScreenFirecrackers(duration = null, onVideoComplete = null) {
    if (!this.fcVideo || !this.fcCanvas) {
      if (onVideoComplete) onVideoComplete();
      return;
    }

    this.initFirecrackerAudioBoost();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const clientW = this.fcCanvas.clientWidth || Math.min(window.innerWidth * 0.9, 960);
    const clientH = this.fcCanvas.clientHeight || Math.min(window.innerHeight * 0.68, 620);
    this.fcCanvas.width = clientW * dpr;
    this.fcCanvas.height = clientH * dpr;
    this.fcCanvas.style.display = 'block';
    this.fcCanvas.style.opacity = '1';
    this.fcCanvas.classList.add('active');

    this.onFcComplete = onVideoComplete;
    this.fcVideo.volume = 1.0;
    this.fcVideo.muted = false;

    // Start video playback from 0s for instant firecracker burst
    try {
      this.fcVideo.currentTime = 0;
    } catch(e) {}

    const startProcessing = () => {
      this.isFcPlaying = true;
      const startTime = Date.now();

      const processChromaFrame = () => {
        if (!this.isFcPlaying) return;

        const isEnded = this.fcVideo.ended || (this.fcVideo.duration > 0 && this.fcVideo.currentTime >= this.fcVideo.duration - 0.25 && (Date.now() - startTime > 2000));
        const isTimeUp = duration && (Date.now() - startTime > duration * 1000);

        if (isEnded || isTimeUp) {
          this.stopGreenScreenFirecrackers();
          return;
        }

        if (this.fcVideo.readyState >= 2 && !this.fcVideo.paused) {
          const bw = this.fcBufferCanvas.width;
          const bh = this.fcBufferCanvas.height;

          try {
            this.fcBufferCtx.drawImage(this.fcVideo, 0, 0, bw, bh);
            const frame = this.fcBufferCtx.getImageData(0, 0, bw, bh);
            const l = frame.data.length;
            const timeNow = (Date.now() - startTime) * 0.003;

            // Precision 4K Chroma-Key & Sub-pixel Edge Anti-Aliasing (Zero Green Fringe)
            for (let i = 0; i < l; i += 4) {
              const r = frame.data[i];
              const g = frame.data[i + 1];
              const b = frame.data[i + 2];

              // Green Dominance Delta
              const maxRB = (r > b) ? r : b;
              const greenDiff = g - maxRB;

              // Pure green background removal & edge despill
              if (g > 45 && greenDiff > 8) {
                if (greenDiff > 22) {
                  frame.data[i + 3] = 0; // 100% Transparent
                  continue;
                } else {
                  // Smooth sub-pixel alpha feather on edges
                  frame.data[i + 3] = Math.round((1 - (greenDiff - 8) / 14) * 255);
                  frame.data[i + 1] = maxRB; // Remove green fringing on sparks
                }
              }

              // Dynamic Multi-Color Festival Grading for Firecracker Sparks & Bursts
              if (frame.data[i + 3] > 20) {
                const pixelIdx = i >> 2;
                const px = pixelIdx % bw;
                const py = (pixelIdx / bw) | 0;
                const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

                // Chromatic waves for Gold, Crimson Red, Royal Blue, Emerald, Violet, Cyan
                const phase = (px / bw) * 4.0 + (py / bh) * 3.0 + timeNow;
                const cr = 0.5 + 0.5 * Math.sin(phase);
                const cg = 0.5 + 0.5 * Math.sin(phase + 2.094);
                const cb = 0.5 + 0.5 * Math.sin(phase + 4.188);

                if (lum > 0.82) {
                  // Crisp incandescent sparkling diamond-gold/white core
                  frame.data[i] = Math.min(255, r * 1.08 + cr * 35);
                  frame.data[i + 1] = Math.min(255, g * 1.05 + cg * 30);
                  frame.data[i + 2] = Math.min(255, b * 1.08 + cb * 35);
                } else {
                  // Firecracker sparks, tails and trails get rich brilliant rainbow colors
                  frame.data[i] = Math.min(255, Math.floor(lum * cr * 340 + 35));
                  frame.data[i + 1] = Math.min(255, Math.floor(lum * cg * 320 + 25));
                  frame.data[i + 2] = Math.min(255, Math.floor(lum * cb * 360 + 45));
                }
              }
            }

            this.fcBufferCtx.putImageData(frame, 0, 0);

            // Render transparent sparks directly over the 3D scene
            this.fcCtx.clearRect(0, 0, this.fcCanvas.width, this.fcCanvas.height);
            this.fcCtx.drawImage(this.fcBufferCanvas, 0, 0, this.fcCanvas.width, this.fcCanvas.height);
          } catch(err) {
            // Direct draw fallback in case of CORS or canvas security restrictions
            this.fcCtx.clearRect(0, 0, this.fcCanvas.width, this.fcCanvas.height);
            this.fcCtx.drawImage(this.fcVideo, 0, 0, this.fcCanvas.width, this.fcCanvas.height);
          }
        }

        this.fcAnimFrame = requestAnimationFrame(processChromaFrame);
      };

      this.fcAnimFrame = requestAnimationFrame(processChromaFrame);
    };

    const playPromise = this.fcVideo.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        startProcessing();
      }).catch(() => {
        this.fcVideo.muted = true;
        this.fcVideo.play().then(() => {
          startProcessing();
        });
      });
    } else {
      startProcessing();
    }
  }

  stopGreenScreenFirecrackers() {
    this.isFcPlaying = false;
    if (this.fcAnimFrame) cancelAnimationFrame(this.fcAnimFrame);
    if (this.fcVideo) {
      this.fcVideo.pause();
      try { this.fcVideo.currentTime = 0; } catch(e) {}
    }
    if (this.fcCanvas) {
      this.fcCanvas.classList.remove('active');
      this.fcCanvas.style.opacity = '0';
      this.fcCanvas.style.display = 'none';
      if (this.fcCtx) this.fcCtx.clearRect(0, 0, this.fcCanvas.width, this.fcCanvas.height);
    }
    if (this.onFcComplete) {
      const cb = this.onFcComplete;
      this.onFcComplete = null;
      cb();
    }
  }

  /* =========================================================
     AUTO DEVICE DETECTION & ADAPTIVE RESPONSIVE LAYOUT ENGINE
     ========================================================= */
  getDeviceProfile() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    let type = 'desktop';
    if (w < 700 || (w < 900 && aspect < 1.0)) {
      type = 'mobile';
    } else if (w <= 1080 || (isTouch && w <= 1200)) {
      type = 'tablet';
    }

    return {
      type,
      width: w,
      height: h,
      aspect,
      isPortrait: aspect < 1.0,
      isTouch
    };
  }

  getCelebrationCameraCoords() {
    const dev = this.getDeviceProfile();
    if (dev.type === 'mobile' || dev.isPortrait) {
      // User's exact approved phone angle:
      // camera: { x: 0.25, y: 14.97, z: 52.42 }, target: { x: -0.22, y: 2.80, z: -0.03 }
      return {
        pos: { x: 0.25, y: 14.97, z: 52.42 },
        target: { x: -0.22, y: 2.80, z: -0.03 }
      };
    } else {
      // User's approved desktop/laptop angle:
      return {
        pos: { x: -3.52, y: 10.82, z: 31.82 },
        target: { x: 0.00, y: 2.50, z: 0.00 }
      };
    }
  }

  applyAdaptiveLayout() {
    const dev = this.getDeviceProfile();

    // 1. Update document body classes for CSS responsive styling
    document.body.classList.remove('device-mobile', 'device-tablet', 'device-desktop', 'orientation-portrait', 'orientation-landscape');
    document.body.classList.add(`device-${dev.type}`);
    document.body.classList.add(dev.isPortrait ? 'orientation-portrait' : 'orientation-landscape');

    // 2. Adaptive FOV & Camera Framing for Mobile / Tablet / Desktop
    if (dev.type === 'mobile' || dev.isPortrait) {
      this.camera.fov = 45;
      if (this.controls) {
        this.controls.minDistance = 6;
        this.controls.maxDistance = 65;
      }
    } else if (dev.type === 'tablet') {
      this.camera.fov = dev.isPortrait ? 50 : 45;
      if (this.controls) {
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;
      }
    } else {
      // Desktop Cinematic
      this.camera.fov = 45;
      if (this.controls) {
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;
      }
    }

    this.camera.aspect = dev.aspect;
    this.camera.updateProjectionMatrix();

    if (this.renderer) {
      this.renderer.setSize(dev.width, dev.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, dev.type === 'mobile' ? 1.75 : 2));
    }
  }

  onWindowResize() {
    this.applyAdaptiveLayout();
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.5);
    this.dirLight.position.set(12, 22, 15);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.scene.add(this.dirLight);

    this.fillLight = new THREE.DirectionalLight(0x7b68ee, 0.9);
    this.fillLight.position.set(-15, 14, -10);
    this.scene.add(this.fillLight);

    this.cakeGlowLight = new THREE.PointLight(0xffd700, 1.8, 16);
    this.cakeGlowLight.position.set(0, 4.5, 0);
    this.scene.add(this.cakeGlowLight);
  }

  createFloorAndStage() {
    // Large polished party hall floor
    const stageGeo = new THREE.CylinderGeometry(15, 16, 0.4, 64);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x120a24,
      roughness: 0.2,
      metalness: 0.7,
    });
    this.stage = new THREE.Mesh(stageGeo, stageMat);
    this.stage.position.y = -0.2;
    this.stage.receiveShadow = true;
    this.scene.add(this.stage);

    // Glowing stage ring
    const ringGeo = new THREE.TorusGeometry(15.05, 0.08, 16, 100);
    this.stageRingMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const ring = new THREE.Mesh(ringGeo, this.stageRingMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.01;
    this.scene.add(ring);
  }

  /* =========================================================
     BACKGROUND ARCH: SEMI-CIRCLE TEXT, GHALAR GARLAND & 3-PAIR BALLOONS
     ========================================================= */
  createBackgroundDecor() {
    this.decorGroup = new THREE.Group();

    // 1. Semi-Circular 3D "HAPPY BIRTHDAY" Curved Arch Banner
    const bannerWords = ["H", "A", "P", "P", "Y", "•", "B", "I", "R", "T", "H", "D", "A", "Y"];
    const totalLetters = bannerWords.length;
    const archRadius = 9.8;
    const archCenterY = 5.2;
    const startAngle = Math.PI * 0.88;
    const endAngle = Math.PI * 0.12;

    const goldFrameMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.15
    });

    bannerWords.forEach((char, i) => {
      const t = i / (totalLetters - 1);
      const angle = startAngle + t * (endAngle - startAngle);
      const x = Math.cos(angle) * archRadius;
      const y = archCenterY + Math.sin(angle) * 4.2;
      const z = -4.4;

      const letterGroup = new THREE.Group();
      letterGroup.position.set(x, y, z);
      letterGroup.rotation.z = angle - Math.PI / 2; // tangent to curve

      // Letter Block Base (Gold Beveled Badge)
      const isBullet = char === "•";
      const blockWidth = isBullet ? 0.45 : 0.88;
      const blockHeight = isBullet ? 0.45 : 1.05;

      const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(blockWidth, blockHeight, 0.18), goldFrameMat);
      blockMesh.castShadow = true;
      letterGroup.add(blockMesh);

      // Canvas for high-def Typography Letter
      const letterCanvas = document.createElement('canvas');
      letterCanvas.width = 128;
      letterCanvas.height = 160;
      const ctx = letterCanvas.getContext('2d');

      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 128, 160);
      grad.addColorStop(0, '#780206');
      grad.addColorStop(1, '#1a0004');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 160);

      // Gold border
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 118, 150);

      // Golden Letter Text
      ctx.fillStyle = '#ffd700';
      ctx.font = '900 88px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ffe066';
      ctx.shadowBlur = 12;
      ctx.fillText(char, 64, 82);

      const letterTex = new THREE.CanvasTexture(letterCanvas);
      const letterFaceMat = new THREE.MeshStandardMaterial({
        map: letterTex,
        roughness: 0.2,
        metalness: 0.1,
        emissive: 0x331100
      });

      const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(blockWidth - 0.08, blockHeight - 0.08), letterFaceMat);
      facePlane.position.z = 0.1;
      letterGroup.add(facePlane);

      this.decorGroup.add(letterGroup);
    });

    // 2. Decorative Ghalar / Bunting Garland Arch & Side Cascades down to the Floor
    const flagGeo = new THREE.ConeGeometry(0.28, 0.5, 3);
    const flagColors = [0xff0055, 0xffd700, 0x00f2fe, 0x00e676, 0xb721ff, 0xff8c00];

    // 2A. Top Arch Garland
    for (let i = 0; i < 32; i++) {
      const t = i / 31;
      const angle = startAngle + t * (endAngle - startAngle);
      const x = Math.cos(angle) * (archRadius - 0.5);
      const y = archCenterY + Math.sin(angle) * 3.2 - 0.4;
      const z = -4.8;

      const flagMat = new THREE.MeshStandardMaterial({
        color: flagColors[i % flagColors.length],
        roughness: 0.3
      });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(x, y, z);
      flag.rotation.x = Math.PI; // point down
      this.decorGroup.add(flag);

      // Glowing fairy light orb
      if (i % 2 === 0) {
        const lightOrb = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 12, 12),
          new THREE.MeshBasicMaterial({ color: flagColors[i % flagColors.length] })
        );
        lightOrb.position.set(x, y - 0.45, z + 0.1);
        this.decorGroup.add(lightOrb);
      }
    }

    // 2B. Full Backdrop Garland Curtain (Cascading from arch all the way to floor across entire width)
    const garlandColumns = [
      -9.2, -7.8, -6.4, -5.0, -3.6, -2.2, -0.8, 0.8, 2.2, 3.6, 5.0, 6.4, 7.8, 9.2
    ];

    const stringMat = new THREE.LineBasicMaterial({ color: 0xffd700, opacity: 0.7, transparent: true });

    garlandColumns.forEach((colX, colIdx) => {
      // Calculate top Y based on the semicircle arch height at this X
      const normX = colX / archRadius;
      const clampedNormX = Math.max(-0.95, Math.min(0.95, normX));
      const topY = Math.min(8.0, archCenterY + Math.sqrt(Math.max(0, 1 - clampedNormX * clampedNormX)) * 3.5 - 0.3);

      // Vertical guide string from top down to floor
      const stringPoints = [new THREE.Vector3(colX, topY, -4.8), new THREE.Vector3(colX, 0.1, -4.8)];
      this.decorGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(stringPoints), stringMat));

      // Flags and Glowing Fairy Lights cascading down to floor
      for (let y = topY - 0.3; y >= 0.2; y -= 0.52) {
        const flagIndex = Math.floor((y + Math.abs(colX)) * 4);
        const flagColor = flagColors[(flagIndex + colIdx) % flagColors.length];

        const flagMat = new THREE.MeshStandardMaterial({
          color: flagColor,
          roughness: 0.3
        });

        // Main hanging flag
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(colX, y, -4.8);
        flag.rotation.x = Math.PI; // point down
        this.decorGroup.add(flag);

        // Glowing Fairy Light Orb between flags
        if (Math.abs(y * 10) % 2 < 1.2) {
          const lightOrb = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 12, 12),
            new THREE.MeshBasicMaterial({ color: flagColor })
          );
          lightOrb.position.set(colX, y - 0.24, -4.7);
          this.decorGroup.add(lightOrb);
        }
      }
    });

    // 3. Top Left & Top Right: 3 Pairs of Heart Balloons (Romantic Pink & Ruby Red with Glitter Powder)
    const sideBalloonColors = [
      0xff0054, // Vivid Crimson Pink
      0xd90429, // Deep Passion Ruby Red
      0xff4d6d, // Romantic Hot Pink
      0xff0a54, // Ruby Rose Red
      0xff758c  // Glamorous Velvet Pink
    ];
    const leftBase = { x: -8.5, y: 7.5, z: -3.5 };
    const rightBase = { x: 8.5, y: 7.5, z: -3.5 };

    const heartGeo = this.createHeartGeometry(1.25);
    const glitterBumpTex = this.createGlitterBumpTexture();
    const glitterSparkleTex = this.createGlitterSparkleTexture();

    // Build 3 pairs on Left and 3 pairs on Right
    [leftBase, rightBase].forEach((base, sideIdx) => {
      const dir = sideIdx === 0 ? 1 : -1;

      for (let pairIdx = 0; pairIdx < 3; pairIdx++) {
        const col = sideBalloonColors[(pairIdx + (sideIdx * 2)) % sideBalloonColors.length];
        const mat = new THREE.MeshPhysicalMaterial({
          color: col,
          metalness: 0.52,
          roughness: 0.22,
          clearcoat: 1.0,
          clearcoatRoughness: 0.08,
          bumpMap: glitterBumpTex,
          bumpScale: 0.038,
          reflectivity: 0.9
        });

        // Two heart balloons per pair
        for (let b = 0; b < 2; b++) {
          const balloonMesh = new THREE.Mesh(heartGeo, mat);
          const offsetX = (pairIdx * 0.85 * dir) + (b === 0 ? -0.35 : 0.35);
          const offsetY = (pairIdx * 1.1) + (b === 0 ? 0.35 : -0.35);

          balloonMesh.position.set(base.x + offsetX, base.y + offsetY, base.z + b * 0.4);

          // Knot & Hanging string
          const knot = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.18, 12), mat);
          knot.position.y = -1.1;
          knot.rotation.x = Math.PI;
          balloonMesh.add(knot);

          const stringPoints = [new THREE.Vector3(0, -1.1, 0), new THREE.Vector3(0.05, -3.5, 0)];
          const stringLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(stringPoints),
            new THREE.LineBasicMaterial({ color: 0xffcad4, opacity: 0.7, transparent: true })
          );
          balloonMesh.add(stringLine);

          // Sparkling Glitter Powder Halo Points Cloud on each heart balloon
          const gCount = 60;
          const gGeo = new THREE.BufferGeometry();
          const gPos = new Float32Array(gCount * 3);
          const gCols = new Float32Array(gCount * 3);
          const gPal = [new THREE.Color(0xffffff), new THREE.Color(0xffd700), new THREE.Color(0xffe6a7), new THREE.Color(0xff85a1)];

          for (let g = 0; g < gCount; g++) {
            const ga = Math.random() * Math.PI * 2;
            const gr = 0.5 + Math.random() * 0.65;
            gPos[g * 3] = Math.cos(ga) * gr;
            gPos[g * 3 + 1] = (Math.random() - 0.4) * 1.4;
            gPos[g * 3 + 2] = (Math.random() - 0.5) * 0.6;
            const c = gPal[Math.floor(Math.random() * gPal.length)];
            gCols[g * 3] = c.r; gCols[g * 3 + 1] = c.g; gCols[g * 3 + 2] = c.b;
          }

          gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
          gGeo.setAttribute('color', new THREE.BufferAttribute(gCols, 3));

          const gMat = new THREE.PointsMaterial({
            size: 0.16,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            map: glitterSparkleTex,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });

          const gPoints = new THREE.Points(gGeo, gMat);
          balloonMesh.add(gPoints);

          // Generous invisible hitbox
          const decorHitbox = new THREE.Mesh(
            new THREE.SphereGeometry(1.6, 8, 8),
            new THREE.MeshBasicMaterial({ visible: false, transparent: true, opacity: 0 })
          );
          decorHitbox.userData = { type: 'decor-balloon-hitbox', parentBalloon: balloonMesh };
          balloonMesh.add(decorHitbox);

          balloonMesh.userData = {
            type: 'decor-balloon',
            basePos: balloonMesh.position.clone(),
            floatSpeed: 1.2 + Math.random() * 0.5,
            wobbleOffset: Math.random() * 5,
            glitterPoints: gPoints,
            color: col
          };

          this.decorGroup.add(balloonMesh);
          this.generalBalloons.push(balloonMesh);
        }
      }
    });

    this.scene.add(this.decorGroup);
  }

  /* =========================================================
     FOUR CORNER WHITE POLES & HANGING DIWALI LIGHT BULBS
     ========================================================= */
  createCornerPolesAndDiwaliLights() {
    this.polesGroup = new THREE.Group();
    this.diwaliBulbs = [];

    const polePositions = [
      { x: -11.5, z: 11.5 },   // Front-Left
      { x: 11.5, z: 11.5 },    // Front-Right
      { x: 11.5, z: -11.5 },   // Back-Right
      { x: -11.5, z: -11.5 }   // Back-Left
    ];

    const poleHeight = 10.5;
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.15
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.2,
      metalness: 0.85
    });

    // Build 4 White Decorative Corner Poles with Gold Trims
    polePositions.forEach(p => {
      const poleGroup = new THREE.Group();
      poleGroup.position.set(p.x, 0, p.z);

      // Base Pedestal
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.8, 0.4, 24), goldMat);
      base.position.y = 0.2;
      base.castShadow = true;
      poleGroup.add(base);

      const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.65, 0.3, 24), whiteMat);
      baseRing.position.y = 0.55;
      poleGroup.add(baseRing);

      // Main White Column
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, poleHeight, 24), whiteMat);
      column.position.y = poleHeight / 2 + 0.5;
      column.castShadow = true;
      poleGroup.add(column);

      // Gold Mid Rings
      for (let r = 0; r < 3; r++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 12, 24), goldMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 3.0 + r * 2.8;
        poleGroup.add(ring);
      }

      // Gold Capital Crown / Topper
      const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.3, 0.4, 24), goldMat);
      capital.position.y = poleHeight + 0.5;
      poleGroup.add(capital);

      const topOrb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), goldMat);
      topOrb.position.y = poleHeight + 0.9;
      poleGroup.add(topOrb);

      this.polesGroup.add(poleGroup);
    });

    // Multi-colored Diwali Light Bulbs (Green, Blue, Red, Pink, Orange, Yellow, Cyan, Violet, Warm White)
    const diwaliColors = [
      0x00e676, // Green
      0x0088ff, // Blue
      0xff0044, // Red
      0xff758c, // Pink
      0xff8c00, // Orange
      0xffea00, // Yellow
      0x00f2fe, // Cyan
      0xb721ff, // Violet
      0xffffff  // Warm White
    ];

    // 6 Hanging Cable Spans: 4 Outer Perimeter Sides + 2 Diagonal Canopy Criss-Cross
    const cableSpans = [
      [polePositions[0], polePositions[1]], // Front-Left to Front-Right
      [polePositions[1], polePositions[2]], // Front-Right to Back-Right
      [polePositions[2], polePositions[3]], // Back-Right to Back-Left
      [polePositions[3], polePositions[0]], // Back-Left to Front-Left
      [polePositions[0], polePositions[2]], // Diagonal Front-Left to Back-Right
      [polePositions[1], polePositions[3]]  // Diagonal Front-Right to Back-Left
    ];

    const cableMat = new THREE.LineBasicMaterial({ color: 0x222222 });
    const bulbGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const capGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.09, 12);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });

    cableSpans.forEach((span, spanIdx) => {
      const pA = new THREE.Vector3(span[0].x, poleHeight + 0.8, span[0].z);
      const pB = new THREE.Vector3(span[1].x, poleHeight + 0.8, span[1].z);

      const midPoint = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
      midPoint.y -= (spanIdx < 4 ? 1.8 : 2.5); // graceful hanging sag

      const curve = new THREE.QuadraticBezierCurve3(pA, midPoint, pB);
      const points = curve.getPoints(30);

      const cableLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), cableMat);
      this.polesGroup.add(cableLine);

      const bulbCount = spanIdx < 4 ? 18 : 22;
      for (let b = 1; b < bulbCount; b++) {
        const t = b / bulbCount;
        const pos = curve.getPoint(t);
        const col = diwaliColors[(b + spanIdx * 3) % diwaliColors.length];

        const bulbMat = new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 0.9,
          roughness: 0.1,
          metalness: 0.1
        });

        const bulbGroup = new THREE.Group();
        bulbGroup.position.set(pos.x, pos.y, pos.z);

        const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
        bulbMesh.position.y = -0.16;
        bulbGroup.add(bulbMesh);

        const socketCap = new THREE.Mesh(capGeo, capMat);
        socketCap.position.y = -0.04;
        bulbGroup.add(socketCap);

        this.polesGroup.add(bulbGroup);
        this.diwaliBulbs.push({
          mat: bulbMat,
          baseColor: col,
          phase: Math.random() * Math.PI * 2,
          speed: 2.0 + Math.random() * 2.5
        });
      }
    });

    this.scene.add(this.polesGroup);
  }

  /* =========================================================
     PARTY TABLE
     ========================================================= */
  createPartyTable() {
    this.tableGroup = new THREE.Group();

    // Table Top (Round / Oval banquet table)
    const tableTopMat = new THREE.MeshStandardMaterial({
      color: 0x2b1810,
      roughness: 0.4,
      metalness: 0.2
    });
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.25, 48), tableTopMat);
    tableTop.position.y = 1.0;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    this.tableGroup.add(tableTop);

    // Decorative Gold Table Cloth Trim
    const runnerMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.3,
      metalness: 0.7
    });
    const runner = new THREE.Mesh(new THREE.CylinderGeometry(4.62, 4.62, 0.08, 48), runnerMat);
    runner.position.y = 1.1;
    this.tableGroup.add(runner);

    // 4 Carved Table Legs
    const legGeo = new THREE.CylinderGeometry(0.18, 0.12, 1.0, 16);
    const legPositions = [
      { x: 2.8, z: 2.8 },
      { x: -2.8, z: 2.8 },
      { x: 2.8, z: -2.8 },
      { x: -2.8, z: -2.8 }
    ];
    legPositions.forEach(p => {
      const leg = new THREE.Mesh(legGeo, tableTopMat);
      leg.position.set(p.x, 0.5, p.z);
      leg.castShadow = true;
      this.tableGroup.add(leg);
    });

    this.scene.add(this.tableGroup);
  }

  /* =========================================================
     4-5 3D PARTY FRIENDS / CHARACTERS BEHIND CAKE
     ========================================================= */
  createPartyFriends() {
    this.friendsGroup = new THREE.Group();
    this.partyFriends = [];

    const friendConfigs = [
      { x: -4.4, z: -2.0, shirtColor: 0xff0055, hatColor: 0xffd700, skinColor: 0xfcd5b5 },
      { x: -2.2, z: -2.8, shirtColor: 0x00e676, hatColor: 0x00f2fe, skinColor: 0xf3c19d },
      { x: 0.0,  z: -3.2, shirtColor: 0xffd700, hatColor: 0xff0055, skinColor: 0xfcd5b5 },
      { x: 2.2,  z: -2.8, shirtColor: 0x00f2fe, hatColor: 0xb721ff, skinColor: 0xf3c19d },
      { x: 4.4,  z: -2.0, shirtColor: 0xb721ff, hatColor: 0xffd700, skinColor: 0xfcd5b5 }
    ];

    friendConfigs.forEach((cfg, idx) => {
      const friend = new THREE.Group();

      // Shirt / Torso (Taller & Proportional)
      const shirtMat = new THREE.MeshStandardMaterial({ color: cfg.shirtColor, roughness: 0.45 });
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.54, 2.2, 16), shirtMat);
      torso.position.y = 2.3;
      torso.castShadow = true;
      friend.add(torso);

      // Head (Larger & clearer)
      const headMat = new THREE.MeshStandardMaterial({ color: cfg.skinColor, roughness: 0.4 });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 16), headMat);
      head.position.y = 3.65;
      head.castShadow = true;
      friend.add(head);

      // Smiling Eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
      eyeL.position.set(-0.14, 3.72, 0.38);
      friend.add(eyeL);

      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
      eyeR.position.set(0.14, 3.72, 0.38);
      friend.add(eyeR);

      // Party Conical Hat with pompom (Tall & Vibrant)
      const hatMat = new THREE.MeshStandardMaterial({ color: cfg.hatColor, roughness: 0.25 });
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.85, 16), hatMat);
      hat.position.set(0, 4.45, 0);
      hat.rotation.z = (idx % 2 === 0 ? -0.15 : 0.15);
      friend.add(hat);

      const pompom = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      pompom.position.set(0, 4.92, 0);
      friend.add(pompom);

      // Arms (for waving / clapping)
      const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.85, 12);
      armGeo.translate(0, -0.42, 0);

      const leftArm = new THREE.Mesh(armGeo, shirtMat);
      leftArm.position.set(-0.55, 3.1, 0);
      leftArm.rotation.z = Math.PI / 4;
      leftArm.rotation.x = -Math.PI / 4;
      friend.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, shirtMat);
      rightArm.position.set(0.55, 3.1, 0);
      rightArm.rotation.z = -Math.PI / 4;
      rightArm.rotation.x = -Math.PI / 4;
      friend.add(rightArm);

      // Initial placement (hidden below stage)
      friend.position.set(cfg.x, -6.0, cfg.z);
      friend.scale.set(0.01, 0.01, 0.01);

      friend.userData = {
        baseX: cfg.x,
        baseZ: cfg.z,
        targetY: 1.4,
        isRevealed: false,
        leftArm,
        rightArm,
        isClapping: false,
        wobbleOffset: idx * 1.2
      };

      this.friendsGroup.add(friend);
      this.partyFriends.push(friend);
    });

    this.scene.add(this.friendsGroup);
  }

  revealPartyFriends() {
    this.partyFriends.forEach((friend, i) => {
      friend.userData.isRevealed = true;
      gsap.to(friend.scale, {
        x: 1.25, y: 1.25, z: 1.25,
        duration: 0.85,
        delay: 0.12 * i,
        ease: 'back.out(2)'
      });
      gsap.to(friend.position, {
        y: 1.4,
        duration: 0.9,
        delay: 0.12 * i,
        ease: 'back.out(1.8)'
      });
    });
  }

  /* =========================================================
     3D PHOTO FRAME ON RIGHT SIDE (ENLARGED & EASEL STAND)
     ========================================================= */
  createPhotoFrame() {
    this.photoFrameGroup = new THREE.Group();

    // Gold Ornate Beveled Outer Frame (Enlarged)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.15
    });
    const frameBorder = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.1, 0.14), frameMat);
    frameBorder.position.y = 2.4;
    frameBorder.castShadow = true;
    this.photoFrameGroup.add(frameBorder);

    // Tripod Easel Stand Legs (Floor to Frame)
    const legMat = new THREE.MeshStandardMaterial({ color: 0x3d2714, roughness: 0.5, metalness: 0.3 });
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 12);

    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.85, 1.4, -0.05);
    legL.rotation.z = 0.12;
    this.photoFrameGroup.add(legL);

    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.85, 1.4, -0.05);
    legR.rotation.z = -0.12;
    this.photoFrameGroup.add(legR);

    const legBack = new THREE.Mesh(legGeo, legMat);
    legBack.position.set(0, 1.4, -0.7);
    legBack.rotation.x = -0.32;
    this.photoFrameGroup.add(legBack);

    // Canvas Texture with celebrant portrait
    this.photoCanvas = document.createElement('canvas');
    this.photoCanvas.width = 512;
    this.photoCanvas.height = 680;
    this.drawDefaultPhotoTexture(null, 'Birthday Star', '');

    this.photoTexture = new THREE.CanvasTexture(this.photoCanvas);
    this.photoTexture.needsUpdate = true;

    const photoMat = new THREE.MeshStandardMaterial({
      map: this.photoTexture,
      roughness: 0.25,
      metalness: 0.1
    });

    this.photoPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.8), photoMat);
    this.photoPlane.position.set(0, 2.4, 0.08);
    this.photoPlane.userData = { type: 'photo-frame' };
    this.photoFrameGroup.add(this.photoPlane);

    // Glowing 3D "+" Add/Change Photo Badge on Top-Right Corner
    const badgeGroup = new THREE.Group();
    badgeGroup.position.set(1.05, 3.7, 0.2);

    const badgeOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x0088cc, roughness: 0.2 })
    );
    badgeGroup.add(badgeOrb);

    // 3D "+" symbol (cross)
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.08), crossMat);
    crossH.position.z = 0.26;
    badgeGroup.add(crossH);

    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), crossMat);
    crossV.position.z = 0.26;
    badgeGroup.add(crossV);

    badgeGroup.userData = { type: 'photo-frame' };
    this.photoFrameGroup.add(badgeGroup);
    this.photoBadge = badgeGroup;

    // Position on right side at 2x distance from cake (2x Size Scale)
    this.photoFrameGroup.scale.set(1.9, 1.9, 1.9);
    this.photoFrameGroup.position.set(12.5, 0.0, 1.0);
    this.photoFrameGroup.rotation.y = -Math.PI / 5.2;
    this.photoFrameGroup.rotation.x = -0.06;
    this.photoFrameGroup.userData = { type: 'photo-frame' };

    this.scene.add(this.photoFrameGroup);
  }

  /* =========================================================
     3D HAPPY BIRTHDAY STAND BOARD WITH HANGING LIGHTS (LEFT SIDE - 2X SIZE & 2X DISTANCE)
     ========================================================= */
  createStandBoardWithLights() {
    this.standBoardGroup = new THREE.Group();

    // Gold/Wood Ornate Frame
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.2
    });
    const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.2, 0.15), frameMat);
    boardFrame.position.y = 2.4;
    boardFrame.castShadow = true;
    this.standBoardGroup.add(boardFrame);

    // Tripod Easel Stand Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x3d2714, roughness: 0.5, metalness: 0.3 });
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 12);

    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.9, 1.4, -0.05);
    legL.rotation.z = 0.12;
    this.standBoardGroup.add(legL);

    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.9, 1.4, -0.05);
    legR.rotation.z = -0.12;
    this.standBoardGroup.add(legR);

    const legBack = new THREE.Mesh(legGeo, legMat);
    legBack.position.set(0, 1.4, -0.7);
    legBack.rotation.x = -0.32;
    this.standBoardGroup.add(legBack);

    // Canvas with "HAPPY BIRTHDAY" lettering
    this.boardCanvas = document.createElement('canvas');
    this.boardCanvas.width = 512;
    this.boardCanvas.height = 680;
    this.drawStandBoardTexture('Birthday Star', '');

    this.boardTex = new THREE.CanvasTexture(this.boardCanvas);
    const boardFaceMat = new THREE.MeshStandardMaterial({
      map: this.boardTex,
      roughness: 0.25,
      metalness: 0.15
    });

    const boardPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.9), boardFaceMat);
    boardPlane.position.set(0, 2.4, 0.085);
    this.standBoardGroup.add(boardPlane);

    // Hanging Multi-Colored Diwali Fairy Light String draped over the board
    const bulbColors = [0xff0044, 0xffd700, 0x00f2fe, 0x00e676, 0xb721ff, 0xff8c00];
    const bulbGeo = new THREE.SphereGeometry(0.1, 12, 12);

    for (let b = 0; b < 16; b++) {
      const t = b / 15;
      // Catenary drape from top-left to top-center to top-right and down sides
      let bx, by;
      if (t < 0.2) {
        // Left side drape
        bx = -1.25;
        by = 1.0 + (t / 0.2) * 2.8;
      } else if (t > 0.8) {
        // Right side drape
        bx = 1.25;
        by = 3.8 - ((t - 0.8) / 0.2) * 2.8;
      } else {
        // Top drooping arch
        const topT = (t - 0.2) / 0.6;
        bx = -1.25 + topT * 2.5;
        by = 3.8 - Math.sin(topT * Math.PI) * 0.45;
      }

      const col = bulbColors[b % bulbColors.length];
      const bulbMat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.9,
        roughness: 0.1
      });

      const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
      bulbMesh.position.set(bx, by, 0.18);
      this.standBoardGroup.add(bulbMesh);

      // Add into dynamic diwaliBulbs animation array
      if (this.diwaliBulbs) {
        this.diwaliBulbs.push({
          mat: bulbMat,
          baseColor: col,
          phase: Math.random() * Math.PI * 2,
          speed: 3 + Math.random() * 4
        });
      }
    }

    // Position on left side at 2x distance from cake (2x Size Scale)
    this.standBoardGroup.scale.set(1.9, 1.9, 1.9);
    this.standBoardGroup.position.set(-12.5, 0.0, 1.0);
    this.standBoardGroup.rotation.y = Math.PI / 5.2;
    this.standBoardGroup.rotation.x = -0.06;

    this.scene.add(this.standBoardGroup);
  }

  drawStandBoardTexture(name = 'My Love', age = '') {
    if (!this.boardCanvas) return;
    const ctx = this.boardCanvas.getContext('2d');

    // Romantic velvet wine & rose gradient
    const grad = ctx.createLinearGradient(0, 0, 512, 680);
    grad.addColorStop(0, '#380c25');
    grad.addColorStop(0.5, '#1e0514');
    grad.addColorStop(1, '#0c0208');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 680);

    // Rose gold filigree double border
    ctx.strokeStyle = '#ff758c';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 492, 660);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffd700';
    ctx.strokeRect(22, 22, 468, 636);

    // Celebratory Texts
    ctx.fillStyle = '#ff758c';
    ctx.font = '900 32px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💖 FOR THE QUEEN OF MY HEART 💖', 256, 95);

    ctx.font = '900 60px Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff758c';
    ctx.shadowBlur = 18;
    ctx.fillText('HAPPY', 256, 210);
    ctx.fillText('BIRTHDAY', 256, 285);
    ctx.shadowBlur = 0;

    // Gold divider ribbon with heart
    ctx.strokeStyle = '#ff758c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(80, 335);
    ctx.lineTo(432, 335);
    ctx.stroke();

    const nameUpper = (name || 'MY LOVE').toUpperCase();
    const parts = nameUpper.split(' ');
    ctx.fillStyle = '#ffd700';
    if (parts.length > 1) {
      ctx.font = '900 44px Outfit, sans-serif';
      ctx.fillText(parts[0], 256, 415);
      ctx.fillText(parts.slice(1).join(' '), 256, 480);
    } else {
      ctx.font = '900 48px Outfit, sans-serif';
      ctx.fillText(nameUpper, 256, 440);
    }

    ctx.fillStyle = '#ffb3c1';
    ctx.font = '700 30px Outfit, sans-serif';
    if (age && parseInt(age) > 0) {
      ctx.fillText(`👑 ${age} YEARS OF CUTENESS 👑`, 256, 570);
    } else {
      ctx.fillText(`👑 FOREVER & ALWAYS YOURS 👑`, 256, 570);
    }

    if (this.boardTex) this.boardTex.needsUpdate = true;
  }

  drawDefaultPhotoTexture(customImg = null, name = 'My Love', age = '') {
    if (!this.photoCanvas) return;
    const ctx = this.photoCanvas.getContext('2d');
    if (customImg && customImg.width > 0) {
      this.currentCustomPhotoImg = customImg;
      const imgAspect = customImg.width / customImg.height;
      const canvasAspect = 512 / 680;
      let sx = 0, sy = 0, sw = customImg.width, sh = customImg.height;
      if (imgAspect > canvasAspect) {
        sw = customImg.height * canvasAspect;
        sx = (customImg.width - sw) / 2;
      } else {
        sh = customImg.width / canvasAspect;
        sy = (customImg.height - sh) / 2;
      }
      ctx.drawImage(customImg, sx, sy, sw, sh, 0, 0, 512, 680);

      // Rose gold elegant border overlay
      ctx.strokeStyle = '#ff758c';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 498, 666);
      return;
    }

    // Default Romantic Celebratory Portrait Card (No photo uploaded)
    const grad = ctx.createLinearGradient(0, 0, 512, 680);
    grad.addColorStop(0, '#3d0f28');
    grad.addColorStop(0.5, '#200715');
    grad.addColorStop(1, '#0e020a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 680);

    // Rose Gold decorative border
    ctx.strokeStyle = '#ff758c';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 492, 660);

    // Celebratory Badge
    ctx.fillStyle = '#ff758c';
    ctx.font = 'bold 34px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💖 MY SWEETHEART 💖', 256, 90);

    // Glowing Heart circle
    ctx.beginPath();
    ctx.arc(256, 280, 140, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 117, 140, 0.18)';
    ctx.fill();
    ctx.strokeStyle = '#ff758c';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Heart Icon
    ctx.font = '90px sans-serif';
    ctx.fillText('💖', 256, 310);

    // Name & Age text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.fillText((name || 'MY LOVE').toUpperCase(), 256, 510);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 30px Outfit, sans-serif';
    if (age && parseInt(age) > 0) {
      ctx.fillText(`Sweet ${age} • Queen of My Heart`, 256, 565);
    } else {
      ctx.fillText('Queen of My Heart 💕', 256, 565);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '22px Outfit, sans-serif';
    ctx.fillText('Tap + to Add Her Photo 📸', 256, 625);
  }

  clearUserPhoto() {
    this.currentCustomPhotoImg = null;
    this.drawDefaultPhotoTexture(null, 'Birthday Star', '');
    if (this.photoTexture) this.photoTexture.needsUpdate = true;
  }

  updateCelebrantInfo3D(name, age) {
    this.drawStandBoardTexture(name, age);
    this.drawDefaultPhotoTexture(this.currentCustomPhotoImg, name, age);
    if (this.photoTexture) this.photoTexture.needsUpdate = true;
    if (this.boardTex) this.boardTex.needsUpdate = true;
    this.createNumericCandles(parseInt(age) || 22);
  }

  updateUserPhoto(imgElement) {
    if (!this.photoCanvas || !this.photoTexture) return;
    this.drawDefaultPhotoTexture(imgElement);
    this.photoTexture.needsUpdate = true;
    if (window.confetti) {
      window.confetti({ particleCount: 50, spread: 70, origin: { x: 0.75, y: 0.5 } });
    }
  }

  /* =========================================================
     3D BIRTHDAY CAKE (cake.glb) & CANDLES
     ========================================================= */
  createBirthdayCake() {
    const theme = this.themeColors[this.currentTheme];

    this.standMat = new THREE.MeshStandardMaterial({
      color: theme.plate,
      metalness: 0.85,
      roughness: 0.18
    });

    // Plate & Pedestal on Table
    const cakePlate = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.18, 48), this.standMat);
    cakePlate.position.y = 1.2;
    cakePlate.castShadow = true;
    cakePlate.receiveShadow = true;
    this.cakePlateMesh = cakePlate;
    this.cakeGroup.add(cakePlate);

    // Initial placeholder materials for theme updates and slice wedge
    this.cakeBaseMat = new THREE.MeshStandardMaterial({
      color: theme.cakeBase,
      roughness: 0.45,
      metalness: 0.05
    });
    this.cakeTopMat = new THREE.MeshStandardMaterial({
      color: theme.cakeTop,
      roughness: 0.4,
      metalness: 0.1
    });
    this.frostingMat = new THREE.MeshStandardMaterial({
      color: theme.frosting,
      roughness: 0.3,
      metalness: 0.15
    });

    this.proceduralCakeElements = [];
    this.cakeGlbModel = null;
    this.isCakeGlbLoaded = false;
    this.cakeGlbTopY = 5.37;

    // Load custom cake.glb model from workspace root
    const loadGlbCake = () => {
      if (typeof THREE.GLTFLoader === 'undefined') {
        console.warn('[Cake] THREE.GLTFLoader not available, using fallback cake');
        this.buildProceduralCakeFallback(theme);
        return;
      }

      const loader = new THREE.GLTFLoader();
      loader.load(
        'cake.glb',
        (gltf) => {
          const model = gltf.scene;
          this.cakeGlbModel = model;
          this.isCakeGlbLoaded = true;

          // Enable shadow casting and receiving on all meshes + enhance material
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.side = THREE.DoubleSide;
                if (child.material.roughness !== undefined) {
                  child.material.roughness = Math.min(child.material.roughness, 0.6);
                }
              }
            }
          });

          // Scale & position model precisely on the cake stand:
          // Model bounds: X [-0.752, 0.748], Y [-0.9515, 0.9480], Z [-0.752, 0.748]
          // Height = 1.8995, Diameter = 1.50
          // Scaling by 2.15: Height = 4.08, Diameter = 3.22 (fits on plate of radius 3.6)
          const cakeScale = 2.15;
          model.scale.set(cakeScale, cakeScale, cakeScale);

          // Plate is at y = 1.2, top surface is at y = 1.29
          const plateSurfaceY = 1.29;
          const posY = plateSurfaceY + 0.9515 * cakeScale;
          model.position.set(0, posY, 0);

          // Remove any temporary procedural fallback elements
          if (this.proceduralCakeElements && this.proceduralCakeElements.length > 0) {
            this.proceduralCakeElements.forEach((el) => {
              if (el.parent) el.parent.remove(el);
            });
            this.proceduralCakeElements = [];
          }

          this.cakeGroup.add(model);

          // Position candles right on top of the GLB cake
          const glbTopY = plateSurfaceY + 1.8995 * cakeScale;
          this.repositionCandles(glbTopY);

          if (this.cakeGlowLight) {
            this.cakeGlowLight.position.set(0, glbTopY + 1.0, 0);
          }

          console.log('✅ cake.glb loaded & mounted onto 3D scene successfully!');
        },
        undefined,
        (err) => {
          console.warn('[Cake GLB Loader Error]: Falling back to procedural cake', err);
          this.buildProceduralCakeFallback(theme);
        }
      );
    };

    loadGlbCake();

    // Numeric Candles "22"
    this.createNumericCandles(22);
    this.scene.add(this.cakeGroup);
  }

  buildProceduralCakeFallback(theme) {
    if (this.proceduralCakeElements && this.proceduralCakeElements.length > 0) return;
    const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 1.3, 48), this.cakeBaseMat);
    tier1.position.y = 1.95;
    tier1.castShadow = true;
    this.tier1Mesh = tier1;
    this.cakeGroup.add(tier1);
    this.proceduralCakeElements.push(tier1);

    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 1.1, 48), this.cakeTopMat);
    tier2.position.y = 3.15;
    tier2.castShadow = true;
    this.tier2Mesh = tier2;
    this.cakeGroup.add(tier2);
    this.proceduralCakeElements.push(tier2);
  }

  createNumericCandles(age = 22) {
    this.candles = [];
    this.flames = [];
    this.candleLights = [];

    const ageStr = String(age);
    const spacing = 0.85;
    const startX = -((ageStr.length - 1) * spacing) / 2;

    for (let i = 0; i < ageStr.length; i++) {
      const digitGroup = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.85,
        roughness: 0.18,
        emissive: 0x332200
      });

      // Candle Stick
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 12), mat);
      stick.position.y = 0.18;
      digitGroup.add(stick);

      // Torus ring for number '2'
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 12, 24), mat);
      ring.position.y = 0.7;
      digitGroup.add(ring);

      const topper = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), mat);
      topper.position.y = 1.08;
      digitGroup.add(topper);

      // Wick
      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      wick.position.y = 1.2;
      digitGroup.add(wick);

      // Large Glowing Outer Flame (Yellow-Orange)
      const flameGeo = new THREE.ConeGeometry(0.24, 0.65, 20);
      flameGeo.translate(0, 0.32, 0); // pivot at base
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0.95
      });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 1.25;
      flame.visible = false;
      digitGroup.add(flame);

      // Inner White-Hot Core Flame
      const coreGeo = new THREE.ConeGeometry(0.12, 0.42, 16);
      coreGeo.translate(0, 0.21, 0);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 1.25;
      core.visible = false;
      digitGroup.add(core);

      // Luminous Glow Halo around Flame
      const haloGeo = new THREE.SphereGeometry(0.38, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.y = 1.55;
      halo.visible = false;
      digitGroup.add(halo);

      // Dynamic Candle Point Light (High intensity golden glow)
      const candleLight = new THREE.PointLight(0xffaa00, 0, 8);
      candleLight.position.y = 1.55;
      digitGroup.add(candleLight);

      digitGroup.position.set(startX + i * spacing, this.cakeGlbTopY || 5.37, 0);
      this.cakeGroup.add(digitGroup);

      this.candles.push(digitGroup);
      this.flames.push({ flame, core, halo });
      this.candleLights.push(candleLight);
    }
  }

  repositionCandles(topY) {
    this.cakeGlbTopY = topY;
    if (this.candles && this.candles.length > 0) {
      this.candles.forEach(c => {
        c.position.y = topY;
      });
    }
  }

  /* =========================================================
     SATIN CLOTH DRAPE COVER ON CAKE
     ========================================================= */
  createClothCover() {
    // Royal Burgundy / Red Silk Satin Dome Drape (Sized for multi-tier cake.glb)
    const clothGeo = new THREE.CylinderGeometry(0.8, 3.6, 5.6, 48, 1, true);
    const clothMat = new THREE.MeshStandardMaterial({
      color: 0x800020, // Burgundy Satin
      roughness: 0.35,
      metalness: 0.4,
      side: THREE.DoubleSide
    });
    this.clothCover = new THREE.Mesh(clothGeo, clothMat);
    this.clothCover.position.set(0, 4.0, 0);
    this.clothCover.castShadow = true;

    // Gold Top Knob / Ribbon Knot on Cloth
    const knobMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), knobMat);
    knob.position.y = 2.85;
    this.clothCover.add(knob);

    // Gold Fringe Rim around bottom of Cloth
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.62, 0.08, 16, 48), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -2.75;
    this.clothCover.add(rim);

    this.scene.add(this.clothCover);
  }

  // Lift and Dissolve the Cloth Cover
  liftAndRemoveCloth(onCompleteCallback) {
    if (this.isClothRemoved || !this.clothCover) return;
    this.isClothRemoved = true;

    if (window.birthdayAudio) window.birthdayAudio.playGiftOpen();

    // Zoom Camera into the Cake Table (Focusing nicely on cake.glb)
    gsap.to(this.camera.position, {
      x: 0.00,
      y: 8.20,
      z: 19.50,
      duration: 1.6,
      ease: 'power2.inOut'
    });
    gsap.to(this.controls.target, {
      x: 0.00,
      y: 3.50,
      z: 0.00,
      duration: 1.6,
      ease: 'power2.inOut'
    });

    // Reveal the 4-5 Party Friends cheering behind the cake
    this.revealPartyFriends();

    // Trigger Magical Cake Aura & Fairy Dust Sparkle burst
    this.burstCakeAuraVFX();

    // Lift cloth upwards and fade away
    gsap.to(this.clothCover.position, {
      y: 13.5,
      duration: 1.8,
      ease: 'power2.out'
    });
    gsap.to(this.clothCover.rotation, {
      y: Math.PI * 0.7,
      duration: 1.8
    });
    gsap.to(this.clothCover.material, {
      opacity: 0,
      transparent: true,
      duration: 1.8,
      onComplete: () => {
        this.scene.remove(this.clothCover);
        if (onCompleteCallback) onCompleteCallback();
      }
    });

    // Confetti splash
    if (window.confetti) {
      window.confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
    }
  }

  /* =========================================================
     TABLE BALLOONS (5 Interactive Glowing Heart Balloons)
     ========================================================= */
  createHeartGeometry(scale = 1.0) {
    const shape = new THREE.Shape();
    const x = 0, y = 0;
    shape.moveTo(x, y + 0.35);
    shape.bezierCurveTo(x, y + 0.35, x - 0.35, y + 0.9, x - 0.75, y + 0.9);
    shape.bezierCurveTo(x - 1.2, y + 0.9, x - 1.2, y + 0.35, x - 1.2, y + 0.35);
    shape.bezierCurveTo(x - 1.2, y - 0.1, x - 0.6, y - 0.65, x, y - 1.15);
    shape.bezierCurveTo(x + 0.6, y - 0.65, x + 1.2, y - 0.1, x + 1.2, y + 0.35);
    shape.bezierCurveTo(x + 1.2, y + 0.35, x + 1.2, y + 0.9, x + 0.75, y + 0.9);
    shape.bezierCurveTo(x + 0.35, y + 0.9, x, y + 0.35, x, y + 0.35);

    const extrudeSettings = {
      depth: 0.42,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 2,
      bevelSize: 0.18,
      bevelThickness: 0.18
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    geometry.scale(scale * 0.85, scale * 0.85, scale * 0.85);
    return geometry;
  }

  createGlitterSparkleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const cx = 32, cy = 32;

    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
    radGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    radGrad.addColorStop(0.2, 'rgba(255, 235, 190, 0.95)');
    radGrad.addColorStop(0.5, 'rgba(255, 180, 205, 0.4)');
    radGrad.addColorStop(1, 'rgba(255, 110, 160, 0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 64, 64);

    // 4-point sparkle diamond rays
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx, 4); ctx.lineTo(cx, 60);
    ctx.moveTo(4, cy); ctx.lineTo(60, cy);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(12, 12); ctx.lineTo(52, 52);
    ctx.moveTo(12, 52); ctx.lineTo(52, 12);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }

  createGlitterBumpTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 128, 128);

    // Scatter 450 micro glitter speckles for sparkling physical powder shimmer
    for (let i = 0; i < 450; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      const r = Math.random() * 1.5 + 0.4;
      const bright = Math.floor(180 + Math.random() * 75);
      ctx.fillStyle = `rgb(${bright},${bright},${bright})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
  }

  createTableBalloons(count = 5) {
    if (this.tableBalloons && this.tableBalloons.length > 0) {
      this.tableBalloons.forEach(b => {
        if (b && b.parent) b.parent.remove(b);
      });
    }
    this.tableBalloons = [];
    this.tableBalloonsRemaining = count;

    // Pure Romantic Pink & Ruby Red Palette
    const heartColors = [
      0xff0054, // Vivid Pink-Red
      0xd90429, // Deep Passion Ruby Red
      0xff4d6d, // Romantic Hot Pink
      0xff0a54, // Crimson Rose Red
      0xff758c  // Glamorous Velvet Pink
    ];

    const heartGeo = this.createHeartGeometry(1.15);
    const glitterBumpTex = this.createGlitterBumpTexture();
    const glitterSparkleTex = this.createGlitterSparkleTexture();

    for (let i = 0; i < count; i++) {
      const col = heartColors[i % heartColors.length];

      // Physical metallic balloon material with physical glitter powder bump texture
      const mat = new THREE.MeshPhysicalMaterial({
        color: col,
        metalness: 0.52,
        roughness: 0.22,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        bumpMap: glitterBumpTex,
        bumpScale: 0.038,
        reflectivity: 0.9
      });

      const balloonMesh = new THREE.Mesh(heartGeo, mat);
      balloonMesh.castShadow = true;

      // Knot & String
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.18, 12), mat);
      knot.position.y = -1.0;
      knot.rotation.x = Math.PI;
      balloonMesh.add(knot);

      const stringPoints = [new THREE.Vector3(0, -1.0, 0), new THREE.Vector3(0.04, -2.6, 0)];
      const stringLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(stringPoints),
        new THREE.LineBasicMaterial({ color: 0xffcad4, opacity: 0.7, transparent: true })
      );
      balloonMesh.add(stringLine);

      // Placement circling around the cake table
      const angle = (i / count) * Math.PI * 2;
      const radius = 3.6 + (i % 2) * 0.4;
      const height = 3.2 + (i % 2) * 0.8;
      balloonMesh.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);

      // Sparkling Glitter Powder Halo Points Cloud around the heart balloon
      const glitterCount = 95;
      const glitterGeo = new THREE.BufferGeometry();
      const glitterPos = new Float32Array(glitterCount * 3);
      const glitterCols = new Float32Array(glitterCount * 3);
      const glitterPalette = [
        new THREE.Color(0xffffff),
        new THREE.Color(0xffd700),
        new THREE.Color(0xffe6a7),
        new THREE.Color(0xff85a1),
        new THREE.Color(0xffc2d1)
      ];

      for (let g = 0; g < glitterCount; g++) {
        const ga = Math.random() * Math.PI * 2;
        const gr = 0.5 + Math.random() * 0.65;
        const gy = (Math.random() - 0.4) * 1.5;
        const gz = (Math.random() - 0.5) * 0.65;

        glitterPos[g * 3] = Math.cos(ga) * gr;
        glitterPos[g * 3 + 1] = gy;
        glitterPos[g * 3 + 2] = gz;

        const gCol = glitterPalette[Math.floor(Math.random() * glitterPalette.length)];
        glitterCols[g * 3] = gCol.r;
        glitterCols[g * 3 + 1] = gCol.g;
        glitterCols[g * 3 + 2] = gCol.b;
      }

      glitterGeo.setAttribute('position', new THREE.BufferAttribute(glitterPos, 3));
      glitterGeo.setAttribute('color', new THREE.BufferAttribute(glitterCols, 3));

      const glitterMat = new THREE.PointsMaterial({
        size: 0.16,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        map: glitterSparkleTex,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const glitterPoints = new THREE.Points(glitterGeo, glitterMat);
      balloonMesh.add(glitterPoints);

      // Generous invisible spherical hitbox so tap/click never misses the balloon
      const hitboxGeo = new THREE.SphereGeometry(1.65, 10, 10);
      const hitboxMat = new THREE.MeshBasicMaterial({ visible: false, transparent: true, opacity: 0 });
      const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
      hitbox.userData = {
        type: 'table-balloon-hitbox',
        parentBalloon: balloonMesh
      };
      balloonMesh.add(hitbox);

      balloonMesh.userData = {
        type: 'table-balloon',
        baseAngle: angle,
        orbitRadius: radius,
        baseHeight: height,
        orbitSpeed: 0.45,
        floatSpeed: 1.4 + Math.random() * 0.4,
        wobbleOffset: Math.random() * 5,
        color: col,
        isPopped: false,
        glitterPoints: glitterPoints
      };

      this.scene.add(balloonMesh);
      this.tableBalloons.push(balloonMesh);
    }
  }

  createRosePetalsSystem() {
    this.petalsGroup = new THREE.Group();
    this.petalsData = [];

    const petalGeo = new THREE.PlaneGeometry(0.35, 0.45);
    const colors = [0xff0a54, 0xff4d6d, 0xff758c, 0xffb3c1];

    for (let i = 0; i < 90; i++) {
      const col = colors[i % colors.length];
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88
      });
      const petal = new THREE.Mesh(petalGeo, mat);
      const x = (Math.random() - 0.5) * 32;
      const y = Math.random() * 25 + 1;
      const z = (Math.random() - 0.5) * 32;
      petal.position.set(x, y, z);
      petal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.petalsGroup.add(petal);

      this.petalsData.push({
        mesh: petal,
        fallSpeed: 0.025 + Math.random() * 0.035,
        rotSpeedX: (Math.random() - 0.5) * 0.03,
        rotSpeedY: (Math.random() - 0.5) * 0.04,
        rotSpeedZ: (Math.random() - 0.5) * 0.03,
        swaySpeed: 1.2 + Math.random() * 1.5,
        swayAmp: 0.02 + Math.random() * 0.03,
        seed: Math.random() * 10
      });
    }

    this.scene.add(this.petalsGroup);
  }

  popTableBalloon(balloonMesh) {
    if (!balloonMesh || balloonMesh.userData.isPopped) return;
    balloonMesh.userData.isPopped = true;

    if (window.birthdayAudio) window.birthdayAudio.playBalloonPop();

    const popPos = balloonMesh.position.clone();
    const balloonColor = balloonMesh.userData.color;

    // Fragment Burst
    const fragmentGeo = new THREE.PlaneGeometry(0.15, 0.15);
    const fragments = [];

    for (let i = 0; i < 35; i++) {
      const fragMat = new THREE.MeshBasicMaterial({ color: balloonColor, side: THREE.DoubleSide });
      const frag = new THREE.Mesh(fragmentGeo, fragMat);
      frag.position.copy(popPos);

      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(1.5 + Math.random() * 2.5);

      frag.userData = { vel: dir, rotVel: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10) };
      this.scene.add(frag);
      fragments.push(frag);
    }

    const startTime = performance.now();
    const animateFragments = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed > 1.0) {
        fragments.forEach(f => this.scene.remove(f));
        return;
      }
      fragments.forEach(f => {
        f.position.addScaledVector(f.userData.vel, 0.03);
        f.userData.vel.y -= 0.05;
        f.rotation.x += f.userData.rotVel.x * 0.02;
        f.material.opacity = Math.max(0, 1 - elapsed);
      });
      requestAnimationFrame(animateFragments);
    };
    animateFragments();

    // Sparkling Glitter Powder Burst
    const glitterSparkleTex = this.createGlitterSparkleTexture();
    const glitterBurstCount = 45;
    const gbGeo = new THREE.BufferGeometry();
    const gbPos = new Float32Array(glitterBurstCount * 3);
    const gbVel = [];

    for (let i = 0; i < glitterBurstCount; i++) {
      gbPos[i * 3] = popPos.x;
      gbPos[i * 3 + 1] = popPos.y;
      gbPos[i * 3 + 2] = popPos.z;

      gbVel.push(new THREE.Vector3(
        (Math.random() - 0.5) * 3.5,
        (Math.random() - 0.2) * 3.5,
        (Math.random() - 0.5) * 3.5
      ));
    }

    gbGeo.setAttribute('position', new THREE.BufferAttribute(gbPos, 3));
    const gbMat = new THREE.PointsMaterial({
      size: 0.24,
      color: 0xffd700,
      map: glitterSparkleTex,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const gbPoints = new THREE.Points(gbGeo, gbMat);
    this.scene.add(gbPoints);

    const gbStartTime = performance.now();
    const animateGlitterBurst = () => {
      const elapsed = (performance.now() - gbStartTime) / 1000;
      if (elapsed > 1.2) {
        this.scene.remove(gbPoints);
        return;
      }
      const posAttr = gbGeo.attributes.position;
      for (let i = 0; i < glitterBurstCount; i++) {
        posAttr.array[i * 3] += gbVel[i].x * 0.035;
        posAttr.array[i * 3 + 1] += gbVel[i].y * 0.035;
        posAttr.array[i * 3 + 2] += gbVel[i].z * 0.035;
        gbVel[i].y -= 0.03;
      }
      posAttr.needsUpdate = true;
      gbMat.opacity = Math.max(0, 1 - elapsed / 1.2);
      requestAnimationFrame(animateGlitterBurst);
    };
    animateGlitterBurst();

    this.scene.remove(balloonMesh);
    this.tableBalloonsRemaining = Math.max(0, this.tableBalloonsRemaining - 1);

    if (window.confetti) {
      window.confetti({ particleCount: 30, spread: 60, origin: { y: 0.65 } });
    }

    if (window.onTableBalloonPopped) {
      window.onTableBalloonPopped(this.tableBalloonsRemaining);
    }
  }

  /* =========================================================
     LIGHT CANDLES ("BURN CANDLE")
     ========================================================= */
  lightCandles() {
    this.candlesLit = true;
    if (window.birthdayAudio) window.birthdayAudio.playSparklerCrackle();

    this.flames.forEach((item, idx) => {
      item.flame.visible = true;
      item.core.visible = true;
      if (item.halo) item.halo.visible = true;

      item.flame.scale.set(1, 1, 1);
      item.core.scale.set(1, 1, 1);
      if (item.halo) item.halo.scale.set(1, 1, 1);

      // Spawn 15 golden ignition sparks around each candle flame
      const sparkGeo = new THREE.SphereGeometry(0.04, 6, 6);
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
      for (let s = 0; s < 12; s++) {
        const spark = new THREE.Mesh(sparkGeo, sparkMat);
        const candleWorldPos = new THREE.Vector3();
        this.candles[idx].getWorldPosition(candleWorldPos);
        spark.position.set(
          candleWorldPos.x + (Math.random() - 0.5) * 0.2,
          candleWorldPos.y + 1.4 + Math.random() * 0.2,
          candleWorldPos.z + (Math.random() - 0.5) * 0.2
        );
        this.scene.add(spark);

        gsap.to(spark.position, {
          x: spark.position.x + (Math.random() - 0.5) * 0.8,
          y: spark.position.y + 0.6 + Math.random() * 0.5,
          z: spark.position.z + (Math.random() - 0.5) * 0.8,
          duration: 0.6 + Math.random() * 0.4,
          ease: 'power1.out',
          onComplete: () => this.scene.remove(spark)
        });
      }
    });

    this.candleLights.forEach(light => {
      gsap.to(light, { intensity: 2.5, duration: 0.4 });
    });

    // Trigger Candle Ignition Shockwave Ring VFX
    if (this.candles.length > 0) {
      const cPos = new THREE.Vector3();
      this.candles[0].getWorldPosition(cPos);
      cPos.y += 1.4;
      this.triggerCandleIgnitionVFX(cPos);
    }

    if (window.confetti) {
      window.confetti({ particleCount: 50, spread: 75, origin: { y: 0.55 } });
    }
  }

  /* =========================================================
     CUT THE CAKE & 3-SECOND MULTI-COLOR FIREWORKS + SONG
     ========================================================= */
  cutCakeAndCelebrate(onFinishedFireworks) {
    if (this.cakeIsCut) return;
    this.cakeIsCut = true;

    // Pause all rotation / orbiting for 2 seconds so celebrant can watch center cut
    this.isOrbitPaused = true;
    setTimeout(() => {
      this.isOrbitPaused = false;
    }, 2000);

    // 1. Chef's Golden Knife Animation - Directly in Dead Center Front
    if (!this.cakeKnife) {
      this.cakeKnife = new THREE.Group();

      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0xe0e0e0,
        metalness: 0.95,
        roughness: 0.1
      });
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.8, 0.4), bladeMat);
      blade.position.set(0, 0.9, 0);
      this.cakeKnife.add(blade);

      const handleMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.5 });
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.0, 16), handleMat);
      handle.position.set(0, 2.3, 0);
      this.cakeKnife.add(handle);

      this.scene.add(this.cakeKnife);
    }

    // Knife starts right in dead center front
    this.cakeKnife.position.set(0.0, 9.5, 2.0);
    this.cakeKnife.visible = true;

    gsap.timeline()
      .to(this.cakeKnife.position, {
        y: 1.8,
        duration: 0.6,
        ease: 'power2.in',
        onComplete: () => {
          // Trigger Slicing Spark Fountain VFX
          this.createKnifeSliceSparkFountain({ x: 0, y: 2.2, z: 1.5 });
        }
      })
      .to(this.cakeKnife.position, { y: 9.0, duration: 0.5, ease: 'power2.out', onComplete: () => {
        this.cakeKnife.visible = false;
      }})
      .add(() => {
        // 1. Cut the Main Cake directly in the DEAD CENTER FRONT (symmetrical 45° wedge gap)
        const gapHalf = Math.PI / 8; // 22.5 deg each side
        const centerAngle = Math.PI / 2; // 90 deg = dead center front (+Z)
        const cutStart = centerAngle - gapHalf; // 3π/8 (67.5 deg)
        const cutEnd = centerAngle + gapHalf;   // 5π/8 (112.5 deg)
        const remLen = Math.PI * 2 - (cutEnd - cutStart); // 7π/4 (315 deg)

        // Cut Bottom Tier (leaving center gap if procedural cake is active)
        if (!this.isCakeGlbLoaded && this.tier1Mesh && this.tier1Mesh.geometry) {
          try {
            this.tier1Mesh.geometry.dispose();
            this.tier1Mesh.geometry = new THREE.CylinderGeometry(2.8, 2.8, 1.3, 48, 1, false, cutEnd, remLen);
          } catch(e) {}
        }

        // Cut Top Tier (leaving center gap if procedural cake is active)
        if (!this.isCakeGlbLoaded && this.tier2Mesh && this.tier2Mesh.geometry) {
          try {
            this.tier2Mesh.geometry.dispose();
            this.tier2Mesh.geometry = new THREE.CylinderGeometry(1.8, 1.8, 1.1, 48, 1, false, cutEnd, remLen);
          } catch(e) {}
        }

        // --- FULLY COVER AND SEAL MAIN CAKE GAP WALLS WITH RICH CAKE LAYERS ---
        const spongeMat = new THREE.MeshStandardMaterial({ color: 0xffeedb, roughness: 0.75 });
        const fudgeMat = new THREE.MeshStandardMaterial({ color: 0x3d1f0d, roughness: 0.45 });
        const berryMat = new THREE.MeshStandardMaterial({ color: 0xc2185b, roughness: 0.55 });

        // A. Left Cut Wall (Tier 1 + Tier 2)
        // Spans from (0, y, 0) to (R * cos(cutEnd), y, R * sin(cutEnd))
        const leftWallGroup = new THREE.Group();
        leftWallGroup.position.set(0, 0, 0);
        leftWallGroup.rotation.y = -cutEnd + Math.PI / 2;

        // Tier 1 Left Sponge Wall
        const leftT1Sponge = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.3, 0.06), spongeMat);
        leftT1Sponge.position.set(1.4, 1.95, 0);
        leftWallGroup.add(leftT1Sponge);

        // Tier 1 Left Chocolate Fudge Layer
        const leftT1Fudge = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.16, 0.08), fudgeMat);
        leftT1Fudge.position.set(1.4, 1.95, 0);
        leftWallGroup.add(leftT1Fudge);

        // Tier 1 Left Berry Cream Layer
        const leftT1Berry = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 0.08), berryMat);
        leftT1Berry.position.set(1.4, 2.25, 0);
        leftWallGroup.add(leftT1Berry);

        // Tier 2 Left Sponge Wall
        const leftT2Sponge = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.06), spongeMat);
        leftT2Sponge.position.set(0.9, 3.15, 0);
        leftWallGroup.add(leftT2Sponge);

        // Tier 2 Left Chocolate Fudge Layer
        const leftT2Fudge = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.08), fudgeMat);
        leftT2Fudge.position.set(0.9, 3.15, 0);
        leftWallGroup.add(leftT2Fudge);

        // B. Right Cut Wall (Tier 1 + Tier 2)
        // Spans from (0, y, 0) to (R * cos(cutStart), y, R * sin(cutStart))
        const rightWallGroup = new THREE.Group();
        rightWallGroup.position.set(0, 0, 0);
        rightWallGroup.rotation.y = -cutStart + Math.PI / 2;

        // Tier 1 Right Sponge Wall
        const rightT1Sponge = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.3, 0.06), spongeMat);
        rightT1Sponge.position.set(1.4, 1.95, 0);
        rightWallGroup.add(rightT1Sponge);

        // Tier 1 Right Chocolate Fudge Layer
        const rightT1Fudge = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.16, 0.08), fudgeMat);
        rightT1Fudge.position.set(1.4, 1.95, 0);
        rightWallGroup.add(rightT1Fudge);

        // Tier 1 Right Berry Cream Layer
        const rightT1Berry = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 0.08), berryMat);
        rightT1Berry.position.set(1.4, 2.25, 0);
        rightWallGroup.add(rightT1Berry);

        // Tier 2 Right Sponge Wall
        const rightT2Sponge = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.06), spongeMat);
        rightT2Sponge.position.set(0.9, 3.15, 0);
        rightWallGroup.add(rightT2Sponge);

        // Tier 2 Right Chocolate Fudge Layer
        const rightT2Fudge = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.08), fudgeMat);
        rightT2Fudge.position.set(0.9, 3.15, 0);
        rightWallGroup.add(rightT2Fudge);

        // Center Apex Column (Sealing the inside corner)
        const centerPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 16), spongeMat);
        centerPillar.position.set(0, 2.5, 0);

        if (!this.isCakeGlbLoaded) {
          this.cakeGroup.add(leftWallGroup);
          this.cakeGroup.add(rightWallGroup);
          this.cakeGroup.add(centerPillar);
        }

        // --- 2. CREATE FULLY ENCLOSED & PACKED 3D CAKE SLICE WEDGE ---
        if (!this.cakeSliceGroup) {
          this.cakeSliceGroup = new THREE.Group();

          // Helper to create solid closed wedge geometry via 2D sector extrusion
          const createSolidWedge = (radius, height, mat) => {
            const shape = new THREE.Shape();
            shape.moveTo(0, 0);
            const segments = 16;
            for (let i = 0; i <= segments; i++) {
              const a = -gapHalf + (i / segments) * (2 * gapHalf);
              const px = radius * Math.sin(a);
              const py = radius * Math.cos(a);
              shape.lineTo(px, py);
            }
            shape.lineTo(0, 0);

            const extrudeSettings = {
              depth: height,
              bevelEnabled: true,
              bevelSegments: 2,
              steps: 1,
              bevelSize: 0.02,
              bevelThickness: 0.02
            };
            const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            geo.center();
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = Math.PI / 2;
            return mesh;
          };

          // Tier 1 Solid Enclosed Wedge
          const wedgeT1 = createSolidWedge(2.8, 1.3, this.cakeBaseMat);
          wedgeT1.position.set(0.0, 1.95, 1.3);
          wedgeT1.castShadow = true;
          this.cakeSliceGroup.add(wedgeT1);

          // Tier 1 Left Cut Face Sponge
          const sliceL1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.3, 0.05), spongeMat);
          sliceL1.position.set(0.55, 1.95, 1.3);
          sliceL1.rotation.y = gapHalf;
          this.cakeSliceGroup.add(sliceL1);

          const sliceLFudge1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.16, 0.06), fudgeMat);
          sliceLFudge1.position.set(0.55, 1.95, 1.3);
          sliceLFudge1.rotation.y = gapHalf;
          this.cakeSliceGroup.add(sliceLFudge1);

          // Tier 1 Right Cut Face Sponge
          const sliceR1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.3, 0.05), spongeMat);
          sliceR1.position.set(-0.55, 1.95, 1.3);
          sliceR1.rotation.y = -gapHalf;
          this.cakeSliceGroup.add(sliceR1);

          const sliceRFudge1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.16, 0.06), fudgeMat);
          sliceRFudge1.position.set(-0.55, 1.95, 1.3);
          sliceRFudge1.rotation.y = -gapHalf;
          this.cakeSliceGroup.add(sliceRFudge1);

          // Tier 2 Solid Enclosed Wedge
          const wedgeT2 = createSolidWedge(1.8, 1.1, this.cakeTopMat);
          wedgeT2.position.set(0.0, 3.15, 0.85);
          wedgeT2.castShadow = true;
          this.cakeSliceGroup.add(wedgeT2);

          // Tier 2 Left Cut Face Sponge
          const sliceL2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.05), spongeMat);
          sliceL2.position.set(0.35, 3.15, 0.85);
          sliceL2.rotation.y = gapHalf;
          this.cakeSliceGroup.add(sliceL2);

          // Tier 2 Right Cut Face Sponge
          const sliceR2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.05), spongeMat);
          sliceR2.position.set(-0.35, 3.15, 0.85);
          sliceR2.rotation.y = -gapHalf;
          this.cakeSliceGroup.add(sliceR2);

          // Glossy Fresh Strawberry on top of the slice
          const sliceBerry = new THREE.Mesh(
            new THREE.ConeGeometry(0.18, 0.35, 16),
            new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.3 })
          );
          sliceBerry.position.set(0.0, 3.82, 1.2);
          sliceBerry.rotation.x = Math.PI;
          this.cakeSliceGroup.add(sliceBerry);

          // Mini Gold Serving Plate with lip
          const miniPlate = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.5, 0.12, 32), this.standMat);
          miniPlate.position.set(0.0, 1.25, 1.4);
          miniPlate.castShadow = true;
          this.cakeSliceGroup.add(miniPlate);

          this.scene.add(this.cakeSliceGroup);
        }

        // Slide the completely packed slice smoothly forward and to the side onto the table
        gsap.to(this.cakeSliceGroup.position, {
          x: 3.8,
          z: 3.2,
          duration: 1.4,
          ease: 'power2.out'
        });
        gsap.to(this.cakeSliceGroup.rotation, {
          y: -Math.PI / 8,
          duration: 1.4,
          ease: 'power2.out'
        });

        // 2. Smoothly Tilt Camera towards the Sky for Fireworks
        gsap.to(this.camera.position, {
          x: 0.00,
          y: 15.5,
          z: 34.0,
          duration: 2.0,
          ease: 'power2.inOut'
        });
        gsap.to(this.controls.target, {
          x: 0.00,
          y: 13.5,
          z: 0.00,
          duration: 2.0,
          ease: 'power2.inOut'
        });

        // 3. Start Audience Applause, Cheering & Happy Birthday Song
        if (window.birthdayAudio) {
          window.birthdayAudio.playApplauseAndCheer();
          if (!window.birthdayAudio.isPlayingMusic) {
            window.birthdayAudio.playBirthdaySong();
          }
          const wave = document.getElementById('sound-wave');
          if (wave) wave.classList.add('playing');
        }

        // Friends behind cake start clapping enthusiastically
        if (this.partyFriends) {
          this.partyFriends.forEach(f => { f.userData.isClapping = true; });
        }

        // 4. Start 3D Multi-Color Particle Fireworks & Firecrackers Video
        this.launchCelebrationFireworkShow(10);
        this.playGreenScreenFirecrackers(null, () => {
          // Firecrackers have completely finished -> NOW smoothly return camera to celebration angle (mobile vs desktop)
          const grandCam = this.getCelebrationCameraCoords();
          gsap.to(this.camera.position, {
            x: grandCam.pos.x,
            y: grandCam.pos.y,
            z: grandCam.pos.z,
            duration: 1.6,
            ease: 'power2.inOut'
          });
          gsap.to(this.controls.target, {
            x: grandCam.target.x,
            y: grandCam.target.y,
            z: grandCam.target.z,
            duration: 1.6,
            ease: 'power2.inOut',
            onComplete: () => {
              // Wait 2 seconds at normal angle before offering Open Gift
              setTimeout(() => {
                if (onFinishedFireworks) onFinishedFireworks();
              }, 2000);
            }
          });
        });

        // 5. Celebration Banner
        const banner = document.getElementById('celebration-banner');
        if (banner) {
          banner.classList.add('active');
          setTimeout(() => banner.classList.remove('active'), 5000);
        }

        // 6. Confetti Rain
        if (window.confetti) {
          window.confetti({ particleCount: 60, spread: 100, origin: { x: 0.5, y: 0.5 } });
        }
      });
  }

  /* =========================================================
     REAL FIRECRACKERS VIDEO & AUDIO CELEBRATION (EXCLUSIVELY VIDEO)
     ========================================================= */
  start3SecondFirecrackers(onComplete = null) {
    // 1. Tilt Camera upwards towards the Sky for Fireworks view
    gsap.to(this.camera.position, {
      x: 0.00,
      y: 15.5,
      z: 34.0,
      duration: 1.5,
      ease: 'power2.inOut'
    });
    gsap.to(this.controls.target, {
      x: 0.00,
      y: 13.5,
      z: 0.00,
      duration: 1.5,
      ease: 'power2.inOut'
    });

    // 2. Play 3D Multi-Color Fireworks Show & Real Firecrackers Video
    this.launchCelebrationFireworkShow(8);
    this.playGreenScreenFirecrackers(null, () => {
      // 3. Firecrackers finished -> Smoothly return camera to celebration angle
      const grandCam = this.getCelebrationCameraCoords();
      gsap.to(this.camera.position, {
        x: grandCam.pos.x,
        y: grandCam.pos.y,
        z: grandCam.pos.z,
        duration: 1.6,
        ease: 'power2.inOut'
      });
      gsap.to(this.controls.target, {
        x: grandCam.target.x,
        y: grandCam.target.y,
        z: grandCam.target.z,
        duration: 1.6,
        ease: 'power2.inOut',
        onComplete: () => {
          if (onComplete) onComplete();
        }
      });
    });

    // 4. Celebratory Confetti Rain
    if (window.confetti) {
      window.confetti({
        particleCount: 60,
        spread: 100,
        origin: { x: 0.5, y: 0.5 }
      });
    }
  }

  launchFirework(onComplete = null) {
    this.start3SecondFirecrackers(onComplete);
  }

  /* =========================================================
     3D SURPRISE GIFT BOX
     ========================================================= */
  createSurpriseGift() {
    this.giftGroup = new THREE.Group();
    const theme = this.themeColors[this.currentTheme];

    this.giftBoxMat = new THREE.MeshStandardMaterial({ color: theme.giftBox, roughness: 0.3, metalness: 0.4 });
    const boxBase = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 2.0), this.giftBoxMat);
    boxBase.position.y = 0.9;
    boxBase.castShadow = true;
    boxBase.userData = { type: 'gift' };
    this.giftGroup.add(boxBase);

    this.giftRibbonMat = new THREE.MeshStandardMaterial({ color: theme.giftRibbon, roughness: 0.2, metalness: 0.8 });
    const ribbonV = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.82, 2.02), this.giftRibbonMat);
    ribbonV.position.y = 0.9;
    ribbonV.userData = { type: 'gift' };
    this.giftGroup.add(ribbonV);

    const ribbonH = new THREE.Mesh(new THREE.BoxGeometry(2.02, 1.82, 0.35), this.giftRibbonMat);
    ribbonH.position.y = 0.9;
    ribbonH.userData = { type: 'gift' };
    this.giftGroup.add(ribbonH);

    this.giftLid = new THREE.Group();
    this.giftLid.position.set(0, 1.8, 0);

    const lidTop = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.35, 2.15), this.giftBoxMat);
    lidTop.position.y = 0.175;
    lidTop.castShadow = true;
    lidTop.userData = { type: 'gift' };
    this.giftLid.add(lidTop);

    const lidRibbonV = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.37, 2.17), this.giftRibbonMat);
    lidRibbonV.position.y = 0.175;
    lidRibbonV.userData = { type: 'gift' };
    this.giftLid.add(lidRibbonV);

    const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), this.giftRibbonMat);
    bowKnot.position.y = 0.45;
    bowKnot.userData = { type: 'gift' };
    this.giftLid.add(bowKnot);

    for (let i = 0; i < 4; i++) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.08, 12, 24), this.giftRibbonMat);
      loop.position.set(0, 0.5, 0);
      loop.rotation.y = (i * Math.PI) / 2;
      loop.rotation.x = Math.PI / 4;
      loop.userData = { type: 'gift' };
      this.giftLid.add(loop);
    }

    this.giftGroup.add(this.giftLid);
    this.giftGroup.position.set(5.5, 0, 3.5);
    this.giftGroup.rotation.y = -Math.PI / 6;
    this.scene.add(this.giftGroup);
  }

  presentGiftBoxToCenter(onPresentedCallback) {
    if (this.giftPresented || this.giftOpened) return;
    this.giftPresented = true;

    if (window.birthdayAudio) window.birthdayAudio.playGiftOpen();

    // Lift and smoothly fly gift box directly to front center
    gsap.to(this.giftGroup.position, {
      x: 0.0,
      y: 5.2,
      z: 14.0,
      duration: 1.6,
      ease: 'back.out(1.3)'
    });
    gsap.to(this.giftGroup.scale, {
      x: 1.5,
      y: 1.5,
      z: 1.5,
      duration: 1.6,
      ease: 'back.out(1.3)'
    });
    gsap.to(this.giftGroup.rotation, {
      x: 0.2,
      y: 0.4,
      z: 0.0,
      duration: 1.6,
      ease: 'power2.out',
      onComplete: () => {
        if (onPresentedCallback) onPresentedCallback();
      }
    });

    if (window.confetti) {
      window.confetti({ particleCount: 40, spread: 70, origin: { x: 0.5, y: 0.45 } });
    }
  }

  openGift() {
    if (this.giftOpened) return;
    this.giftOpened = true;

    // Hide tap gift card if present
    const tapCard = document.getElementById('tap-gift-card');
    if (tapCard) tapCard.classList.add('hidden');

    if (window.birthdayAudio) window.birthdayAudio.playGiftOpen();

    gsap.to(this.giftGroup.rotation, {
      z: 0.2, yoyo: true, repeat: 4, duration: 0.08,
      onComplete: () => {
        // 1. Lid pops off excitedly
        gsap.to(this.giftLid.position, { y: 6.0, x: 2.0, z: 2.5, duration: 0.8, ease: 'power2.out' });
        gsap.to(this.giftLid.rotation, { x: 1.8, z: -1.6, duration: 0.8 });
        this.spawnGiftStars();

        // 2. Launch celebratory fireworks in background
        this.start3SecondFirecrackers();

        // 3. Show Birthday Wish Greeting Modal
        setTimeout(() => {
          const giftModal = document.getElementById('gift-modal');
          if (giftModal) giftModal.classList.add('show');
        }, 500);

        // 4. Smoothly glide the open gift box back to its original spot on stage
        setTimeout(() => {
          gsap.to(this.giftGroup.position, {
            x: 5.5,
            y: 0.0,
            z: 3.5,
            duration: 1.8,
            ease: 'power2.inOut'
          });
          gsap.to(this.giftGroup.scale, {
            x: 1.0,
            y: 1.0,
            z: 1.0,
            duration: 1.8,
            ease: 'power2.inOut'
          });
          gsap.to(this.giftGroup.rotation, {
            x: 0.0,
            y: -Math.PI / 6,
            z: 0.0,
            duration: 1.8,
            ease: 'power2.inOut'
          });
          // Gently land the detached open lid beside the box
          gsap.to(this.giftLid.position, {
            x: 1.6,
            y: 0.2,
            z: 0.8,
            duration: 1.8,
            ease: 'power2.inOut'
          });
          gsap.to(this.giftLid.rotation, {
            x: 0.35,
            y: 0.6,
            z: -0.2,
            duration: 1.8,
            ease: 'power2.inOut'
          });
        }, 1200);
      }
    });
  }

  spawnGiftStars() {
    const starGeo = new THREE.OctahedronGeometry(0.2, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

    for (let i = 0; i < 30; i++) {
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(this.giftGroup.position.x, this.giftGroup.position.y + 1.5, this.giftGroup.position.z);
      this.scene.add(star);

      gsap.to(star.position, {
        x: star.position.x + (Math.random() - 0.5) * 4,
        y: star.position.y + 2.5 + Math.random() * 3,
        z: star.position.z + (Math.random() - 0.5) * 4,
        duration: 1.2 + Math.random() * 0.5,
        ease: 'power2.out'
      });
      gsap.to(star.rotation, { x: Math.random() * 8, y: Math.random() * 8, duration: 1.5 });
      gsap.to(star.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 1.5, onComplete: () => this.scene.remove(star) });
    }
  }

  /* =========================================================
     3D DISCO BALL
     ========================================================= */
  createDiscoBall() {
    this.discoBallGroup = new THREE.Group();
    const ballGeo = new THREE.IcosahedronGeometry(1.6, 4);
    const mirrorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.08,
      flatShading: true,
      emissive: 0x222222
    });
    this.discoSphere = new THREE.Mesh(ballGeo, mirrorMat);
    this.discoSphere.castShadow = true;
    this.discoBallGroup.add(this.discoSphere);

    const chainMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 20, 8), chainMat);
    chain.position.y = 10;
    this.discoBallGroup.add(chain);

    this.discoGlow = new THREE.PointLight(0xffffff, 0, 18);
    this.discoBallGroup.add(this.discoGlow);

    const beamColors = [0xff007f, 0x00f2fe, 0xffd700, 0xb721ff];
    this.discoSpotlights = [];
    for (let i = 0; i < 4; i++) {
      const spot = new THREE.SpotLight(beamColors[i], 0, 35, Math.PI / 5, 0.3, 1.2);
      spot.position.set(0, 0, 0);
      this.discoBallGroup.add(spot);
      this.scene.add(spot.target);
      this.discoSpotlights.push(spot);
    }

    const facetGeo = new THREE.SphereGeometry(0.12, 6, 6);
    this.discoFacetDots = new THREE.Group();
    this.facetPoints = [];

    for (let i = 0; i < 70; i++) {
      const dotColor = beamColors[i % beamColors.length];
      const dotMat = new THREE.MeshBasicMaterial({ color: dotColor, transparent: true, opacity: 0 });
      const dotMesh = new THREE.Mesh(facetGeo, dotMat);
      
      const phi = Math.acos(-1 + (2 * i) / 70);
      const theta = Math.sqrt(70 * Math.PI) * phi;
      const radius = 7 + Math.random() * 8;

      dotMesh.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        Math.random() * 12 - 1,
        radius * Math.sin(phi) * Math.sin(theta)
      );

      this.discoFacetDots.add(dotMesh);
      this.facetPoints.push({ mesh: dotMesh, mat: dotMat });
    }
    this.scene.add(this.discoFacetDots);

    this.discoBallGroup.position.set(0, 28, 0);
    this.scene.add(this.discoBallGroup);
  }

  toggleDiscoMode() {
    this.isDiscoActive = !this.isDiscoActive;
    const body = document.body;

    if (this.isDiscoActive) {
      body.classList.add('disco-active');
      gsap.to(this.discoBallGroup.position, { y: 7.2, duration: 1.8, ease: 'bounce.out' });
      gsap.to(this.discoGlow, { intensity: 3.5, duration: 1.2 });
      this.discoSpotlights.forEach(spot => gsap.to(spot, { intensity: 5.0, duration: 1.2 }));
      this.facetPoints.forEach(p => gsap.to(p.mat, { opacity: 0.85, duration: 1.0 }));

      if (window.birthdayAudio) window.birthdayAudio.toggleDiscoBeat(true);
      gsap.to(this.camera.position, { y: 9, z: 24, duration: 1.5, ease: 'power2.out' });
      gsap.to(this.controls.target, { y: 4, duration: 1.5 });
    } else {
      body.classList.remove('disco-active');
      gsap.to(this.discoBallGroup.position, { y: 28, duration: 1.4, ease: 'power2.in' });
      gsap.to(this.discoGlow, { intensity: 0, duration: 0.6 });
      this.discoSpotlights.forEach(spot => gsap.to(spot, { intensity: 0, duration: 0.6 }));
      this.facetPoints.forEach(p => gsap.to(p.mat, { opacity: 0, duration: 0.6 }));

      if (window.birthdayAudio) window.birthdayAudio.toggleDiscoBeat(false);
      gsap.to(this.camera.position, { y: 7.5, z: 21, duration: 1.2 });
      gsap.to(this.controls.target, { y: 2.5, duration: 1.2 });
    }
    return this.isDiscoActive;
  }

  /* =========================================================
     3D CONFETTI (Continuous square rain removed per user request)
     ========================================================= */
  createConfettiStorm() {
    this.confettiList = [];
    // Continuous square falling confetti completely disabled per user request
  }

  /* =========================================================
     RAYCASTING & INTERACTION (BALLOON POPPING & TAP-AND-HOLD GESTURE)
     ========================================================= */

  /**
   * 100% Reliable Table Balloon Popper:
   * 1. 3D Raycasting against unpopped balloons and their generous hitboxes
   * 2. High-precision 2D Screen-space Proximity Fallback for touch & click
   */
  findAndPopTappedBalloon(clientX, clientY) {
    if (!this.tableBalloons || this.tableBalloons.length === 0) return false;
    const activeBalloons = this.tableBalloons.filter(b => b && b.userData && !b.userData.isPopped);
    if (activeBalloons.length === 0) return false;

    const rect = this.renderer.domElement.getBoundingClientRect();

    // 1. Raycast specifically against active balloons and their hitboxes
    const mouseNDC = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    const balloonRaycaster = new THREE.Raycaster();
    balloonRaycaster.setFromCamera(mouseNDC, this.camera);
    const intersects = balloonRaycaster.intersectObjects(activeBalloons, true);

    if (intersects.length > 0) {
      let target = intersects[0].object;
      if (target.userData && target.userData.parentBalloon) {
        target = target.userData.parentBalloon;
      } else {
        while (target && target.parent && target.parent !== this.scene) {
          if (target.userData && target.userData.type === 'table-balloon') break;
          target = target.parent;
        }
      }
      if (target && target.userData && target.userData.type === 'table-balloon' && !target.userData.isPopped) {
        this.popTableBalloon(target);
        return true;
      }
    }

    // 2. High-reliability 2D Screen-space Proximity Fallback
    // Computes projected screen positions of unpopped balloons and checks proximity to tap/click point
    let closestBalloon = null;
    let minDistance = Infinity;
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const maxThreshold = isTouch ? 72 : 52; // Generous tap radius in pixels

    for (const b of activeBalloons) {
      const worldPos = new THREE.Vector3();
      b.getWorldPosition(worldPos);

      // Project 3D position to 2D NDC and convert to viewport pixels
      const projected = worldPos.clone().project(this.camera);

      // Only check balloons in front of the camera
      if (projected.z < 1) {
        const screenX = ((projected.x + 1) / 2) * rect.width + rect.left;
        const screenY = ((-projected.y + 1) / 2) * rect.height + rect.top;
        const dist = Math.hypot(clientX - screenX, clientY - screenY);

        if (dist < minDistance) {
          minDistance = dist;
          closestBalloon = b;
        }
      }
    }

    if (closestBalloon && minDistance <= maxThreshold) {
      this.popTableBalloon(closestBalloon);
      return true;
    }

    return false;
  }

  popDecorBalloon(balloonMesh) {
    if (!balloonMesh || balloonMesh.userData.isPopped) return;
    balloonMesh.userData.isPopped = true;

    if (window.birthdayAudio) window.birthdayAudio.playBalloonPop();
    const popPos = new THREE.Vector3();
    balloonMesh.getWorldPosition(popPos);
    const balloonColor = balloonMesh.userData.color || 0xff0054;

    // Fragment Burst
    const fragmentGeo = new THREE.PlaneGeometry(0.18, 0.18);
    const fragments = [];
    for (let i = 0; i < 30; i++) {
      const fragMat = new THREE.MeshBasicMaterial({ color: balloonColor, side: THREE.DoubleSide });
      const frag = new THREE.Mesh(fragmentGeo, fragMat);
      frag.position.copy(popPos);
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(1.8 + Math.random() * 2.2);
      frag.userData = { vel: dir, rotVel: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10) };
      this.scene.add(frag);
      fragments.push(frag);
    }

    const startTime = performance.now();
    const animateFragments = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed > 1.0) {
        fragments.forEach(f => this.scene.remove(f));
        return;
      }
      fragments.forEach(f => {
        f.position.addScaledVector(f.userData.vel, 0.03);
        f.userData.vel.y -= 0.05;
        f.rotation.x += f.userData.rotVel.x * 0.02;
        f.material.opacity = Math.max(0, 1 - elapsed);
      });
      requestAnimationFrame(animateFragments);
    };
    animateFragments();

    // Glitter powder burst
    const glitterSparkleTex = this.createGlitterSparkleTexture();
    const gbBurstCount = 35;
    const gbGeo = new THREE.BufferGeometry();
    const gbPos = new Float32Array(gbBurstCount * 3);
    const gbVel = [];
    for (let i = 0; i < gbBurstCount; i++) {
      gbPos[i * 3] = popPos.x;
      gbPos[i * 3 + 1] = popPos.y;
      gbPos[i * 3 + 2] = popPos.z;
      gbVel.push(new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.2) * 3, (Math.random() - 0.5) * 3));
    }
    gbGeo.setAttribute('position', new THREE.BufferAttribute(gbPos, 3));
    const gbMat = new THREE.PointsMaterial({
      size: 0.22,
      color: 0xffd700,
      map: glitterSparkleTex,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const gbPoints = new THREE.Points(gbGeo, gbMat);
    this.scene.add(gbPoints);
    const gbStart = performance.now();
    const animGb = () => {
      const el = (performance.now() - gbStart) / 1000;
      if (el > 1.0) {
        this.scene.remove(gbPoints);
        return;
      }
      const pAttr = gbGeo.attributes.position;
      for (let i = 0; i < gbBurstCount; i++) {
        pAttr.array[i * 3] += gbVel[i].x * 0.035;
        pAttr.array[i * 3 + 1] += gbVel[i].y * 0.035;
        pAttr.array[i * 3 + 2] += gbVel[i].z * 0.035;
        gbVel[i].y -= 0.03;
      }
      pAttr.needsUpdate = true;
      gbMat.opacity = Math.max(0, 1 - el);
      requestAnimationFrame(animGb);
    };
    animGb();

    if (balloonMesh.parent) balloonMesh.parent.remove(balloonMesh);
    if (window.confetti) window.confetti({ particleCount: 25, spread: 50, origin: { y: 0.5 } });
  }

  clearHoldTimer() {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  onPointerDown(event) {
    this.isPointerDown = true;
    this.pointerStartPos = { x: event.clientX, y: event.clientY };
    this.pointerLastPos = { x: event.clientX, y: event.clientY };
    this.isHoldGestureActive = false;

    // 1. First priority: Check if user tapped any table balloon
    const popped = this.findAndPopTappedBalloon(event.clientX, event.clientY);
    if (popped) {
      this.clearHoldTimer();
      return;
    }

    // 2. Second priority: Check other interactive objects (gift box, photo frame, decor heart balloons)
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      let hitObj = intersects[0].object;
      while (hitObj.parent && hitObj.parent !== this.scene) {
        if (hitObj.userData && (hitObj.userData.type === 'gift' || hitObj.userData.type === 'photo-frame' || hitObj.userData.type === 'decor-balloon' || hitObj.userData.type === 'decor-balloon-hitbox')) {
          break;
        }
        hitObj = hitObj.parent;
      }

      if (hitObj.userData && (hitObj.userData.type === 'decor-balloon' || hitObj.userData.type === 'decor-balloon-hitbox')) {
        const balloonTarget = hitObj.userData.parentBalloon || hitObj;
        this.popDecorBalloon(balloonTarget);
        this.clearHoldTimer();
        return;
      } else if (hitObj.userData && hitObj.userData.type === 'gift') {
        this.openGift();
        this.clearHoldTimer();
        return;
      } else if (hitObj.userData && hitObj.userData.type === 'photo-frame') {
        const inputPhoto = document.getElementById('input-photo');
        if (inputPhoto) {
          setTimeout(() => { inputPhoto.click(); }, 50);
        }
        this.clearHoldTimer();
        return;
      }
    }

    // 3. Neither balloon nor interactive object hit:
    // Start tap-and-hold timer. Screen will ONLY rotate if user holds for > 220ms and then drags
    this.clearHoldTimer();
    this.holdTimer = setTimeout(() => {
      if (this.isPointerDown) {
        this.isHoldGestureActive = true;
        if (this.renderer && this.renderer.domElement) {
          this.renderer.domElement.style.cursor = 'grabbing';
        }
      }
    }, 220);
  }

  onPointerMove(event) {
    if (this.sparklerActive) {
      if (window.birthdayAudio && Math.random() < 0.2) window.birthdayAudio.playSparklerCrackle();

      const canvas = document.getElementById('sparkler-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        for (let i = 0; i < 6; i++) {
          const radius = Math.random() * 25;
          const angle = Math.random() * Math.PI * 2;
          ctx.fillStyle = Math.random() > 0.3 ? '#ffd700' : '#ffffff';
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 10;
          ctx.fillRect(event.clientX + Math.cos(angle) * radius, event.clientY + Math.sin(angle) * radius, 3, 3);
        }
      }
    }

    if (!this.isPointerDown) return;

    const deltaX = event.clientX - this.pointerLastPos.x;
    const deltaY = event.clientY - this.pointerLastPos.y;
    const totalDist = Math.hypot(event.clientX - this.pointerStartPos.x, event.clientY - this.pointerStartPos.y);

    // If moved significantly before the hold timer finished, cancel hold (it's a swipe, not tap-and-hold)
    if (!this.isHoldGestureActive && totalDist > 16) {
      this.clearHoldTimer();
    }

    // ONLY rotate the screen if the user has performed the intentional Tap-and-Hold gesture
    if (this.isHoldGestureActive && this.controls) {
      const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);

      spherical.theta -= deltaX * 0.0055;
      spherical.phi -= deltaY * 0.0055;

      // Keep camera within safe polar angle bounds (above floor and not flipping over top)
      const minPolar = 0.15;
      const maxPolar = Math.PI / 2 + 0.05;
      spherical.phi = Math.max(minPolar, Math.min(maxPolar, spherical.phi));

      offset.setFromSpherical(spherical);
      this.camera.position.addVectors(this.controls.target, offset);
      this.camera.lookAt(this.controls.target);
    }

    this.pointerLastPos = { x: event.clientX, y: event.clientY };
  }

  onPointerUp(event) {
    this.clearHoldTimer();

    // If hold gesture was not active, this was a clean tap or click
    if (!this.isHoldGestureActive && this.isPointerDown) {
      const dist = Math.hypot(event.clientX - this.pointerStartPos.x, event.clientY - this.pointerStartPos.y);
      // Clean tap failsafe check to pop balloon
      if (dist < 20) {
        this.findAndPopTappedBalloon(event.clientX, event.clientY);
      }
    }

    this.isPointerDown = false;
    this.isHoldGestureActive = false;
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  setCameraView(viewName) {
    const duration = 1.2;
    if (viewName === 'orbit') {
      const grandCam = this.getCelebrationCameraCoords();
      gsap.to(this.camera.position, { x: grandCam.pos.x, y: grandCam.pos.y, z: grandCam.pos.z, duration, ease: 'power2.inOut' });
      gsap.to(this.controls.target, { x: grandCam.target.x, y: grandCam.target.y, z: grandCam.target.z, duration, ease: 'power2.inOut' });
    } else if (viewName === 'cake') {
      gsap.to(this.camera.position, { x: 0.00, y: 7.31, z: 18.45, duration, ease: 'power2.inOut' });
      gsap.to(this.controls.target, { x: 0.00, y: 2.80, z: 0.00, duration, ease: 'power2.inOut' });
    } else if (viewName === 'gift') {
      gsap.to(this.camera.position, { x: 7.5, y: 3.2, z: 6.5, duration, ease: 'power2.inOut' });
      gsap.to(this.controls.target, { x: 5.5, y: 1.0, z: 3.5, duration, ease: 'power2.inOut' });
    } else if (viewName === 'fireworks') {
      gsap.to(this.camera.position, { x: 0, y: 14, z: 26, duration, ease: 'power2.inOut' });
      gsap.to(this.controls.target, { x: 0, y: 12, z: 0, duration, ease: 'power2.inOut' });
      this.start3SecondFirecrackers();
    }
  }

  setTheme(themeName) {
    this.currentTheme = themeName;
    const theme = this.themeColors[themeName];
    if (!theme) return;

    if (this.cakeBaseMat) this.cakeBaseMat.color.setHex(theme.cakeBase);
    if (this.cakeTopMat) this.cakeTopMat.color.setHex(theme.cakeTop);
    if (this.frostingMat) this.frostingMat.color.setHex(theme.frosting);
    if (this.standMat) this.standMat.color.setHex(theme.plate);
    if (this.stageRingMat) this.stageRingMat.color.setHex(theme.plateTrim);

    if (this.giftBoxMat) this.giftBoxMat.color.setHex(theme.giftBox);
    if (this.giftRibbonMat) this.giftRibbonMat.color.setHex(theme.giftRibbon);
    if (this.cakeGlowLight) this.cakeGlowLight.color.setHex(theme.lightGlow);

    if (this.vfxAuraRing && theme.lightGlow) {
      this.vfxAuraRing.material.color.setHex(theme.lightGlow);
    }
  }

  /* =========================================================
     CINEMATIC VFX SUITE (4-IN-1 SPECIAL EFFECTS ENGINE)
     1. Magical Golden Aura & Fairy Dust Sparkles (Around 3D Cake)
     2. Grand Multi-Color 3D Particle Fireworks & Slicing Sparks
     3. Candle Smoke Wisps & Flickering Flame Shockwave
     4. Ambient Floating Bokeh Lights & Night Sky Star Trails
     ========================================================= */

  createVfxCanvasTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const cx = 32;
    const cy = 32;

    if (type === 'star') {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.2, 'rgba(255, 225, 130, 0.9)');
      grad.addColorStop(0.55, 'rgba(255, 185, 60, 0.35)');
      grad.addColorStop(1, 'rgba(255, 140, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);

      // Star cross sparkle rays
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx, 3); ctx.lineTo(cx, 61);
      ctx.moveTo(3, cy); ctx.lineTo(61, cy);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 235, 160, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(11, 11); ctx.lineTo(53, 53);
      ctx.moveTo(11, 53); ctx.lineTo(53, 11);
      ctx.stroke();
    } else if (type === 'bokeh') {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      grad.addColorStop(0.4, 'rgba(255, 230, 210, 0.6)');
      grad.addColorStop(0.75, 'rgba(255, 190, 205, 0.25)');
      grad.addColorStop(1, 'rgba(255, 160, 190, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'spark') {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.25, 'rgba(255, 245, 190, 0.95)');
      grad.addColorStop(0.6, 'rgba(255, 170, 45, 0.45)');
      grad.addColorStop(1, 'rgba(255, 90, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'smoke') {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
      grad.addColorStop(0, 'rgba(225, 225, 235, 0.75)');
      grad.addColorStop(0.4, 'rgba(200, 200, 215, 0.4)');
      grad.addColorStop(0.75, 'rgba(175, 175, 190, 0.15)');
      grad.addColorStop(1, 'rgba(150, 150, 165, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'glow_ring') {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 31);
      grad.addColorStop(0, 'rgba(255, 220, 60, 0.85)');
      grad.addColorStop(0.35, 'rgba(255, 180, 80, 0.45)');
      grad.addColorStop(0.7, 'rgba(255, 120, 160, 0.2)');
      grad.addColorStop(1, 'rgba(255, 60, 110, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 31, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  initVfxSystem() {
    this.starTexture = this.createVfxCanvasTexture('star');
    this.sparkTexture = this.createVfxCanvasTexture('spark');
    this.bokehTexture = this.createVfxCanvasTexture('bokeh');
    this.smokeTexture = this.createVfxCanvasTexture('smoke');
    this.glowRingTexture = this.createVfxCanvasTexture('glow_ring');

    this.initCakeAuraVFX();
    this.initBokehAndStarTrailsVFX();
  }

  /* --- VFX 1: MAGICAL GOLDEN AURA & FAIRY DUST SPARKLES --- */
  initCakeAuraVFX() {
    // A. Luminous Aura Disk on the table under the cake
    const ringGeo = new THREE.PlaneGeometry(8.5, 8.5);
    const ringMat = new THREE.MeshBasicMaterial({
      map: this.glowRingTexture,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.vfxAuraRing = new THREE.Mesh(ringGeo, ringMat);
    this.vfxAuraRing.rotation.x = -Math.PI / 2;
    this.vfxAuraRing.position.set(0, 1.28, 0);
    this.scene.add(this.vfxAuraRing);

    // B. 160 Orbiting Golden Fairy Dust Sparkle Points
    const auraCount = 160;
    const auraGeo = new THREE.BufferGeometry();
    const auraPositions = new Float32Array(auraCount * 3);
    const auraColors = new Float32Array(auraCount * 3);
    this.vfxAuraParticlesData = [];

    const goldColor = new THREE.Color(0xffd700);
    const roseGoldColor = new THREE.Color(0xff9ebb);
    const amberColor = new THREE.Color(0xffba08);

    for (let i = 0; i < auraCount; i++) {
      const radius = 1.6 + Math.random() * 2.8;
      const angle = Math.random() * Math.PI * 2;
      const y = 1.4 + Math.random() * 5.2;
      const speed = 0.35 + Math.random() * 0.8;
      const bobAmp = 0.15 + Math.random() * 0.25;
      const bobFreq = 1.2 + Math.random() * 2.0;
      const phase = Math.random() * Math.PI * 2;

      auraPositions[i * 3] = Math.cos(angle) * radius;
      auraPositions[i * 3 + 1] = y;
      auraPositions[i * 3 + 2] = Math.sin(angle) * radius;

      const cPick = Math.random();
      const col = cPick < 0.5 ? goldColor : (cPick < 0.8 ? roseGoldColor : amberColor);
      auraColors[i * 3] = col.r;
      auraColors[i * 3 + 1] = col.g;
      auraColors[i * 3 + 2] = col.b;

      this.vfxAuraParticlesData.push({
        radius,
        angle,
        y,
        baseY: y,
        speed,
        bobAmp,
        bobFreq,
        phase,
        riseSpeed: 0.12 + Math.random() * 0.2
      });
    }

    auraGeo.setAttribute('position', new THREE.BufferAttribute(auraPositions, 3));
    auraGeo.setAttribute('color', new THREE.BufferAttribute(auraColors, 3));

    const auraMat = new THREE.PointsMaterial({
      size: 0.45,
      map: this.starTexture,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.vfxAuraParticles = new THREE.Points(auraGeo, auraMat);
    this.scene.add(this.vfxAuraParticles);
  }

  burstCakeAuraVFX() {
    this.vfxAuraIntensity = 1.8;
    gsap.to(this, {
      vfxAuraIntensity: 1.1,
      duration: 2.5,
      ease: 'power2.out'
    });

    if (this.vfxAuraParticles && this.vfxAuraParticles.material) {
      gsap.to(this.vfxAuraParticles.material, {
        size: 0.75,
        duration: 0.8,
        yoyo: true,
        repeat: 1,
        ease: 'power1.inOut'
      });
    }

    // Sparkle flare burst from cake apex
    this.launch3DFireworkBurst(0, 4.2, 0, 0xffd700, 75);
  }

  updateVfxAura(time) {
    if (!this.vfxAuraParticles || !this.vfxAuraParticlesData) return;

    const positions = this.vfxAuraParticles.geometry.attributes.position.array;
    const l = this.vfxAuraParticlesData.length;

    for (let i = 0; i < l; i++) {
      const p = this.vfxAuraParticlesData[i];
      p.angle += p.speed * 0.012;
      p.y += p.riseSpeed * 0.02;

      if (p.y > 6.2) {
        p.y = 1.35;
      }

      const curRadius = p.radius + Math.sin(time * 2.0 + p.phase) * 0.15;
      const bobY = p.y + Math.sin(time * p.bobFreq + p.phase) * p.bobAmp;

      positions[i * 3] = Math.cos(p.angle) * curRadius;
      positions[i * 3 + 1] = bobY;
      positions[i * 3 + 2] = Math.sin(p.angle) * curRadius;
    }
    this.vfxAuraParticles.geometry.attributes.position.needsUpdate = true;

    if (this.vfxAuraRing) {
      const pulse = 1.0 + Math.sin(time * 2.5) * 0.08;
      this.vfxAuraRing.scale.set(pulse, pulse, 1.0);
      this.vfxAuraRing.material.opacity = (0.45 + Math.sin(time * 3.0) * 0.15) * this.vfxAuraIntensity;
    }
  }

  /* --- VFX 4: AMBIENT FLOATING BOKEH LIGHTS & STAR TRAILS --- */
  initBokehAndStarTrailsVFX() {
    const bokehCount = 100;
    const bokehGeo = new THREE.BufferGeometry();
    const bokehPositions = new Float32Array(bokehCount * 3);
    const bokehColors = new Float32Array(bokehCount * 3);
    this.vfxBokehData = [];

    const palette = [
      new THREE.Color(0xff758c), // Rose
      new THREE.Color(0xffd166), // Gold
      new THREE.Color(0xcdb4db), // Soft Lavender
      new THREE.Color(0xffc6ff), // Fairy Pink
      new THREE.Color(0x9bf6ff)  // Ethereal Cyan
    ];

    for (let i = 0; i < bokehCount; i++) {
      const x = (Math.random() - 0.5) * 55;
      const y = 1.0 + Math.random() * 25;
      const z = (Math.random() - 0.5) * 50;

      bokehPositions[i * 3] = x;
      bokehPositions[i * 3 + 1] = y;
      bokehPositions[i * 3 + 2] = z;

      const col = palette[Math.floor(Math.random() * palette.length)];
      bokehColors[i * 3] = col.r;
      bokehColors[i * 3 + 1] = col.g;
      bokehColors[i * 3 + 2] = col.b;

      this.vfxBokehData.push({
        baseX: x, baseY: y, baseZ: z,
        swayX: 0.8 + Math.random() * 1.5,
        swayY: 0.6 + Math.random() * 1.2,
        swayZ: 0.8 + Math.random() * 1.5,
        freq: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      });
    }

    bokehGeo.setAttribute('position', new THREE.BufferAttribute(bokehPositions, 3));
    bokehGeo.setAttribute('color', new THREE.BufferAttribute(bokehColors, 3));

    const bokehMat = new THREE.PointsMaterial({
      size: 1.25,
      map: this.bokehTexture,
      transparent: true,
      opacity: 0.55,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.vfxBokehParticles = new THREE.Points(bokehGeo, bokehMat);
    this.scene.add(this.vfxBokehParticles);

    this.vfxStarTrails = [];
    this.vfxLastStarSpawn = 0;
  }

  updateVfxBokeh(time) {
    if (!this.vfxBokehParticles || !this.vfxBokehData) return;

    const positions = this.vfxBokehParticles.geometry.attributes.position.array;
    const l = this.vfxBokehData.length;

    for (let i = 0; i < l; i++) {
      const b = this.vfxBokehData[i];
      positions[i * 3] = b.baseX + Math.sin(time * b.freq + b.phase) * b.swayX;
      positions[i * 3 + 1] = b.baseY + Math.cos(time * b.freq * 0.8 + b.phase) * b.swayY;
      positions[i * 3 + 2] = b.baseZ + Math.sin(time * b.freq * 1.2 + b.phase) * b.swayZ;
    }
    this.vfxBokehParticles.geometry.attributes.position.needsUpdate = true;

    if (this.vfxBokehParticles.material) {
      this.vfxBokehParticles.material.opacity = 0.55 + Math.sin(time * 1.5) * 0.15;
    }
  }

  spawnShootingStar() {
    const startX = (Math.random() - 0.5) * 60;
    const startY = 22 + Math.random() * 12;
    const startZ = -15 - Math.random() * 20;

    const angle = (Math.random() * 0.4 + 0.2) * (Math.random() < 0.5 ? 1 : -1);
    const speed = 1.2 + Math.random() * 0.8;
    const vx = Math.cos(angle) * speed;
    const vy = -Math.sin(angle) * speed * 0.6;
    const vz = (Math.random() - 0.5) * 0.3;

    const points = [
      new THREE.Vector3(startX, startY, startZ),
      new THREE.Vector3(startX - vx * 2.5, startY - vy * 2.5, startZ - vz * 2.5)
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    this.vfxStarTrails.push({
      line,
      geo,
      mat,
      pos: new THREE.Vector3(startX, startY, startZ),
      vel: new THREE.Vector3(vx, vy, vz),
      length: 3.5 + Math.random() * 2.0,
      life: 1.0,
      decay: 0.02 + Math.random() * 0.01
    });
  }

  updateVfxStarTrails(time) {
    if (time - this.vfxLastStarSpawn > 3.2 + Math.random() * 2.5) {
      this.vfxLastStarSpawn = time;
      this.spawnShootingStar();
    }

    for (let i = this.vfxStarTrails.length - 1; i >= 0; i--) {
      const st = this.vfxStarTrails[i];
      st.life -= st.decay;
      if (st.life <= 0) {
        this.scene.remove(st.line);
        st.geo.dispose();
        st.mat.dispose();
        this.vfxStarTrails.splice(i, 1);
        continue;
      }

      st.pos.add(st.vel);
      st.mat.opacity = Math.max(0, st.life * 0.95);

      const positions = st.geo.attributes.position.array;
      positions[0] = st.pos.x;
      positions[1] = st.pos.y;
      positions[2] = st.pos.z;
      positions[3] = st.pos.x - st.vel.x * (st.length * st.life);
      positions[4] = st.pos.y - st.vel.y * (st.length * st.life);
      positions[5] = st.pos.z - st.vel.z * (st.length * st.life);
      st.geo.attributes.position.needsUpdate = true;
    }
  }

  /* --- VFX 2: 3D PARTICLES FIREWORKS & KNIFE CUT SPARK FOUNTAIN --- */
  launch3DFireworkBurst(x, y, z, colorHex = 0xffd700, particleCount = 75) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const pData = [];
    const baseCol = new THREE.Color(colorHex);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      colors[i * 3] = baseCol.r;
      colors[i * 3 + 1] = baseCol.g;
      colors[i * 3 + 2] = baseCol.b;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 0.25 + Math.random() * 0.55;

      pData.push({
        vx: Math.sin(phi) * Math.cos(theta) * speed,
        vy: Math.sin(phi) * Math.sin(theta) * speed + 0.08,
        vz: Math.cos(phi) * speed,
        drag: 0.965,
        gravity: -0.012
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.55,
      map: this.sparkTexture,
      transparent: true,
      opacity: 1.0,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const mesh = new THREE.Points(geo, mat);
    this.scene.add(mesh);

    this.vfxActiveFireworks.push({
      mesh,
      geo,
      mat,
      pData,
      positions,
      life: 1.0,
      decay: 0.016 + Math.random() * 0.008
    });
  }

  launchCelebrationFireworkShow(burstCount = 9) {
    const colors = [0xffd700, 0xff1493, 0x00f2fe, 0x39ff14, 0xff6b6b, 0xbf5af2, 0xffb703];
    for (let i = 0; i < burstCount; i++) {
      setTimeout(() => {
        const x = (Math.random() - 0.5) * 34;
        const y = 14 + Math.random() * 12;
        const z = -4 + (Math.random() - 0.5) * 16;
        const col = colors[Math.floor(Math.random() * colors.length)];
        this.launch3DFireworkBurst(x, y, z, col, 70);

        if (window.birthdayAudio) {
          try { window.birthdayAudio.playBalloonPop(); } catch(e) {}
        }
      }, i * 350);
    }
  }

  createKnifeSliceSparkFountain(pos) {
    const count = 70;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const pData = [];
    const goldCol = new THREE.Color(0xffd700);
    const orangeCol = new THREE.Color(0xff7b00);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const c = Math.random() < 0.6 ? goldCol : orangeCol;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      const angle = (Math.PI / 4) + (Math.random() - 0.5) * (Math.PI * 0.8);
      const speed = 0.15 + Math.random() * 0.35;
      pData.push({
        vx: Math.cos(angle) * speed,
        vy: 0.1 + Math.random() * 0.25,
        vz: Math.sin(angle) * speed + 0.12,
        gravity: -0.015,
        drag: 0.94
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.45,
      map: this.sparkTexture,
      transparent: true,
      opacity: 1.0,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const mesh = new THREE.Points(geo, mat);
    this.scene.add(mesh);

    this.vfxSliceSparks.push({
      mesh, geo, mat, pData, positions,
      life: 1.0,
      decay: 0.025
    });
  }

  updateVfxFireworks() {
    for (let i = this.vfxActiveFireworks.length - 1; i >= 0; i--) {
      const fw = this.vfxActiveFireworks[i];
      fw.life -= fw.decay;
      if (fw.life <= 0) {
        this.scene.remove(fw.mesh);
        fw.geo.dispose();
        fw.mat.dispose();
        this.vfxActiveFireworks.splice(i, 1);
        continue;
      }

      fw.mat.opacity = Math.max(0, fw.life);
      fw.mat.size = 0.55 * Math.max(0.3, fw.life);

      const pos = fw.positions;
      const count = fw.pData.length;
      for (let p = 0; p < count; p++) {
        const pd = fw.pData[p];
        pd.vy += pd.gravity;
        pd.vx *= pd.drag;
        pd.vy *= pd.drag;
        pd.vz *= pd.drag;

        pos[p * 3] += pd.vx;
        pos[p * 3 + 1] += pd.vy;
        pos[p * 3 + 2] += pd.vz;
      }
      fw.geo.attributes.position.needsUpdate = true;
    }
  }

  updateVfxSliceSparks() {
    for (let i = this.vfxSliceSparks.length - 1; i >= 0; i--) {
      const sp = this.vfxSliceSparks[i];
      sp.life -= sp.decay;
      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        sp.geo.dispose();
        sp.mat.dispose();
        this.vfxSliceSparks.splice(i, 1);
        continue;
      }

      sp.mat.opacity = sp.life;
      const pos = sp.positions;
      const count = sp.pData.length;
      for (let p = 0; p < count; p++) {
        const pd = sp.pData[p];
        pd.vy += pd.gravity;
        pd.vx *= pd.drag;
        pd.vy *= pd.drag;
        pd.vz *= pd.drag;

        pos[p * 3] += pd.vx;
        pos[p * 3 + 1] += pd.vy;
        pos[p * 3 + 2] += pd.vz;

        if (pos[p * 3 + 1] < 1.3) {
          pos[p * 3 + 1] = 1.3;
          pd.vy = -pd.vy * 0.4;
        }
      }
      sp.geo.attributes.position.needsUpdate = true;
    }
  }

  /* --- VFX 3: CANDLE IGNITION SHOCKWAVE & SMOKE PUFFS --- */
  triggerCandleIgnitionVFX(centerPos = null) {
    const pos = centerPos || new THREE.Vector3(0, 4.8, 0);

    const ringGeo = new THREE.RingGeometry(0.1, 0.45, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos);
    this.scene.add(ring);

    gsap.to(ring.scale, {
      x: 7.0, y: 7.0, z: 7.0,
      duration: 0.75,
      ease: 'power2.out'
    });
    gsap.to(ringMat, {
      opacity: 0,
      duration: 0.75,
      ease: 'power2.out',
      onComplete: () => {
        this.scene.remove(ring);
        ringGeo.dispose();
        ringMat.dispose();
      }
    });
  }

  createCandleSmokePuff(pos) {
    const puffCount = 18;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(puffCount * 3);
    const pData = [];

    for (let i = 0; i < puffCount; i++) {
      positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.15;
      positions[i * 3 + 1] = pos.y + Math.random() * 0.2;
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.15;

      pData.push({
        vx: (Math.random() - 0.5) * 0.03,
        vy: 0.045 + Math.random() * 0.04,
        vz: (Math.random() - 0.5) * 0.03,
        wobbleFreq: 3 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.65,
      map: this.smokeTexture,
      transparent: true,
      opacity: 0.7,
      color: 0xdcdce6,
      depthWrite: false
    });

    const mesh = new THREE.Points(geo, mat);
    this.scene.add(mesh);

    this.vfxSmokeParticles.push({
      mesh, geo, mat, pData, positions,
      life: 1.0,
      decay: 0.014
    });
  }

  blowCandles() {
    if (!this.candlesLit) {
      this.lightCandles();
      return;
    }
    this.candlesLit = false;

    this.flames.forEach((item, idx) => {
      gsap.to(item.flame.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.35 });
      gsap.to(item.core.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.35 });
      if (item.halo) {
        gsap.to(item.halo.scale, {
          x: 0.001, y: 0.001, z: 0.001, duration: 0.35,
          onComplete: () => {
            item.flame.visible = false;
            item.core.visible = false;
            if (item.halo) item.halo.visible = false;
          }
        });
      }

      const candleWorldPos = new THREE.Vector3();
      if (this.candles[idx]) {
        this.candles[idx].getWorldPosition(candleWorldPos);
        candleWorldPos.y += 1.4;
        this.createCandleSmokePuff(candleWorldPos);
      }
    });

    this.candleLights.forEach(light => {
      gsap.to(light, { intensity: 0, duration: 0.5 });
    });

    if (window.birthdayAudio && window.birthdayAudio.ctx) {
      try {
        const osc = window.birthdayAudio.ctx.createOscillator();
        const gain = window.birthdayAudio.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, window.birthdayAudio.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, window.birthdayAudio.ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.25, window.birthdayAudio.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, window.birthdayAudio.ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(window.birthdayAudio.ctx.destination);
        osc.start();
        osc.stop(window.birthdayAudio.ctx.currentTime + 0.35);
      } catch(e) {}
    }
  }

  updateVfxSmoke() {
    for (let i = this.vfxSmokeParticles.length - 1; i >= 0; i--) {
      const sm = this.vfxSmokeParticles[i];
      sm.life -= sm.decay;
      if (sm.life <= 0) {
        this.scene.remove(sm.mesh);
        sm.geo.dispose();
        sm.mat.dispose();
        this.vfxSmokeParticles.splice(i, 1);
        continue;
      }

      sm.mat.opacity = sm.life * 0.7;
      sm.mat.size = (1.0 + (1.0 - sm.life) * 1.4) * 0.65;

      const pos = sm.positions;
      const count = sm.pData.length;
      for (let p = 0; p < count; p++) {
        const pd = sm.pData[p];
        pos[p * 3] += pd.vx + Math.sin(sm.life * pd.wobbleFreq + pd.phase) * 0.015;
        pos[p * 3 + 1] += pd.vy;
        pos[p * 3 + 2] += pd.vz + Math.cos(sm.life * pd.wobbleFreq + pd.phase) * 0.015;
      }
      sm.geo.attributes.position.needsUpdate = true;
    }
  }

  /* =========================================================
     RENDER LOOP
     ========================================================= */
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    const time = this.clock.getElapsedTime();

    // 1. Cake & Slices Gentle Rotation
    if (this.cakeGroup) {
      this.cakeGroup.rotation.y = time * 0.08;
    }

    // 2. Candle Flames Flicker (When Lit)
    if (this.candlesLit) {
      this.flames.forEach((item, idx) => {
        const flicker = Math.sin(time * 16 + idx * 3.0) * 0.12 + Math.cos(time * 24 + idx) * 0.06;
        item.flame.scale.set(1.0 - flicker * 0.4, 1.0 + flicker, 1.0 - flicker * 0.4);
        item.flame.rotation.z = Math.sin(time * 22 + idx * 4.0) * 0.12;
        item.core.scale.set(1.0 - flicker * 0.3, 1.0 + flicker * 0.8, 1.0 - flicker * 0.3);
        if (item.halo) item.halo.scale.set(1.0 + flicker * 0.35, 1.0 + flicker * 0.35, 1.0 + flicker * 0.35);
      });
      this.candleLights.forEach((light, idx) => {
        light.intensity = 2.4 + Math.sin(time * 18 + idx) * 0.6;
      });
    }

    // 2B. Cinematic VFX Suite Updates
    this.updateVfxAura(time);
    this.updateVfxBokeh(time);
    this.updateVfxStarTrails(time);
    this.updateVfxFireworks();
    this.updateVfxSmoke();
    this.updateVfxSliceSparks();

    // 3. Disco Ball & Spotlights
    if (this.discoBallGroup && this.isDiscoActive) {
      this.discoSphere.rotation.y = time * 1.2;
      if (this.discoFacetDots) {
        this.discoFacetDots.rotation.y = time * 0.4;
        this.discoFacetDots.rotation.x = Math.sin(time * 0.3) * 0.1;
      }
      this.discoSpotlights.forEach((spot, idx) => {
        const a = time * 2.0 + (idx * Math.PI) / 2;
        spot.target.position.set(Math.cos(a) * 9, 0.5, Math.sin(a) * 9);
      });
    }

    // 4. Multi-Colored Diwali Fairy Light Bulbs Twinkle
    if (this.diwaliBulbs) {
      this.diwaliBulbs.forEach(bulb => {
        const twinkle = Math.sin(time * bulb.speed + bulb.phase);
        bulb.mat.emissiveIntensity = 0.5 + Math.max(0, twinkle) * 0.9;
      });
    }

    // 5. Party Friends Animations (Joyful Swaying, Waving & Clapping)
    if (this.partyFriends) {
      this.partyFriends.forEach(friend => {
        const u = friend.userData;
        if (u.isRevealed) {
          if (u.isClapping) {
            // Energetic jumping & rapid synchronized hand clapping
            friend.position.y = Math.abs(Math.sin(time * 8 + u.wobbleOffset)) * 0.35;
            const clapAngle = Math.sin(time * 16) * 0.45;
            u.leftArm.rotation.z = Math.PI / 4 + clapAngle;
            u.rightArm.rotation.z = -Math.PI / 4 - clapAngle;
          } else {
            // Gentle joyful swaying and arm waving
            friend.position.y = Math.sin(time * 3 + u.wobbleOffset) * 0.08;
            u.leftArm.rotation.x = -Math.PI / 4 + Math.sin(time * 4 + u.wobbleOffset) * 0.25;
            u.rightArm.rotation.x = -Math.PI / 4 + Math.cos(time * 4 + u.wobbleOffset) * 0.25;
          }
        }
      });
    }

    // 6. Photo Frame + Badge Pulsing Glow
    if (this.photoBadge) {
      const pulse = 1.0 + Math.sin(time * 5) * 0.15;
      this.photoBadge.scale.set(pulse, pulse, pulse);
    }

    // 7. Background side balloons wobble & glitter shimmer
    this.generalBalloons.forEach(b => {
      const u = b.userData;
      b.position.y = u.basePos.y + Math.sin(time * u.floatSpeed + u.wobbleOffset) * 0.25;
      b.rotation.z = Math.sin(time * 1.5 + u.wobbleOffset) * 0.05;
      if (u.glitterPoints) {
        u.glitterPoints.rotation.y = time * 0.4;
        u.glitterPoints.material.opacity = 0.8 + Math.sin(time * 5 + u.wobbleOffset) * 0.2;
      }
    });

    // 8. Table Balloons Orbit & Rotate Around the Cake with Glitter Shimmer
    this.tableBalloons.forEach(b => {
      const u = b.userData;
      if (!u.isPopped && !this.isOrbitPaused) {
        const curAngle = u.baseAngle + time * u.orbitSpeed;
        b.position.x = Math.cos(curAngle) * u.orbitRadius;
        b.position.z = Math.sin(curAngle) * u.orbitRadius;
        b.position.y = u.baseHeight + Math.sin(time * u.floatSpeed + u.wobbleOffset) * 0.35;
        b.rotation.z = Math.sin(time * 1.5 + u.wobbleOffset) * 0.08;

        // Twinkle and gentle swirl for glittering powder particles
        if (u.glitterPoints) {
          u.glitterPoints.rotation.y = time * 0.45;
          u.glitterPoints.material.opacity = 0.8 + Math.sin(time * 5 + u.wobbleOffset) * 0.2;
        }
      }
    });

    // 9. Floating Gift Box when presented in front
    if (this.giftGroup && this.giftPresented && !this.giftOpened) {
      this.giftGroup.position.y = 5.2 + Math.sin(time * 3) * 0.15;
      this.giftGroup.rotation.y = 0.4 + Math.sin(time * 1.5) * 0.12;
    }

    // 6. Confetti (square rain disabled)
    if (this.confettiList && this.confettiList.length > 0) {
      this.confettiList.forEach(c => {
        c.position.y -= c.userData.fallSpeed;
        c.position.x += Math.sin(time * 2 + c.position.y) * 0.015;
        c.rotation.x += c.userData.rotSpeedX;
        c.rotation.y += c.userData.rotSpeedY;
        if (c.position.y < 0) {
          c.position.y = 25;
          c.position.x = (Math.random() - 0.5) * 35;
          c.position.z = (Math.random() - 0.5) * 35;
        }
      });
    }

    // 6B. 3D Falling Rose Petals
    if (this.petalsData) {
      this.petalsData.forEach(p => {
        const m = p.mesh;
        m.position.y -= p.fallSpeed;
        m.position.x += Math.sin(time * p.swaySpeed + p.seed) * p.swayAmp;
        m.position.z += Math.cos(time * p.swaySpeed + p.seed) * (p.swayAmp * 0.8);
        m.rotation.x += p.rotSpeedX;
        m.rotation.y += p.rotSpeedY;
        m.rotation.z += p.rotSpeedZ;
        if (m.position.y < 0.2) {
          m.position.y = 25;
          m.position.x = (Math.random() - 0.5) * 32;
          m.position.z = (Math.random() - 0.5) * 32;
        }
      });
    }

    // 7. Clear sparkler trail canvas
    if (this.sparklerActive) {
      const canvas = document.getElementById('sparkler-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    if (this.controls) this.controls.update();

    // Broadcast live camera telemetry for angle & distance inspector HUD
    if (window.onCameraTelemetryUpdate && this.camera && this.controls) {
      const dist = this.camera.position.distanceTo(this.controls.target);
      const polar = this.controls.getPolarAngle() * (180 / Math.PI);
      const azimuth = this.controls.getAzimuthalAngle() * (180 / Math.PI);
      window.onCameraTelemetryUpdate({
        distance: dist,
        pitch: polar,
        yaw: azimuth,
        pos: this.camera.position,
        target: this.controls.target
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  setCameraDistance(newDist) {
    if (!this.camera || !this.controls) return;
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
    this.camera.position.copy(this.controls.target).addScaledVector(dir, newDist);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    const canvas = document.getElementById('sparkler-canvas');
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }
}

window.BirthdayScene = BirthdayScene;
