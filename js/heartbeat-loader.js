/**
 * Heartbeat Biometric Scanner & Real 3D Asset Preloader
 * Tracks real network bytes for cake.glb & heavy 3D assets
 * Features: Touch & Hold Scanner, Live Cardiac ECG Canvas, Web Audio Heartbeat Synthesizer,
 * Haptic Pulse, and Seamless 3D World Gateway.
 */

(function () {
  'use strict';

  // Audio Context for synthetic cardiac sound
  let audioCtx = null;
  let heartbeatInterval = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Play realistic double-beat "lub-dub" heartbeat pulse
  function playHeartbeatSound(bpm = 80) {
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;

      // 1. "Lub" - First heart tone (Mitral & Tricuspid valve closure)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(75, now);
      osc1.frequency.exponentialRampToValueAtTime(42, now + 0.09);

      gain1.gain.setValueAtTime(0.28, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.09);

      // 2. "Dub" - Second heart tone (Aortic & Pulmonary valve closure) 120ms later
      const dubTime = now + 0.12;
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(88, dubTime);
      osc2.frequency.exponentialRampToValueAtTime(50, dubTime + 0.11);

      gain2.gain.setValueAtTime(0.36, dubTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, dubTime + 0.11);

      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(dubTime);
      osc2.stop(dubTime + 0.11);
    } catch (e) {
      // Audio autoplay restriction fallback
    }
  }

  // State Management
  let isScanning = false;
  let currentSyncPercent = 0;
  let currentBpm = 74;
  let targetBpm = 74;
  let onCompleteCallback = null;
  let scanAnimationId = null;
  let ecgAnimationId = null;
  let hasCompleted = false;
  let touchHoldStartTime = 0;

  // ECG Graph State
  let ecgPoints = [];
  let ecgPhase = 0;

  // DOM Elements
  let overlay, statusText, bpmVal, syncPct, downloadBarFill, assetStatus, bytesStatus;
  let scannerPad, circleBar, pressPrompt, scanBeam, coreHeart, cancelBtn, ecgCanvas, ecgCtx;

  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 70; // r=70 => 439.82

  function initElements() {
    overlay = document.getElementById('heartbeat-sync-overlay');
    if (!overlay) return false;

    statusText = document.getElementById('hb-status-text');
    bpmVal = document.getElementById('hb-bpm-val');
    syncPct = document.getElementById('hb-sync-pct');
    downloadBarFill = document.getElementById('hb-download-bar-fill');
    assetStatus = document.getElementById('hb-asset-status');
    bytesStatus = document.getElementById('hb-bytes-status');
    scannerPad = document.getElementById('hb-scanner-pad');
    circleBar = document.getElementById('hb-circle-bar');
    pressPrompt = document.getElementById('hb-press-prompt');
    scanBeam = document.getElementById('hb-scan-beam');
    coreHeart = document.getElementById('hb-core-heart');
    cancelBtn = document.getElementById('btn-cancel-hb-sync');
    ecgCanvas = document.getElementById('hb-ecg-canvas');

    if (ecgCanvas) {
      ecgCtx = ecgCanvas.getContext('2d');
    }

    if (circleBar) {
      circleBar.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
      circleBar.style.strokeDashoffset = `${CIRCLE_CIRCUMFERENCE}`;
    }

    attachEvents();
    return true;
  }

  function attachEvents() {
    if (!scannerPad) return;

    // Mobile Touch Events
    scannerPad.addEventListener('touchstart', onTouchStart, { passive: false });
    scannerPad.addEventListener('touchend', onTouchEnd, { passive: false });
    scannerPad.addEventListener('touchcancel', onTouchEnd, { passive: false });

    // Desktop Mouse Events
    scannerPad.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    // Cancel Button
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeOverlay);
    }
  }

  function onTouchStart(e) {
    e.preventDefault();
    startScanning();
  }

  function onTouchEnd(e) {
    e.preventDefault();
    stopScanning();
  }

  function onMouseDown(e) {
    e.preventDefault();
    startScanning();
  }

  function onMouseUp(e) {
    if (isScanning) {
      stopScanning();
    }
  }

  function startScanning() {
    if (hasCompleted) return;
    initAudio();
    isScanning = true;
    touchHoldStartTime = performance.now();

    if (scannerPad) scannerPad.classList.add('scanning');
    if (pressPrompt) {
      pressPrompt.innerHTML = `<i class="fa-solid fa-heart-pulse fa-beat"></i> <span>Reading Heartbeats & Syncing 3D Assets...</span>`;
      pressPrompt.classList.add('holding');
    }

    // Gentle initial haptic pulse
    if (navigator.vibrate) {
      try { navigator.vibrate([35, 45, 35]); } catch (e) {}
    }

    // Start audio loop based on BPM
    scheduleNextBeat();
  }

  function stopScanning() {
    if (hasCompleted) return;
    isScanning = false;

    if (scannerPad) scannerPad.classList.remove('scanning');
    if (pressPrompt) {
      pressPrompt.innerHTML = `<i class="fa-solid fa-hand-pointer"></i> <span>Press &amp; Hold Finger to Complete Sync ❤️</span>`;
      pressPrompt.classList.remove('holding');
    }

    if (heartbeatInterval) {
      clearTimeout(heartbeatInterval);
      heartbeatInterval = null;
    }

    targetBpm = 74;
  }

  function scheduleNextBeat() {
    if (!isScanning || hasCompleted) return;

    playHeartbeatSound(currentBpm);

    // Minor haptic beat on mobile
    if (navigator.vibrate) {
      try { navigator.vibrate(20); } catch (e) {}
    }

    // Interval between beats = (60 / bpm) * 1000
    const delay = Math.max(380, Math.round((60 / currentBpm) * 1000));
    heartbeatInterval = setTimeout(scheduleNextBeat, delay);
  }

  // Draw Real-time Cardiac ECG Monitor on Canvas
  function drawEcg() {
    if (!ecgCanvas || !ecgCtx) return;

    const w = ecgCanvas.width;
    const h = ecgCanvas.height;
    const midY = h / 2;

    ecgCtx.clearRect(0, 0, w, h);

    // Medical grid background
    ecgCtx.strokeStyle = 'rgba(255, 117, 140, 0.08)';
    ecgCtx.lineWidth = 1;
    ecgCtx.beginPath();
    for (let x = 0; x < w; x += 18) {
      ecgCtx.moveTo(x, 0);
      ecgCtx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += 12) {
      ecgCtx.moveTo(0, y);
      ecgCtx.lineTo(w, y);
    }
    ecgCtx.stroke();

    // Generate continuous smooth cardiac waveform points
    const stepSpeed = isScanning ? 2.8 : 1.4;
    ecgPhase += stepSpeed;

    // Maintain 120 historic points
    const pointCount = Math.floor(w / 2.2);
    if (ecgPoints.length < pointCount) {
      for (let i = 0; i < pointCount; i++) {
        ecgPoints.push(midY);
      }
    }

    // Compute standard ECG wave (P-Q-R-S-T)
    const cycle = (ecgPhase % 140) / 140; // 0 to 1 per heartbeat
    let sample = 0;

    if (cycle > 0.12 && cycle < 0.22) {
      // P wave (atrial depolarization)
      sample = Math.sin(((cycle - 0.12) / 0.10) * Math.PI) * 4;
    } else if (cycle > 0.28 && cycle < 0.31) {
      // Q dip
      sample = -3.5;
    } else if (cycle >= 0.31 && cycle <= 0.38) {
      // R spike (ventricular depolarization)
      const rRatio = (cycle - 0.31) / 0.07;
      sample = Math.sin(rRatio * Math.PI) * (isScanning ? 21 : 14);
    } else if (cycle > 0.38 && cycle < 0.42) {
      // S dip
      sample = -6.5;
    } else if (cycle > 0.52 && cycle < 0.68) {
      // T wave (ventricular repolarization)
      sample = Math.sin(((cycle - 0.52) / 0.16) * Math.PI) * 5.5;
    } else {
      // Baseline with tiny biological micro-noise
      sample = (Math.sin(ecgPhase * 0.1) * 0.8) + (Math.random() * 0.4 - 0.2);
    }

    ecgPoints.shift();
    ecgPoints.push(midY - sample);

    // Draw Glowing ECG Line
    ecgCtx.save();
    ecgCtx.beginPath();
    ecgCtx.lineWidth = isScanning ? 2.4 : 1.8;
    ecgCtx.strokeStyle = isScanning ? '#ff2a7a' : '#00e676';
    ecgCtx.shadowColor = isScanning ? '#ff758c' : '#00f2fe';
    ecgCtx.shadowBlur = isScanning ? 9 : 4;
    ecgCtx.lineJoin = 'round';
    ecgCtx.lineCap = 'round';

    for (let i = 0; i < ecgPoints.length; i++) {
      const px = i * (w / pointCount);
      const py = ecgPoints[i];
      if (i === 0) {
        ecgCtx.moveTo(px, py);
      } else {
        ecgCtx.lineTo(px, py);
      }
    }
    ecgCtx.stroke();

    // Leading glowing dot at the end
    const lastX = (ecgPoints.length - 1) * (w / pointCount);
    const lastY = ecgPoints[ecgPoints.length - 1];
    ecgCtx.fillStyle = isScanning ? '#ffffff' : '#00e676';
    ecgCtx.shadowColor = isScanning ? '#ffd700' : '#00e676';
    ecgCtx.shadowBlur = 12;
    ecgCtx.beginPath();
    ecgCtx.arc(lastX, lastY, isScanning ? 3.5 : 2.5, 0, Math.PI * 2);
    ecgCtx.fill();

    ecgCtx.restore();

    ecgAnimationId = requestAnimationFrame(drawEcg);
  }

  // Main Biometric Scan & Download Sync Loop
  function updateSyncLoop() {
    if (!overlay || overlay.classList.contains('hidden')) return;

    // 1. Read Real Network Progress from CakePreloader
    let realProgress = 100;
    let loadedMB = '20.5';
    let totalMB = '20.5';
    let isLoaded = true;

    if (window.CakePreloader) {
      const info = window.CakePreloader.getProgress();
      realProgress = info.progress || 0;
      loadedMB = info.loadedMB || '0.0';
      totalMB = info.totalMB || '20.5';
      isLoaded = info.status === 'loaded' || realProgress >= 100;
    }

    // 2. Update real download badge display
    if (bytesStatus) {
      if (isLoaded) {
        bytesStatus.textContent = `${totalMB} MB / ${totalMB} MB (Cached)`;
      } else {
        bytesStatus.textContent = `${loadedMB} MB / ${totalMB} MB`;
      }
    }

    if (downloadBarFill) {
      downloadBarFill.style.width = `${Math.min(100, Math.max(5, realProgress))}%`;
    }

    // 3. Update Sync Progress while user is holding finger
    if (isScanning && !hasCompleted) {
      const holdTimeSec = (performance.now() - touchHoldStartTime) / 1000;

      // Heart rate accelerates passionately as user holds
      targetBpm = Math.min(136, 75 + Math.floor(holdTimeSec * 22) + Math.floor(currentSyncPercent * 0.4));

      // Real Sync Rate:
      // If assets are already 100% loaded, user completes romantic sync over ~1.8 seconds.
      // If assets are still downloading, sync percentage cannot exceed real network progress!
      let maxAllowedSync = realProgress;
      if (!isLoaded && maxAllowedSync >= 99) maxAllowedSync = 99; // Holds at 99% until file completes

      if (currentSyncPercent < maxAllowedSync) {
        // Fast, responsive fill
        const fillStep = isLoaded ? 1.6 : 0.8;
        currentSyncPercent = Math.min(maxAllowedSync, currentSyncPercent + fillStep);
      }

      // Check if both 100% real download AND hold sync reached!
      if (currentSyncPercent >= 100 && isLoaded && holdTimeSec >= 1.2) {
        completeSyncSuccess();
      }
    } else if (!isScanning && !hasCompleted) {
      // When finger is lifted before 100%, slowly decay target BPM back to resting
      targetBpm = 74;
      // Keep sync progress close to real downloaded bytes, but don't reset to 0
      if (currentSyncPercent > 0 && currentSyncPercent > realProgress) {
        currentSyncPercent = Math.max(0, currentSyncPercent - 0.8);
      }
    }

    // Smooth BPM interpolation
    currentBpm += (targetBpm - currentBpm) * 0.08;

    // Update UI numbers
    if (bpmVal) bpmVal.textContent = Math.round(currentBpm);
    if (syncPct) syncPct.textContent = Math.round(currentSyncPercent);

    // Update circular progress bar
    if (circleBar) {
      const offset = CIRCLE_CIRCUMFERENCE - (CIRCLE_CIRCUMFERENCE * (currentSyncPercent / 100));
      circleBar.style.strokeDashoffset = `${offset}`;
    }

    // Update Status Message
    if (assetStatus) {
      if (hasCompleted) {
        assetStatus.textContent = '✨ 100% Synced! Welcome to 3D World...';
      } else if (isScanning) {
        if (!isLoaded) {
          assetStatus.textContent = `⚡ High-speed downloading 3D Universe (${Math.round(realProgress)}%)...`;
        } else {
          assetStatus.textContent = `💕 Matching heartbeat waves with her (${Math.round(currentSyncPercent)}%)...`;
        }
      } else {
        if (!isLoaded) {
          assetStatus.textContent = `📥 Background asset download in progress (${Math.round(realProgress)}%)...`;
        } else {
          assetStatus.textContent = '✅ 3D Assets Ready! Touch & Hold to enter 💕';
        }
      }
    }

    scanAnimationId = requestAnimationFrame(updateSyncLoop);
  }

  // Celebration & Seamless Gateway Trigger
  function completeSyncSuccess() {
    if (hasCompleted) return;
    hasCompleted = true;
    isScanning = false;

    if (heartbeatInterval) {
      clearTimeout(heartbeatInterval);
      heartbeatInterval = null;
    }

    currentSyncPercent = 100;
    if (syncPct) syncPct.textContent = '100';
    if (circleBar) circleBar.style.strokeDashoffset = '0';

    if (scannerPad) {
      scannerPad.classList.remove('scanning');
      scannerPad.classList.add('synced');
    }

    if (statusText) {
      statusText.innerHTML = `❤️ 100% HEARTBEATS SYNCHRONIZED FOREVER! 🔐`;
    }

    if (pressPrompt) {
      pressPrompt.innerHTML = `<i class="fa-solid fa-sparkles fa-bounce"></i> <span>Heartbeats Matched! Opening 3D World...</span>`;
      pressPrompt.classList.add('complete');
    }

    // Celebration Confetti
    if (window.confetti) {
      try {
        window.confetti({ particleCount: 70, spread: 85, origin: { y: 0.6 } });
      } catch (e) {}
    }

    // Audio Chime / Fanfare
    if (window.birthdayAudio) {
      try {
        window.birthdayAudio.init();
        window.birthdayAudio.playGiftOpen();
      } catch (e) {}
    }

    // Haptic triumph burst
    if (navigator.vibrate) {
      try { navigator.vibrate([60, 50, 80, 50, 100]); } catch (e) {}
    }

    // Smoothly dissolve overlay and launch 3D Celebration
    setTimeout(() => {
      if (overlay) {
        overlay.classList.add('fade-out');
        setTimeout(() => {
          overlay.classList.add('hidden');
          overlay.classList.remove('fade-out');

          // Execute registered 3D world transition callback
          if (onCompleteCallback && typeof onCompleteCallback === 'function') {
            const cb = onCompleteCallback;
            onCompleteCallback = null;
            cb();
          }
        }, 500);
      }
    }, 900);
  }

  function openOverlay(callback) {
    if (!overlay && !initElements()) {
      // Fallback: if DOM element not present, execute directly
      if (callback) callback();
      return;
    }

    onCompleteCallback = callback;
    hasCompleted = false;
    isScanning = false;
    currentSyncPercent = 0;
    currentBpm = 74;
    targetBpm = 74;
    touchHoldStartTime = 0;

    if (scannerPad) {
      scannerPad.classList.remove('scanning', 'synced');
    }
    if (pressPrompt) {
      pressPrompt.innerHTML = `<i class="fa-solid fa-hand-pointer"></i> <span>Press &amp; Hold Finger to Sync ❤️</span>`;
      pressPrompt.classList.remove('holding', 'complete');
    }
    if (statusText) {
      statusText.innerHTML = `LOVE BIOMETRIC GATEWAY 🔐`;
    }
    if (circleBar) {
      circleBar.style.strokeDashoffset = `${CIRCLE_CIRCUMFERENCE}`;
    }

    // Ensure background preload of cake.glb is at full throttle
    if (window.CakePreloader) {
      window.CakePreloader.startPreload();
    }

    overlay.classList.remove('hidden');

    // Start Loops
    if (!ecgAnimationId) {
      ecgAnimationId = requestAnimationFrame(drawEcg);
    }
    if (!scanAnimationId) {
      scanAnimationId = requestAnimationFrame(updateSyncLoop);
    }
  }

  function closeOverlay() {
    stopScanning();
    hasCompleted = false;
    if (overlay) {
      overlay.classList.add('hidden');
    }
    if (ecgAnimationId) {
      cancelAnimationFrame(ecgAnimationId);
      ecgAnimationId = null;
    }
    if (scanAnimationId) {
      cancelAnimationFrame(scanAnimationId);
      scanAnimationId = null;
    }
    onCompleteCallback = null;
  }

  // Public Interface
  window.HeartbeatLoader = {
    open: openOverlay,
    close: closeOverlay,
    isReady: () => {
      if (!window.CakePreloader) return true;
      return window.CakePreloader.status === 'loaded';
    }
  };

  // Auto-init on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initElements);
  } else {
    initElements();
  }

})();
