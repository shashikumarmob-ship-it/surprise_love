/**
 * 3D Live Color & Lighting Studio Tuner
 * Allows real-time live tweaking of all 3D scene elements, lights, and materials
 * Generates exact numbers/JSON to copy and permanently save.
 */

(function () {
  'use strict';

  // Default values snapshot (User Approved Best Config)
  const defaultSettings = {
    exposure: 2.5,
    ambientLight: 0,
    keyLight: 0,
    cakeSpotLight: 0,
    cakeGlowLight: 3.2,
    stageFloorColor: '#22129b',
    stageOuterRing: '#ffd700',
    stageInnerRing: '#480a0a',
    tableTopColor: '#fcf5ea',
    tableRunnerColor: '#ffd700',
    tableLegsColor: '#5a3d28',
    cakeBaseColor: '#1f0005',
    cakeTopColor: '#ff9bb2',
    cakeFrostingColor: '#ff4d79',
    cakePlateColor: '#ffd700',
    photoFrameGold: '#ffd700',
    photoFrameGems: '#ff0040',
    poleBodyColor: '#ffffff',
    poleGoldCaps: '#ffd700',
    boardFrameGold: '#ffd700'
  };

  // Active working settings
  const currentSettings = Object.assign({}, defaultSettings);

  // Active Category in Vertical Menu
  let activeCategory = 'all';

  function getScene() {
    return window.birthdayScene || null;
  }

  // Real-time apply to Three.js scene
  function applyToScene(key, val) {
    const s = getScene();
    if (!s) return;

    try {
      switch (key) {
        case 'exposure':
          if (s.renderer) s.renderer.toneMappingExposure = parseFloat(val);
          break;
        case 'ambientLight':
          if (s.ambientLight) s.ambientLight.intensity = parseFloat(val);
          break;
        case 'keyLight':
          if (s.dirLight) s.dirLight.intensity = parseFloat(val);
          break;
        case 'cakeSpotLight':
          if (s.cakeSpotLight) s.cakeSpotLight.intensity = parseFloat(val);
          break;
        case 'cakeGlowLight':
          if (s.cakeGlowLight) s.cakeGlowLight.intensity = parseFloat(val);
          break;
        case 'stageFloorColor':
          if (s.stage && s.stage.material) s.stage.material.color.set(val);
          break;
        case 'stageOuterRing':
          if (s.stageRingMat) s.stageRingMat.color.set(val);
          break;
        case 'stageInnerRing':
          if (s.innerRingMat) s.innerRingMat.color.set(val);
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
        case 'photoFrameGold':
          if (s.photoFrameGroup) {
            s.photoFrameGroup.traverse((child) => {
              if (child.isMesh && child.material && child.userData.type !== 'photo-frame') {
                if (child.material.color && child.material.metalness > 0.5) {
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
        case 'poleBodyColor':
          if (s.polesGroup) {
            s.polesGroup.traverse((child) => {
              if (child.isMesh && child.material && child.material.color && child.material.metalness < 0.5) {
                child.material.color.set(val);
              }
            });
          }
          break;
        case 'poleGoldCaps':
          if (s.polesGroup) {
            s.polesGroup.traverse((child) => {
              if (child.isMesh && child.material && child.material.color && child.material.metalness > 0.5) {
                child.material.color.set(val);
              }
            });
          }
          break;
        case 'boardFrameGold':
          if (s.standBoardGroup) {
            s.standBoardGroup.traverse((child) => {
              if (child.isMesh && child.material && child.material.color && child.material.metalness > 0.5) {
                child.material.color.set(val);
              }
            });
          }
          break;
      }
    } catch (e) {
      console.warn('3D Tuner apply error:', e);
    }

    updateConfigOutputBox();
  }

  function tintGlbMeshes(model, hex, meshIndex) {
    let count = 0;
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        if (count === meshIndex) {
          if (child.material.color) child.material.color.set(hex);
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

  // Render Category Specific Controls on the right side of the category tabs
  function renderCategoryControls(category) {
    const container = document.getElementById('tuner-category-controls');
    if (!container) return;

    let html = '';

    switch (category) {
      case 'all':
        html = `
          <div class="tuner-group-title">🌐 Global Scene Lighting</div>
          <p class="tuner-hint">Use the 4 brightness sliders below to adjust overall illumination & exposure.</p>
          <div class="tuner-field-row">
            <label>Stage Ambience Tint</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="stageFloorColor" value="${currentSettings.stageFloorColor}">
              <span class="color-hex-text">${currentSettings.stageFloorColor}</span>
            </div>
          </div>
          <div class="tuner-field-row">
            <label>Gold Accents Tint</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="cakePlateColor" value="${currentSettings.cakePlateColor}">
              <span class="color-hex-text">${currentSettings.cakePlateColor}</span>
            </div>
          </div>
        `;
        break;

      case 'cake':
        html = `
          <div class="tuner-group-title">🎂 Cake & Pedestal Colors</div>
          <div class="tuner-field-row">
            <label>Cake Base Layer</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="cakeBaseColor" value="${currentSettings.cakeBaseColor}">
              <span class="color-hex-text">${currentSettings.cakeBaseColor}</span>
            </div>
          </div>
          <div class="tuner-field-row">
            <label>Cake Top Tier</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="cakeTopColor" value="${currentSettings.cakeTopColor}">
              <span class="color-hex-text">${currentSettings.cakeTopColor}</span>
            </div>
          </div>
          <div class="tuner-field-row">
            <label>Cream & Frosting</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="cakeFrostingColor" value="${currentSettings.cakeFrostingColor}">
              <span class="color-hex-text">${currentSettings.cakeFrostingColor}</span>
            </div>
          </div>
          <div class="tuner-field-row">
            <label>Cake Pedestal Plate</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="cakePlateColor" value="${currentSettings.cakePlateColor}">
              <span class="color-hex-text">${currentSettings.cakePlateColor}</span>
            </div>
          </div>
        `;
        break;

      case 'photo':
        html = `
          <div class="tuner-group-title">🖼️ Royal Photo Frame</div>
          <p class="tuner-hint">Photo itself is rendered with 100% natural clarity (zero glare).</p>
          <div class="tuner-field-row">
            <label>Royal Gold Frame</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="photoFrameGold" value="${currentSettings.photoFrameGold}">
              <span class="color-hex-text">${currentSettings.photoFrameGold}</span>
            </div>
          </div>
          <div class="tuner-field-row">
            <label>Gemstones (Rubies)</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="photoFrameGems" value="${currentSettings.photoFrameGems}">
              <span class="color-hex-text">${currentSettings.photoFrameGems}</span>
            </div>
          </div>
        `;
        break;

      case 'stage':
        html = `
          <div class="tuner-group-title">🎪 Stage & Floor Rings</div>
          <div class="tuner-field-row">
            <label>Stage Velvet Floor</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="stageFloorColor" value="${currentSettings.stageFloorColor}">
              <span class="color-hex-text">${currentSettings.stageFloorColor}</span>
            </div>
          </div>
          <div class="tuner-field-row">
            <label>Outer Golden Ring</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="stageOuterRing" value="${currentSettings.stageOuterRing}">
              <span class="color-hex-text">${currentSettings.stageOuterRing}</span>
            </div>
          </div>
          <div class="tuner-field-row">
            <label>Inner Stage Ring</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="stageInnerRing" value="${currentSettings.stageInnerRing}">
              <span class="color-hex-text">${currentSettings.stageInnerRing}</span>
            </div>
          </div>
        `;
        break;

      case 'table':
        html = `
          <div class="tuner-group-title">🪵 Party Banquet Table</div>
          <div class="tuner-field-row">
            <label>Tabletop Cloth</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="tableTopColor" value="${currentSettings.tableTopColor}">
              <span class="color-hex-text">${currentSettings.tableTopColor}</span>
            </div>
          </div>
          <div class="tuner-field-row">
            <label>Gold Cloth Trim</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="tableRunnerColor" value="${currentSettings.tableRunnerColor}">
              <span class="color-hex-text">${currentSettings.tableRunnerColor}</span>
            </div>
          </div>
          <div class="tuner-field-row">
            <label>Carved Table Legs</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="tableLegsColor" value="${currentSettings.tableLegsColor}">
              <span class="color-hex-text">${currentSettings.tableLegsColor}</span>
            </div>
          </div>
        `;
        break;

      case 'poles':
        html = `
          <div class="tuner-group-title">🏮 Corner Poles & Lights</div>
          <div class="tuner-field-row">
            <label>Corner Pillar Body</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="poleBodyColor" value="${currentSettings.poleBodyColor}">
              <span class="color-hex-text">${currentSettings.poleBodyColor}</span>
            </div>
          </div>
          <div class="tuner-field-row">
            <label>Golden Finial Caps</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="poleGoldCaps" value="${currentSettings.poleGoldCaps}">
              <span class="color-hex-text">${currentSettings.poleGoldCaps}</span>
            </div>
          </div>
        `;
        break;

      case 'board':
        html = `
          <div class="tuner-group-title">📜 Birthday Standee Board</div>
          <div class="tuner-field-row">
            <label>Board Gold Frame</label>
            <div class="tuner-color-wrap">
              <input type="color" data-key="boardFrameGold" value="${currentSettings.boardFrameGold}">
              <span class="color-hex-text">${currentSettings.boardFrameGold}</span>
            </div>
          </div>
        `;
        break;
    }

    container.innerHTML = html;

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
    // 1. Hook up top button
    const openBtn = document.getElementById('btn-live-3d-tuner');
    const drawer = document.getElementById('tuner-drawer');
    const backdrop = document.getElementById('tuner-drawer-backdrop');
    const closeBtn = document.getElementById('close-tuner-btn');

    if (!drawer) return;

    function openDrawer() {
      drawer.classList.add('open');
      if (backdrop) backdrop.classList.add('show');
      renderCategoryControls(activeCategory);
      updateConfigOutputBox();
    }

    function closeDrawer() {
      drawer.classList.remove('open');
      if (backdrop) backdrop.classList.remove('show');
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
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        closeDrawer();
      }
    });

    // 2. Vertical Category Nav
    const navItems = document.querySelectorAll('.tuner-nav-item');
    navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        navItems.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-category');
        renderCategoryControls(activeCategory);
      });
    });

    // 3. Connect the 4 Horizontal Sliders
    const sliders = [
      { id: 'slider-ambient', key: 'ambientLight', numId: 'num-ambient' },
      { id: 'slider-keylight', key: 'keyLight', numId: 'num-keylight' },
      { id: 'slider-cakespot', key: 'cakeSpotLight', numId: 'num-cakespot' },
      { id: 'slider-exposure', key: 'exposure', numId: 'num-exposure' }
    ];

    sliders.forEach((item) => {
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
        });
      }
    });

    // 4. Copy Config Button
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

    // 5. Reset Defaults Button
    const resetBtn = document.getElementById('btn-reset-tuner');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        Object.assign(currentSettings, defaultSettings);
        sliders.forEach((item) => {
          const sliderEl = document.getElementById(item.id);
          const numEl = document.getElementById(item.numId);
          if (sliderEl) sliderEl.value = currentSettings[item.key];
          if (numEl) numEl.textContent = Number(currentSettings[item.key]).toFixed(2);
          applyToScene(item.key, currentSettings[item.key]);
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

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTunerUI);
  } else {
    initTunerUI();
  }

  // Also expose on window for debugging
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
