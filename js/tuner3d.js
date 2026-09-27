/**
 * 3D Live Color & Lighting Studio Tuner
 * Allows real-time live tweaking of every 3D object, lights, roughness, metalness, and materials.
 * Generates exact numbers/JSON to copy and permanently save.
 */

(function () {
  'use strict';

  // Default baseline settings (User-Approved Golden Settings)
  const defaultSettings = {
    // 🌐 Global Lighting & Camera Tone
    exposure: 6.0,
    ambientLight: 0.15,
    keyLight: 0.0,
    fillLight: 0.0,

    // 🎂 1. Cake & Plate Controls
    cakeGlowLight: 4.2,
    cakeSpotLight: 0.0,
    cakeEmissiveGlow: 0.40,
    cakeRimLight: 1.5,
    cakeFrostingRoughness: 0.38,
    cakePlateMetalness: 0.90,
    cakeBaseColor: '#1f0005',
    cakeTopColor: '#ff9bb2',
    cakeFrostingColor: '#ff4d79',
    cakePlateColor: '#ffd700',

    // 🖼️ 2. Royal Photo Frame Controls
    photoSpotLight: 0.0,
    photoGemGlow: 0.75,
    photoGoldMetalness: 0.94,
    photoGoldRoughness: 0.14,
    photoFrameGold: '#ffd700',
    photoFrameGems: '#ff0040',

    // 🎪 3. Stage & Velvet Floor Controls
    stageFrontLight: 0.0,
    stageFloorEmissive: 0.0,
    stageFloorRoughness: 0.0,
    stageRingMetalness: 0.90,
    stageFloorColor: '#22129b',
    stageOuterRing: '#ffd700',
    stageInnerRing: '#480a0a',

    // 🪵 4. Banquet Table Controls
    tableGlowLight: 0.0,
    tableClothRoughness: 0.60,
    tableRunnerMetalness: 0.85,
    tableTopColor: '#fcf5ea',
    tableRunnerColor: '#ffd700',
    tableLegsColor: '#5a3d28',

    // 🏮 5. Corner Pillars & Fairy Bulbs Controls
    leftPoleHalogen: 0.0,
    fairyBulbsLight: 0.90,
    poleGoldMetalness: 0.85,
    poleBodyColor: '#ffffff',
    poleGoldCaps: '#ffd700',

    // 📜 6. Birthday Standee Board Controls
    boardSpotLight: 0.0,
    boardGoldMetalness: 0.0,
    boardFrameGold: '#ffd700'
  };

  // Active working settings
  const currentSettings = Object.assign({}, defaultSettings);

  // Active Category in Vertical Nav
  let activeCategory = 'all';

  function getScene() {
    return window.birthdayScene || null;
  }

  // Real-time apply to Three.js scene
  function applyToScene(key, val) {
    const s = getScene();
    if (!s) return;

    try {
      const numVal = parseFloat(val);

      switch (key) {
        // Global / Lighting
        case 'exposure':
          if (s.renderer) s.renderer.toneMappingExposure = numVal;
          break;
        case 'ambientLight':
          if (s.ambientLight) s.ambientLight.intensity = numVal;
          break;
        case 'keyLight':
          if (s.dirLight) s.dirLight.intensity = numVal;
          break;
        case 'fillLight':
          if (s.fillLight) s.fillLight.intensity = numVal;
          break;

        // Cake & Plate
        case 'cakeGlowLight':
          if (s.cakeGlowLight) s.cakeGlowLight.intensity = numVal;
          break;
        case 'cakeSpotLight':
          if (s.cakeSpotLight) s.cakeSpotLight.intensity = numVal;
          break;
        case 'cakeFrostingRoughness':
          if (s.setCakeRoughness) {
            s.setCakeRoughness(numVal);
          } else {
            if (s.frostingMat) s.frostingMat.roughness = numVal;
            if (s.cakeGlbModel) {
              s.cakeGlbModel.traverse((child) => {
                if (child.isMesh && child.material) child.material.roughness = numVal;
              });
            }
          }
          break;
        case 'cakeEmissiveGlow':
          if (s.setCakeEmissiveIntensity) {
            s.setCakeEmissiveIntensity(numVal);
          }
          break;
        case 'cakeRimLight':
          if (s.setCakeRimLightIntensity) {
            s.setCakeRimLightIntensity(numVal);
          } else if (s.cakeRimLight) {
            s.cakeRimLight.intensity = numVal;
          }
          break;
        case 'cakePlateMetalness':
          if (s.standMat) s.standMat.metalness = numVal;
          if (s.cakePlateMesh && s.cakePlateMesh.material) s.cakePlateMesh.material.metalness = numVal;
          break;
        case 'cakeBaseColor':
          if (s.cakeBaseMat) s.cakeBaseMat.color.set(val);
          if (s.cakeGlbModel) tintGlbMeshes(s.cakeGlbModel, val, 0);
          break;
        case 'cakeTopColor':
          if (s.cakeTopMat) s.cakeTopMat.color.set(val);
          if (s.cakeGlbModel) tintGlbMeshes(s.cakeGlbModel, val, 1);
          break;
        case 'cakeFrostingColor':
          if (s.frostingMat) s.frostingMat.color.set(val);
          if (s.cakeGlbModel) tintGlbMeshes(s.cakeGlbModel, val, 2);
          break;
        case 'cakePlateColor':
          if (s.standMat) s.standMat.color.set(val);
          if (s.cakePlateMesh && s.cakePlateMesh.material) s.cakePlateMesh.material.color.set(val);
          break;

        // Photo Frame
        case 'photoSpotLight':
          if (s.rightStageLight) s.rightStageLight.intensity = numVal;
          break;
        case 'photoGemGlow':
          if (s.royalFrameGems) {
            s.royalFrameGems.forEach((g) => {
              if (g.material) g.material.emissiveIntensity = numVal;
            });
          }
          break;
        case 'photoGoldMetalness':
          if (s.photoFrameGroup) {
            s.photoFrameGroup.traverse((child) => {
              if (child.isMesh && child.material && child.userData.type !== 'photo-frame') {
                if (child.material.metalness > 0.4) child.material.metalness = numVal;
              }
            });
          }
          break;
        case 'photoGoldRoughness':
          if (s.photoFrameGroup) {
            s.photoFrameGroup.traverse((child) => {
              if (child.isMesh && child.material && child.userData.type !== 'photo-frame') {
                if (child.material.metalness > 0.4) child.material.roughness = numVal;
              }
            });
          }
          break;
        case 'photoFrameGold':
          if (s.photoFrameGroup) {
            s.photoFrameGroup.traverse((child) => {
              if (child.isMesh && child.material && child.userData.type !== 'photo-frame') {
                if (child.material.color && child.material.metalness > 0.4) {
                  child.material.color.set(val);
                }
              }
            });
          }
          break;
        case 'photoFrameGems':
          if (s.royalFrameGems) {
            s.royalFrameGems.forEach((g) => {
              if (g.material) g.material.color.set(val);
            });
          }
          break;

        // Stage & Floor
        case 'stageFrontLight':
          if (s.stageFrontLight) s.stageFrontLight.intensity = numVal;
          break;
        case 'stageFloorEmissive':
          if (s.stage && s.stage.material) {
            s.stage.material.emissive = new THREE.Color(currentSettings.stageFloorColor);
            s.stage.material.emissiveIntensity = numVal;
          }
          break;
        case 'stageFloorRoughness':
          if (s.stage && s.stage.material) s.stage.material.roughness = numVal;
          break;
        case 'stageRingMetalness':
          if (s.stageRingMat) s.stageRingMat.metalness = numVal;
          if (s.innerRingMat) s.innerRingMat.metalness = numVal;
          break;
        case 'stageFloorColor':
          if (s.stage && s.stage.material) {
            s.stage.material.color.set(val);
            if (currentSettings.stageFloorEmissive > 0) {
              s.stage.material.emissive.set(val);
            }
          }
          break;
        case 'stageOuterRing':
          if (s.stageRingMat) s.stageRingMat.color.set(val);
          break;
        case 'stageInnerRing':
          if (s.innerRingMat) s.innerRingMat.color.set(val);
          break;

        // Party Table
        case 'tableGlowLight':
          if (s.cakeGlowLight && key === 'tableGlowLight') {
            // Can modulate cake glow distance or intensity
          }
          break;
        case 'tableClothRoughness':
          if (s.tableGroup && s.tableGroup.children[0] && s.tableGroup.children[0].material) {
            s.tableGroup.children[0].material.roughness = numVal;
          }
          break;
        case 'tableRunnerMetalness':
          if (s.tableGroup && s.tableGroup.children[1] && s.tableGroup.children[1].material) {
            s.tableGroup.children[1].material.metalness = numVal;
          }
          break;
        case 'tableTopColor':
          if (s.tableGroup && s.tableGroup.children[0] && s.tableGroup.children[0].material) {
            s.tableGroup.children[0].material.color.set(val);
          }
          break;
        case 'tableRunnerColor':
          if (s.tableGroup && s.tableGroup.children[1] && s.tableGroup.children[1].material) {
            s.tableGroup.children[1].material.color.set(val);
          }
          break;
        case 'tableLegsColor':
          if (s.tableGroup) {
            for (let i = 2; i < s.tableGroup.children.length; i++) {
              if (s.tableGroup.children[i].material) {
                s.tableGroup.children[i].material.color.set(val);
              }
            }
          }
          break;

        // Corner Poles & Bulbs
        case 'leftPoleHalogen':
          if (s.setLeftPoleHalogenIntensity) {
            s.setLeftPoleHalogenIntensity(numVal);
          } else if (s.leftPoleHalogenLight) {
            s.leftPoleHalogenLight.intensity = numVal;
          }
          break;
        case 'fairyBulbsLight':
          s.fairyBulbsMultiplier = numVal;
          if (s.diwaliBulbs) {
            s.diwaliBulbs.forEach((b) => {
              if (b.mat) b.mat.emissiveIntensity = 3.2 * numVal;
            });
          }
          break;
        case 'poleGoldMetalness':
          if (s.polesGroup) {
            s.polesGroup.traverse((child) => {
              if (child.isMesh && child.material && child.material.metalness > 0.4) {
                child.material.metalness = numVal;
              }
            });
          }
          break;
        case 'poleBodyColor':
          if (s.polesGroup) {
            s.polesGroup.traverse((child) => {
              if (child.isMesh && child.material && child.material.color && child.material.metalness < 0.4) {
                child.material.color.set(val);
              }
            });
          }
          break;
        case 'poleGoldCaps':
          if (s.polesGroup) {
            s.polesGroup.traverse((child) => {
              if (child.isMesh && child.material && child.material.color && child.material.metalness > 0.4) {
                child.material.color.set(val);
              }
            });
          }
          break;

        // Standee Board
        case 'boardSpotLight':
          if (s.leftStageLight) s.leftStageLight.intensity = numVal;
          break;
        case 'boardGoldMetalness':
          if (s.standBoardGroup) {
            s.standBoardGroup.traverse((child) => {
              if (child.isMesh && child.material && child.material.metalness > 0.4) {
                child.material.metalness = numVal;
              }
            });
          }
          break;
        case 'boardFrameGold':
          if (s.standBoardGroup) {
            s.standBoardGroup.traverse((child) => {
              if (child.isMesh && child.material && child.material.color && child.material.metalness > 0.4) {
                child.material.color.set(val);
              }
            });
          }
          break;
      }
    } catch (e) {
      console.warn('3D Studio Tuner apply error:', e);
    }

    // Sync any corresponding master sliders in the bottom section
    syncMasterSlider(key, val);

    // Keep live JSON output updated
    updateConfigOutputBox();
  }

  function syncMasterSlider(key, val) {
    const map = {
      exposure: { id: 'slider-exposure', numId: 'num-exposure' },
      cakeGlowLight: { id: 'slider-cakeglow', numId: 'num-cakeglow' },
      leftPoleHalogen: { id: 'slider-halogen', numId: 'num-halogen' },
      ambientLight: { id: 'slider-ambient', numId: 'num-ambient' },
      keyLight: { id: 'slider-keylight', numId: 'num-keylight' },
      cakeSpotLight: { id: 'slider-cakespot', numId: 'num-cakespot' },
      fillLight: { id: 'slider-filllight', numId: 'num-filllight' }
    };
    if (map[key]) {
      const slider = document.getElementById(map[key].id);
      const num = document.getElementById(map[key].numId);
      if (slider && parseFloat(slider.value) !== parseFloat(val)) {
        slider.value = val;
      }
      if (num) {
        num.textContent = Number(val).toFixed(2);
      }
    }
  }

  function tintGlbMeshes(model, hex, meshIndex) {
    let count = 0;
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        if (count === meshIndex) {
          if (child.material.color) child.material.color.set(hex);
          if (child.material.emissive) child.material.emissive.set(hex);
        }
        count++;
      }
    });
  }

  // Update the JSON display box at the bottom of the popup
  function updateConfigOutputBox() {
    const box = document.getElementById('tuner-config-output');
    if (!box) return;
    box.value = JSON.stringify(currentSettings, null, 2);
  }

  // Helper to generate slider HTML block
  function makeSliderHTML(label, key, min, max, step, currentVal) {
    const val = (currentVal !== undefined ? currentVal : (currentSettings[key] || 0));
    return `
      <div class="tuner-category-slider">
        <div class="tuner-cat-slider-header">
          <span>${label}</span>
          <span class="tuner-cat-num" id="catnum-${key}">${Number(val).toFixed(2)}</span>
        </div>
        <input type="range" class="tuner-range" data-cat-key="${key}" min="${min}" max="${max}" step="${step}" value="${val}">
      </div>
    `;
  }

  // Helper to generate color row HTML block
  function makeColorHTML(label, key, currentHex) {
    const hex = currentHex || currentSettings[key] || '#ffd700';
    return `
      <div class="tuner-field-row">
        <label>${label}</label>
        <div class="tuner-color-wrap">
          <input type="color" data-key="${key}" value="${hex}">
          <span class="color-hex-text">${hex}</span>
        </div>
      </div>
    `;
  }

  // Render dedicated, separate controls for each object
  function renderCategoryControls(category) {
    const container = document.getElementById('tuner-category-controls');
    if (!container) return;

    let html = '';

    switch (category) {
      case 'all':
        html = `
          <div class="tuner-group-title">🌐 Global Master Scene</div>
          <p class="tuner-hint">Control master camera exposure, halogen light, cake self-glow & 4K edge rim lighting.</p>
          ${makeSliderHTML('📷 Camera Tone Exposure', 'exposure', 0.1, 6.0, 0.05, currentSettings.exposure)}
          ${makeSliderHTML('💡 Front-Left Pole White Halogen', 'leftPoleHalogen', 0.0, 15.0, 0.1, currentSettings.leftPoleHalogen)}
          ${makeSliderHTML('🔮 Cake Self-Emissive Glow', 'cakeEmissiveGlow', 0.0, 2.0, 0.05, currentSettings.cakeEmissiveGlow)}
          ${makeSliderHTML('🌟 4K Cake Edge Rim Light', 'cakeRimLight', 0.0, 5.0, 0.1, currentSettings.cakeRimLight)}
          ${makeSliderHTML('🎂 Cake Table Glow Light', 'cakeGlowLight', 0.0, 15.0, 0.1, currentSettings.cakeGlowLight)}
          ${makeSliderHTML('🌟 Master Ambient Light', 'ambientLight', 0.0, 10.0, 0.05, currentSettings.ambientLight)}
          ${makeSliderHTML('☀️ Main Sun / Key Light', 'keyLight', 0.0, 15.0, 0.1, currentSettings.keyLight)}
          ${makeSliderHTML('🌸 Warm Stage Fill Light', 'fillLight', 0.0, 10.0, 0.1, currentSettings.fillLight)}
          <div style="margin-top: 10px;">
            ${makeColorHTML('Stage Floor Ambience Tint', 'stageFloorColor', currentSettings.stageFloorColor)}
            ${makeColorHTML('Golden Accents Tint', 'cakePlateColor', currentSettings.cakePlateColor)}
          </div>
        `;
        break;

      case 'cake':
        html = `
          <div class="tuner-group-title">🎂 Cake & Plate Controls</div>
          <p class="tuner-hint">Independent lighting, internal self-emissive glow & 4K edge silhouette for the cake.</p>
          ${makeSliderHTML('🔮 Cake Self-Emissive Glow', 'cakeEmissiveGlow', 0.0, 2.0, 0.05, currentSettings.cakeEmissiveGlow)}
          ${makeSliderHTML('🌟 4K Cake Edge Rim Light', 'cakeRimLight', 0.0, 5.0, 0.1, currentSettings.cakeRimLight)}
          ${makeSliderHTML('✨ Cake Table Glow Light', 'cakeGlowLight', 0.0, 15.0, 0.1, currentSettings.cakeGlowLight)}
          ${makeSliderHTML('💡 Dedicated Overhead Spotlight', 'cakeSpotLight', 0.0, 15.0, 0.1, currentSettings.cakeSpotLight)}
          ${makeSliderHTML('🍰 Cream Velvet Finish (Roughness)', 'cakeFrostingRoughness', 0.0, 1.0, 0.05, currentSettings.cakeFrostingRoughness)}
          ${makeSliderHTML('🥇 Golden Pedestal Plate Metalness', 'cakePlateMetalness', 0.0, 1.0, 0.05, currentSettings.cakePlateMetalness)}
          <div style="margin-top: 10px;">
            ${makeColorHTML('Cake Base Layer', 'cakeBaseColor', currentSettings.cakeBaseColor)}
            ${makeColorHTML('Cake Top Tier', 'cakeTopColor', currentSettings.cakeTopColor)}
            ${makeColorHTML('Cream & Frosting', 'cakeFrostingColor', currentSettings.cakeFrostingColor)}
            ${makeColorHTML('Cake Pedestal Plate', 'cakePlateColor', currentSettings.cakePlateColor)}
          </div>
        `;
        break;

      case 'photo':
        html = `
          <div class="tuner-group-title">🖼️ Royal Photo Frame Controls</div>
          <p class="tuner-hint">Independent spotlight, gold metallic shine & gem sparkle for the portrait.</p>
          ${makeSliderHTML('💡 Photo Dedicated Spotlight', 'photoSpotLight', 0.0, 15.0, 0.1, currentSettings.photoSpotLight)}
          ${makeSliderHTML('💎 Gemstones Ruby/Jewel Glow', 'photoGemGlow', 0.0, 5.0, 0.1, currentSettings.photoGemGlow)}
          ${makeSliderHTML('🥇 Frame Gold Metalness', 'photoGoldMetalness', 0.0, 1.0, 0.05, currentSettings.photoGoldMetalness)}
          ${makeSliderHTML('✨ Frame Gold Polish (Roughness)', 'photoGoldRoughness', 0.0, 1.0, 0.05, currentSettings.photoGoldRoughness)}
          <div style="margin-top: 10px;">
            ${makeColorHTML('Royal Gold Frame', 'photoFrameGold', currentSettings.photoFrameGold)}
            ${makeColorHTML('Crown & Rosette Gemstones', 'photoFrameGems', currentSettings.photoFrameGems)}
          </div>
        `;
        break;

      case 'stage':
        html = `
          <div class="tuner-group-title">🎪 Stage & Floor Rings Controls</div>
          <p class="tuner-hint">Independent stage front spotlight, velvet glow & golden boundary rings.</p>
          ${makeSliderHTML('💡 Stage Front Spotlight', 'stageFrontLight', 0.0, 12.0, 0.1, currentSettings.stageFrontLight)}
          ${makeSliderHTML('🌟 Stage Velvet Floor Glow', 'stageFloorEmissive', 0.0, 3.0, 0.05, currentSettings.stageFloorEmissive)}
          ${makeSliderHTML('✨ Velvet Fabric Roughness', 'stageFloorRoughness', 0.0, 1.0, 0.05, currentSettings.stageFloorRoughness)}
          ${makeSliderHTML('🥇 Boundary Rings Metalness', 'stageRingMetalness', 0.0, 1.0, 0.05, currentSettings.stageRingMetalness)}
          <div style="margin-top: 10px;">
            ${makeColorHTML('Stage Velvet Floor', 'stageFloorColor', currentSettings.stageFloorColor)}
            ${makeColorHTML('Outer Golden Ring', 'stageOuterRing', currentSettings.stageOuterRing)}
            ${makeColorHTML('Inner Accent Ring', 'stageInnerRing', currentSettings.stageInnerRing)}
          </div>
        `;
        break;

      case 'table':
        html = `
          <div class="tuner-group-title">🪵 Party Banquet Table Controls</div>
          <p class="tuner-hint">Independent controls for tablecloth fabric, golden runner, and carved legs.</p>
          ${makeSliderHTML('✨ Table Center Glow Light', 'cakeGlowLight', 0.0, 15.0, 0.1, currentSettings.cakeGlowLight)}
          ${makeSliderHTML('🧵 Tablecloth Fabric Roughness', 'tableClothRoughness', 0.0, 1.0, 0.05, currentSettings.tableClothRoughness)}
          ${makeSliderHTML('🥇 Gold Cloth Runner Metalness', 'tableRunnerMetalness', 0.0, 1.0, 0.05, currentSettings.tableRunnerMetalness)}
          <div style="margin-top: 10px;">
            ${makeColorHTML('Tabletop Cloth', 'tableTopColor', currentSettings.tableTopColor)}
            ${makeColorHTML('Gold Runner Trim', 'tableRunnerColor', currentSettings.tableRunnerColor)}
            ${makeColorHTML('Carved Table Legs', 'tableLegsColor', currentSettings.tableLegsColor)}
          </div>
        `;
        break;

      case 'poles':
        html = `
          <div class="tuner-group-title">🏮 Corner Poles & Halogen Light</div>
          <p class="tuner-hint">Independent controls for front-left white halogen spotlight, 4 pillars & fairy bulbs.</p>
          ${makeSliderHTML('💡 Front-Left Pole White Halogen', 'leftPoleHalogen', 0.0, 15.0, 0.1, currentSettings.leftPoleHalogen)}
          ${makeSliderHTML('🏮 Fairy Bulbs Glow Intensity', 'fairyBulbsLight', 0.0, 15.0, 0.1, currentSettings.fairyBulbsLight)}
          ${makeSliderHTML('🥇 Gold Pillar Finials Metalness', 'poleGoldMetalness', 0.0, 1.0, 0.05, currentSettings.poleGoldMetalness)}
          <div style="margin-top: 10px;">
            ${makeColorHTML('Corner Column Body', 'poleBodyColor', currentSettings.poleBodyColor)}
            ${makeColorHTML('Golden Finial Caps', 'poleGoldCaps', currentSettings.poleGoldCaps)}
          </div>
        `;
        break;

      case 'board':
        html = `
          <div class="tuner-group-title">📜 Standee Board Controls</div>
          <p class="tuner-hint">Independent spotlight and gold frame shine for the Birthday Board.</p>
          ${makeSliderHTML('💡 Standee Board Spotlight', 'boardSpotLight', 0.0, 15.0, 0.1, currentSettings.boardSpotLight)}
          ${makeSliderHTML('🥇 Board Gold Frame Metalness', 'boardGoldMetalness', 0.0, 1.0, 0.05, currentSettings.boardGoldMetalness)}
          <div style="margin-top: 10px;">
            ${makeColorHTML('Board Gold Frame', 'boardFrameGold', currentSettings.boardFrameGold)}
          </div>
        `;
        break;
    }

    container.innerHTML = html;

    // Attach listeners to newly created category sliders
    container.querySelectorAll('input[type="range"][data-cat-key]').forEach((slider) => {
      slider.addEventListener('input', (e) => {
        const key = e.target.getAttribute('data-cat-key');
        const val = parseFloat(e.target.value);
        currentSettings[key] = val;
        const numSpan = document.getElementById(`catnum-${key}`);
        if (numSpan) numSpan.textContent = val.toFixed(2);
        applyToScene(key, val);
      });
    });

    // Attach listeners to newly created color pickers
    container.querySelectorAll('input[type="color"]').forEach((input) => {
      input.addEventListener('input', (e) => {
        const key = e.target.getAttribute('data-key');
        const val = e.target.value;
        currentSettings[key] = val;
        const hexSpan = e.target.nextElementSibling;
        if (hexSpan) hexSpan.textContent = val;
        applyToScene(key, val);
      });
    });
  }

  // Initialize the DOM elements and event listeners
  function initTunerUI() {
    const openBtn = document.getElementById('btn-live-3d-tuner');
    const drawer = document.getElementById('tuner-drawer');
    const closeBtn = document.getElementById('close-tuner-btn');

    if (!drawer) return;

    function openDrawer() {
      drawer.classList.add('open');
      renderCategoryControls(activeCategory);
      updateConfigOutputBox();
    }

    function closeDrawer() {
      drawer.classList.remove('open');
    }

    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (drawer.classList.contains('open')) {
          closeDrawer();
        } else {
          openDrawer();
        }
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        closeDrawer();
      }
    });

    // Vertical Category Nav Tabs
    const navItems = document.querySelectorAll('.tuner-nav-item');
    navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        navItems.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-category');
        renderCategoryControls(activeCategory);
      });
    });

    // Connect the Horizontal Quick Master Sliders
    const masterSliders = [
      { id: 'slider-exposure', key: 'exposure', numId: 'num-exposure' },
      { id: 'slider-halogen', key: 'leftPoleHalogen', numId: 'num-halogen' },
      { id: 'slider-cakeglow', key: 'cakeGlowLight', numId: 'num-cakeglow' },
      { id: 'slider-ambient', key: 'ambientLight', numId: 'num-ambient' },
      { id: 'slider-keylight', key: 'keyLight', numId: 'num-keylight' },
      { id: 'slider-cakespot', key: 'cakeSpotLight', numId: 'num-cakespot' },
      { id: 'slider-filllight', key: 'fillLight', numId: 'num-filllight' }
    ];

    masterSliders.forEach((item) => {
      const sliderEl = document.getElementById(item.id);
      const numEl = document.getElementById(item.numId);
      if (sliderEl) {
        sliderEl.value = currentSettings[item.key];
        if (numEl) numEl.textContent = Number(currentSettings[item.key]).toFixed(2);

        sliderEl.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          currentSettings[item.key] = val;
          if (numEl) numEl.textContent = val.toFixed(2);
          applyToScene(item.key, val);

          // If current open category has this slider, update its badge
          const catNum = document.getElementById(`catnum-${item.key}`);
          if (catNum) catNum.textContent = val.toFixed(2);
          const catSlider = document.querySelector(`input[data-cat-key="${item.key}"]`);
          if (catSlider && parseFloat(catSlider.value) !== val) catSlider.value = val;
        });
      }
    });

    // Copy Config Button
    const copyBtn = document.getElementById('btn-copy-tuner-config');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const text = JSON.stringify(currentSettings, null, 2);
        navigator.clipboard.writeText(text).then(() => {
          const orig = copyBtn.innerHTML;
          copyBtn.innerHTML = '✅ Copied! Paste in Chat';
          copyBtn.classList.add('btn-copied');
          setTimeout(() => {
            copyBtn.innerHTML = orig;
            copyBtn.classList.remove('btn-copied');
          }, 2400);
        }).catch(() => {
          const box = document.getElementById('tuner-config-output');
          if (box) {
            box.select();
            document.execCommand('copy');
            copyBtn.innerHTML = '✅ Copied!';
            setTimeout(() => { copyBtn.innerHTML = '📋 Copy Numbers'; }, 2000);
          }
        });
      });
    }

    // Reset Defaults Button
    const resetBtn = document.getElementById('btn-reset-tuner');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        Object.assign(currentSettings, defaultSettings);
        masterSliders.forEach((item) => {
          const sliderEl = document.getElementById(item.id);
          const numEl = document.getElementById(item.numId);
          if (sliderEl) sliderEl.value = currentSettings[item.key];
          if (numEl) numEl.textContent = Number(currentSettings[item.key]).toFixed(2);
        });
        Object.keys(currentSettings).forEach((k) => {
          applyToScene(k, currentSettings[k]);
        });
        renderCategoryControls(activeCategory);
        updateConfigOutputBox();
      });
    }

    // Initial render
    renderCategoryControls('all');
    updateConfigOutputBox();
  }

  // Auto-init on DOMContentLoaded or immediate
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTunerUI);
  } else {
    initTunerUI();
  }

  // Window debug bridge
  window.Live3DTuner = {
    settings: currentSettings,
    apply: applyToScene,
    open: () => {
      const d = document.getElementById('tuner-drawer');
      if (d) d.classList.add('open');
    },
    close: () => {
      const d = document.getElementById('tuner-drawer');
      if (d) d.classList.remove('open');
    }
  };
})();
