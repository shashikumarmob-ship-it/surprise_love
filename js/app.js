/**
 * 3D Birthday Celebration - Romantic Girlfriend Edition
 */

document.addEventListener('DOMContentLoaded', () => {
  const scene = new BirthdayScene('canvas-container');

  // Dynamic API Base URL: Works locally (port 8000 -> 5000) and automatically on Render (origin)
  const API_BASE = (window.location.protocol.startsWith('http'))
    ? ((window.location.port === '8000' || window.location.port === '3000' || window.location.port === '5500')
        ? 'http://localhost:5000'
        : window.location.origin)
    : 'http://localhost:5000';

  // App State - Romantic Defaults
  let celebrantName = 'My Love';
  let celebrantAge = '';
  let customWish = 'Happy Birthday to the most amazing, gorgeous, and loving girl in the whole world! Thank you for bringing endless joy, warmth, and magic into my life. Every single day with you is my favorite day. May all your sweetest dreams come true today and forever!';
  let activeTheme = 'rose-glamour';

  // Story Flow Steps: 'intro' -> 'balloons' -> 'burn-candles' -> 'cut-cake' -> 'open-gift' -> 'free-play'
  let currentStoryStep = 'intro';

  // DOM Elements
  const curtainContainer = document.getElementById('curtain-container');
  const btnStartCelebration = document.getElementById('btn-start-celebration');
  const guidedStoryBar = document.getElementById('guided-story-bar');
  const mainScreenQuestCard = document.getElementById('main-screen-quest-card');
  const questTitleText = document.getElementById('quest-title-text');
  const questDescText = document.getElementById('quest-desc-text');
  const questBalloonCount = document.getElementById('quest-balloon-count');
  const stepBurnCandles = document.getElementById('step-burn-candles');
  const stepCutCake = document.getElementById('step-cut-cake');
  const stepOpenGift = document.getElementById('step-open-gift');
  const tapGiftCard = document.getElementById('tap-gift-card');
  const freePlayBottomBar = document.getElementById('free-play-bottom-bar');

  // Top Nav & Menu Drawer
  const mainMenuBtn = document.getElementById('main-menu-btn');
  const closeMenuBtn = document.getElementById('close-menu-btn');
  const menuDrawer = document.getElementById('menu-drawer');
  const menuDrawerBackdrop = document.getElementById('menu-drawer-backdrop');

  const displayNameText = document.getElementById('display-name-text');
  const displayAgeBadge = document.getElementById('display-age-badge');
  const celebrantTitle = document.getElementById('celebrant-title');
  const giftCustomWish = document.getElementById('gift-custom-wish');
  const bannerTitle = document.getElementById('banner-title');
  const musicToggleBtn = document.getElementById('music-toggle-btn');
  const soundWave = document.getElementById('sound-wave');
  const quickPetalsBtn = document.getElementById('quick-petals-btn');

  const customizeBtn = document.getElementById('customize-btn');
  const customizeModal = document.getElementById('customize-modal');
  const closeCustomizeModal = document.getElementById('close-customize-modal');
  const customizeForm = document.getElementById('customize-form');
  const inputName = document.getElementById('input-name');
  const inputAge = document.getElementById('input-age');
  const inputWish = document.getElementById('input-wish');
  const inputPhoto = document.getElementById('input-photo');
  const photoFilename = document.getElementById('photo-filename');
  const inputPhotoUrl = document.getElementById('input-photo-url');
  const photoUploadStatus = document.getElementById('photo-upload-status');

  const shareBtn = document.getElementById('share-btn');
  const shareModal = document.getElementById('share-modal');
  const closeShareModal = document.getElementById('close-share-modal');
  const shareLinkInput = document.getElementById('share-link-input');
  const btnCopyLink = document.getElementById('btn-copy-link');
  const copyFeedback = document.getElementById('copy-feedback');
  const qrcodeContainer = document.getElementById('qrcode-container');
  let qrcodeInstance = null;

  const giftModal = document.getElementById('gift-modal');
  const closeGiftModal = document.getElementById('close-gift-modal');
  const btnGiftReplay = document.getElementById('btn-gift-replay-fireworks');

  // Romantic Modals & Buttons
  const polaroidsModal = document.getElementById('polaroids-modal');
  const closePolaroidsModal = document.getElementById('close-polaroids-modal');
  const btnMemoryGallery = document.getElementById('btn-memory-gallery');
  const btnOpenCustomizerFromPolaroids = document.getElementById('btn-open-customizer-from-polaroids');
  const btnLoveLetter = document.getElementById('btn-love-letter');

  // Feature buttons (inside drawer)
  const btnSparklerWand = document.getElementById('btn-sparkler-wand');
  const btnArcadeGame = document.getElementById('btn-arcade-game');
  const btnSkyLanterns = document.getElementById('btn-sky-lanterns');
  const btnPhotoBooth = document.getElementById('btn-photo-booth');

  // Free play bottom buttons
  const btnBlowCandles = document.getElementById('btn-blow-candles');
  const btnLaunchFireworks = document.getElementById('btn-launch-fireworks');
  const btnOpenGift = document.getElementById('btn-open-gift');
  const btnSpawnBalloons = document.getElementById('btn-spawn-balloons');

  // Arcade elements
  const arcadeHud = document.getElementById('arcade-hud');
  const arcadeScoreVal = document.getElementById('arcade-score');
  const arcadeTimerVal = document.getElementById('arcade-timer');
  const arcadeComboVal = document.getElementById('arcade-combo');
  const arcadeTimerFill = document.getElementById('arcade-timer-fill');
  const btnQuitArcade = document.getElementById('btn-quit-arcade');
  const arcadeOverModal = document.getElementById('arcade-over-modal');
  const finalScoreVal = document.getElementById('final-score-val');
  const finalRankBadge = document.getElementById('final-rank-badge');
  const btnReplayArcade = document.getElementById('btn-replay-arcade');
  const btnCloseArcadeModal = document.getElementById('btn-close-arcade-modal');

  // Photo Booth Modal
  const photoBoothModal = document.getElementById('photo-booth-modal');
  const closePhotoModal = document.getElementById('close-photo-modal');
  const postcardPreviewImg = document.getElementById('postcard-preview-img');
  const btnDownloadPostcard = document.getElementById('btn-download-postcard');

  // Camera buttons (inside drawer)
  const camPills = {
    orbit: document.getElementById('cam-orbit'),
    cake: document.getElementById('cam-cake'),
    gift: document.getElementById('cam-gift'),
    fireworks: document.getElementById('cam-fireworks'),
  };

  // Sparkler Canvas Init
  const sparklerCanvas = document.getElementById('sparkler-canvas');
  if (sparklerCanvas) {
    sparklerCanvas.width = window.innerWidth;
    sparklerCanvas.height = window.innerHeight;
  }

  /* =========================================================
     FALLING ROSE PETALS 2D CANVAS OVERLAY
     ========================================================= */
  const petalsCanvas = document.getElementById('rose-petals-canvas');
  let petalsEnabled = true;
  let petalsList = [];

  function initPetals() {
    if (!petalsCanvas) return;
    petalsCanvas.width = window.innerWidth;
    petalsCanvas.height = window.innerHeight;
    petalsList = [];

    const petalColors = ['#ff0a54', '#ff4d6d', '#ff758c', '#ffb3c1', '#c9184a'];
    for (let i = 0; i < 45; i++) {
      petalsList.push({
        x: Math.random() * petalsCanvas.width,
        y: Math.random() * petalsCanvas.height,
        size: 14 + Math.random() * 16,
        speedY: 1.2 + Math.random() * 2.0,
        speedX: Math.random() * 1.5 - 0.75,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        color: petalColors[i % petalColors.length],
        swayAngle: Math.random() * Math.PI * 2,
        swaySpeed: 0.02 + Math.random() * 0.02
      });
    }
  }

  function drawPetals() {
    if (!petalsCanvas || !petalsEnabled) return;
    const ctx = petalsCanvas.getContext('2d');
    ctx.clearRect(0, 0, petalsCanvas.width, petalsCanvas.height);

    for (let i = 0; i < petalsList.length; i++) {
      const p = petalsList[i];
      p.y += p.speedY;
      p.swayAngle += p.swaySpeed;
      p.x += Math.sin(p.swayAngle) * 1.2 + p.speedX;
      p.rotation += p.rotSpeed;

      if (p.y > petalsCanvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * petalsCanvas.width;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.shadowColor = 'rgba(255, 117, 140, 0.4)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.55, p.size * 0.85, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    requestAnimationFrame(drawPetals);
  }

  initPetals();
  requestAnimationFrame(drawPetals);

  window.addEventListener('resize', () => {
    if (petalsCanvas) {
      petalsCanvas.width = window.innerWidth;
      petalsCanvas.height = window.innerHeight;
    }
  });

  if (quickPetalsBtn) {
    quickPetalsBtn.addEventListener('click', () => {
      petalsEnabled = !petalsEnabled;
      if (petalsCanvas) {
        if (petalsEnabled) {
          petalsCanvas.classList.remove('disabled');
          quickPetalsBtn.classList.add('active');
          requestAnimationFrame(drawPetals);
        } else {
          petalsCanvas.classList.add('disabled');
          quickPetalsBtn.classList.remove('active');
        }
      }
    });
  }

  /* =========================================================
     MENU DRAWER CONTROLS (3-LINE HAMBURGER)
     ========================================================= */
  function openMenuDrawer() {
    menuDrawer.classList.add('open');
    menuDrawerBackdrop.classList.add('show');
  }

  function closeMenuDrawer() {
    menuDrawer.classList.remove('open');
    menuDrawerBackdrop.classList.remove('show');
  }

  mainMenuBtn.addEventListener('click', openMenuDrawer);
  closeMenuBtn.addEventListener('click', closeMenuDrawer);
  menuDrawerBackdrop.addEventListener('click', closeMenuDrawer);

  // Romantic Intermediate Chat Elements
  const romanticChatScreen = document.getElementById('romantic-chat-screen');
  const chatFloatingHearts = document.getElementById('chat-floating-hearts');
  const chatLiveStatus = document.getElementById('chat-live-status');
  const chatStepCounter = document.getElementById('chat-step-counter');
  const btnSkipChat = document.getElementById('btn-skip-chat');
  const chatMessagesScroll = document.getElementById('chat-messages-scroll');
  const chatTypingIndicator = document.getElementById('chat-typing-indicator');
  const chatQuickReplies = document.getElementById('chat-quick-replies');
  const chatUserInput = document.getElementById('chat-user-input');
  const chatEmojiHeartBtn = document.getElementById('chat-emoji-heart-btn');
  const chatSendBtn = document.getElementById('chat-send-btn');
  const chatFooterActions = document.getElementById('chat-footer-actions');
  const btnGoToOrder = document.getElementById('btn-go-to-order');
  const btnEnter3DWorld = document.getElementById('btn-enter-3d-world');

  // WhatsApp-Style Quote Bar Elements
  const chatQuoteBarContainer = document.getElementById('chat-quote-bar-container');
  const quoteChapterTitle = document.getElementById('quote-chapter-title');
  const quoteChapterDesc = document.getElementById('quote-chapter-desc');
  const btnCancelQuote = document.getElementById('btn-cancel-quote');

  // 2-Way Live Follow-up Chat & Quote State
  let activeFollowUpQuote = null; // { chapterNum, heading, snippet }
  let isAutomatedChatPaused = false; // Set to true when she follows up on a chapter
  let liveChatBus = null;
  try {
    liveChatBus = new BroadcastChannel('birthday_live_bus');
  } catch(e) {}

  // Robust User Key Resolver for live progress & 2-way chat
  function getRecipientUserKey() {
    const params = new URLSearchParams(window.location.search || window.location.hash.replace(/^#/, '?'));
    if (params.has('u') && params.get('u').trim()) {
      return params.get('u').trim().toLowerCase();
    }
    if (currentPortalUser) {
      return currentPortalUser.trim().toLowerCase();
    }
    try {
      const session = localStorage.getItem('birthday_portal_session');
      if (session) return session.trim().toLowerCase();
    } catch(e) {}
    return 'user';
  }

  // Recipient Activity Tracking Helper
  function trackRecipientActivity(action, details, icon = '✨') {
    const username = getRecipientUserKey();
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const actData = { action, details, icon, time: timeStr, username };

    if (liveChatBus) {
      try { liveChatBus.postMessage({ type: 'activity', data: actData }); } catch(e) {}
    }

    fetch(`${API_BASE}/api/track_activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actData)
    }).catch(() => {});
  }

  // Cancel Quote Button Handler
  if (btnCancelQuote) {
    btnCancelQuote.addEventListener('click', () => {
      activeFollowUpQuote = null;
      if (chatQuoteBarContainer) chatQuoteBarContainer.classList.add('hidden');
      if (chatUserInput) {
        chatUserInput.placeholder = isAutomatedChatPaused ? "Type your message to him..." : "Please enter your reply...";
      }
    });
  }

  // 5 Romantic Questions from Boyfriend to Girlfriend
  const romanticQuestions = [
    {
      question: "Hey prettiest girl... 💕 Do you know who is the luckiest guy in the entire universe today? (Hint: The one typing this for you ❤️)",
      suggestions: ["You are! 🥰", "My handsome boy ❤️", "Aww so sweet! 💕"]
    },
    {
      question: "What is the one thing that made you smile the most this past year? 🥰",
      suggestions: ["Being with you! ❤️", "All our cute calls 📱", "Your sweet surprises 🎁"]
    },
    {
      question: "If you could make one magical birthday wish right this second, what would it be? ✨",
      suggestions: ["To stay by your side forever 💕", "Lots of happiness & love 🌸", "A big tight hug right now! 🫂"]
    },
    {
      question: "What is your absolute favorite memory of us together so far? 💕",
      suggestions: ["Every moment with you 🥰", "Our late night talks 🌙", "Our first date 🌹"]
    },
    {
      question: "Are you ready to step into your grand 3D birthday surprise wonderland now, my princess? 👑🎂",
      suggestions: ["Yes, take me there! ✨", "Can't wait! 🎉", "Let's celebrate! 💖"]
    }
  ];

  let currentQuestionIndex = 0;
  let isTypingQuestion = false;

  /* =========================================================
     FLOATING HEARTS GENERATOR FOR CHAT SCREEN
     ========================================================= */
  function initFloatingChatHearts() {
    if (!chatFloatingHearts) return;
    chatFloatingHearts.innerHTML = '';
    const heartEmojis = ['💖', '💕', '💗', '💓', '✨', '🌹'];
    for (let i = 0; i < 15; i++) {
      const heart = document.createElement('div');
      heart.className = 'floating-heart-item';
      heart.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
      heart.style.left = `${Math.random() * 95}%`;
      heart.style.animationDuration = `${5 + Math.random() * 6}s`;
      heart.style.animationDelay = `${Math.random() * 5}s`;
      heart.style.fontSize = `${1.2 + Math.random() * 1.2}rem`;
      chatFloatingHearts.appendChild(heart);
    }
  }

  /* =========================================================
     STEP 1: INTRO CURTAIN OPEN -> STEP 2: ROMANTIC LIVE CHAT
     ========================================================= */
  btnStartCelebration.addEventListener('click', () => {
    // Open royal curtains
    curtainContainer.classList.add('opened');
    
    // Track activity
    trackRecipientActivity('curtains_opened', `Opened Royal Velvet Curtains & Started Celebration 💖`, '👑');

    // Play sound & initial confetti
    if (window.birthdayAudio) {
      window.birthdayAudio.init();
      window.birthdayAudio.playGiftOpen();
    }
    if (window.confetti) {
      window.confetti({ particleCount: 50, spread: 80, origin: { y: 0.5 } });
    }

    // Reveal Romantic Intermediate Chat Screen
    if (romanticChatScreen) {
      setTimeout(() => {
        romanticChatScreen.classList.remove('hidden');
        initFloatingChatHearts();
        startRomanticChatJourney();
      }, 400);
    } else {
      transitionFromChatTo3D();
    }
  });

  /* =========================================================
     STEP 2 CONTROLLER: LIVE CHAT TYPEWRITER JOURNEY
     ========================================================= */
  function startRomanticChatJourney() {
    currentQuestionIndex = 0;
    // Clear previous messages except typing indicator
    if (chatMessagesScroll) {
      const rows = chatMessagesScroll.querySelectorAll('.chat-msg-row');
      rows.forEach(r => r.remove());
    }
    if (chatFooterActions) chatFooterActions.classList.add('hidden');
    
    // Start typing Question 1 after a gentle delay
    setTimeout(() => {
      typeNextQuestion();
    }, 600);
  }

  function typeNextQuestion() {
    // If automated questioning is paused because she's having a 2-way follow-up conversation, halt!
    if (isAutomatedChatPaused) return;

    if (currentQuestionIndex >= romanticQuestions.length) {
      finishChatJourney();
      return;
    }

    isTypingQuestion = true;
    const qData = romanticQuestions[currentQuestionIndex];
    if (chatStepCounter) chatStepCounter.textContent = currentQuestionIndex + 1;
    if (chatLiveStatus) chatLiveStatus.textContent = "Typing with love...";

    // Disable input while boyfriend is typing
    if (chatUserInput) {
      chatUserInput.disabled = true;
      chatUserInput.value = '';
      chatUserInput.placeholder = "Boyfriend is typing a question...";
    }
    if (chatSendBtn) chatSendBtn.disabled = true;
    if (chatQuickReplies) chatQuickReplies.innerHTML = '';

    // Show 3-dot typing indicator
    if (chatTypingIndicator) {
      chatTypingIndicator.classList.remove('hidden');
      chatMessagesScroll.appendChild(chatTypingIndicator);
      scrollChatToBottom();
    }

    // Simulate typing delay before stream starts
    setTimeout(() => {
      if (chatTypingIndicator) chatTypingIndicator.classList.add('hidden');

      // Create boyfriend message bubble container
      const msgRow = document.createElement('div');
      msgRow.className = 'chat-msg-row boyfriend-row';

      const avatar = document.createElement('div');
      avatar.className = 'chat-bubble-avatar';
      avatar.textContent = '👦';

      const bubble = document.createElement('div');
      bubble.className = 'chat-msg-bubble boyfriend-bubble';

      const textSpan = document.createElement('span');
      textSpan.className = 'chat-bubble-text';

      const cursor = document.createElement('span');
      cursor.className = 'chat-live-cursor';

      bubble.appendChild(textSpan);
      bubble.appendChild(cursor);
      msgRow.appendChild(avatar);
      msgRow.appendChild(bubble);

      chatMessagesScroll.appendChild(msgRow);
      scrollChatToBottom();

      // Stream text letter-by-letter / word-by-word
      const textToType = qData.question;
      let charIdx = 0;

      const typeInterval = setInterval(() => {
        if (charIdx < textToType.length) {
          textSpan.textContent += textToType[charIdx];
          charIdx++;
          scrollChatToBottom();
        } else {
          clearInterval(typeInterval);
          cursor.remove();
          
          // Add timestamp
          const timeSpan = document.createElement('div');
          timeSpan.className = 'chat-bubble-time';
          const now = new Date();
          timeSpan.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
          bubble.appendChild(timeSpan);

          isTypingQuestion = false;
          if (chatLiveStatus) chatLiveStatus.textContent = "Online • Waiting for your reply 💕";

          // Enable user input & populate suggestions
          enableUserReplyInput(qData.suggestions);
        }
      }, 32);

    }, 850);
  }

  function enableUserReplyInput(suggestions = []) {
    if (chatUserInput) {
      chatUserInput.disabled = false;
      chatUserInput.placeholder = "Please enter your reply...";
      chatUserInput.focus();
    }

    // Populate quick response pills
    if (chatQuickReplies) {
      chatQuickReplies.innerHTML = '';
      suggestions.forEach(text => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'quick-reply-pill';
        pill.innerHTML = `<span>${text}</span>`;
        pill.addEventListener('click', () => {
          sendGirlfriendReply(text);
        });
        chatQuickReplies.appendChild(pill);
      });
    }

    if (chatSendBtn) chatSendBtn.disabled = !chatUserInput.value.trim();
  }

  // Chat History Modal & Corner Button Elements
  const floatingChatHistoryBtn = document.getElementById('floating-chat-history-btn');
  const btnDrawerChatHistory = document.getElementById('btn-drawer-chat-history');
  const chatHistoryModal = document.getElementById('chat-history-modal');
  const closeChatHistoryModal = document.getElementById('close-chat-history-modal');
  const chatHistoryContent = document.getElementById('chat-history-content');
  const chatHistoryBadgeCount = document.getElementById('chat-history-badge-count');
  const btnCopyChatHistory = document.getElementById('btn-copy-chat-history');
  const btnClearChatHistory = document.getElementById('btn-clear-chat-history');
  const historyCopyFeedback = document.getElementById('history-copy-feedback');

  function getSavedChatHistory() {
    try {
      const data = localStorage.getItem('birthday_chat_history');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveChatMessageToHistory(entry) {
    try {
      const history = getSavedChatHistory();
      history.push(entry);
      localStorage.setItem('birthday_chat_history', JSON.stringify(history));
      updateChatHistoryBadge();
    } catch (e) {
      console.warn('Could not save chat history to localStorage', e);
    }
  }

  function updateChatHistoryBadge() {
    const history = getSavedChatHistory();
    if (chatHistoryBadgeCount) {
      if (history.length > 0) {
        chatHistoryBadgeCount.textContent = history.length;
        chatHistoryBadgeCount.classList.remove('hidden');
      } else {
        chatHistoryBadgeCount.classList.add('hidden');
      }
    }
  }

  function openChatHistoryModalView() {
    renderChatHistoryUI();
    if (chatHistoryModal) {
      chatHistoryModal.classList.add('show');
    }
  }

  function renderChatHistoryUI() {
    if (!chatHistoryContent) return;
    const history = getSavedChatHistory();

    if (history.length === 0) {
      chatHistoryContent.innerHTML = `
        <div class="chat-history-empty">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">💌</div>
          <div><strong>No chat answers recorded yet!</strong></div>
          <div style="font-size: 0.85rem; margin-top: 4px; opacity: 0.8;">Once she answers the sweet questions during the birthday chat, her responses will be automatically saved here for you! 💕</div>
        </div>
      `;
      return;
    }

    let html = '';
    history.forEach((item, idx) => {
      html += `
        <div class="chat-history-item">
          <div class="history-q-box">
            <span class="history-q-icon">👦</span>
            <div><strong>Q${idx + 1}:</strong> ${item.question || ''}</div>
          </div>
          <div class="history-a-box">
            <span class="history-a-icon">👸</span>
            <div><strong>Her Answer:</strong> "${item.reply || ''}"</div>
          </div>
          <div class="history-timestamp">
            <i class="fa-regular fa-clock"></i> ${item.time || ''} ${item.date ? '• ' + item.date : ''}
          </div>
        </div>
      `;
    });

    chatHistoryContent.innerHTML = html;
  }

  if (floatingChatHistoryBtn) {
    floatingChatHistoryBtn.addEventListener('click', openChatHistoryModalView);
  }

  if (btnDrawerChatHistory) {
    btnDrawerChatHistory.addEventListener('click', () => {
      closeMenuDrawer();
      openChatHistoryModalView();
    });
  }

  if (closeChatHistoryModal) {
    closeChatHistoryModal.addEventListener('click', () => {
      chatHistoryModal.classList.remove('show');
    });
  }

  if (btnCopyChatHistory) {
    btnCopyChatHistory.addEventListener('click', () => {
      const history = getSavedChatHistory();
      if (history.length === 0) {
        alert("No answers to copy yet! 💕");
        return;
      }
      let copyText = `💖 HER SWEET BIRTHDAY CHAT ANSWERS 💖\n`;
      copyText += `Celebrant: ${celebrantName}\n\n`;
      history.forEach((item, idx) => {
        copyText += `Question ${idx + 1}: ${item.question}\n`;
        copyText += `Her Reply: "${item.reply}" (${item.time || ''})\n\n`;
      });

      try {
        navigator.clipboard.writeText(copyText).then(() => {
          if (historyCopyFeedback) {
            historyCopyFeedback.classList.add('show');
            setTimeout(() => historyCopyFeedback.classList.remove('show'), 3000);
          }
        }).catch(() => {
          alert("Answers copied!\n\n" + copyText);
        });
      } catch(err) {
        alert("Answers copied!\n\n" + copyText);
      }
    });
  }

  if (btnClearChatHistory) {
    btnClearChatHistory.addEventListener('click', () => {
      if (confirm("Are you sure you want to clear saved chat history?")) {
        try {
          localStorage.removeItem('birthday_chat_history');
          updateChatHistoryBadge();
          renderChatHistoryUI();
        } catch(e) {}
      }
    });
  }

  updateChatHistoryBadge();

  function syncAnswerToTelegram(data) {
    // 1. Send to local Telegram bot API server
    try {
      fetch(`${API_BASE}/api/notify_answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(() => {});
    } catch(e) {}

    // Telegram notification is handled server-side via /api/notify_answer
  }

  function sendGirlfriendReply(replyText) {
    const text = replyText || (chatUserInput ? chatUserInput.value.trim() : '');
    if (!text || isTypingQuestion) return;

    const currentQData = romanticQuestions[currentQuestionIndex];
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const quotedData = activeFollowUpQuote ? { ...activeFollowUpQuote } : null;

    // Reset quote bar if active
    if (activeFollowUpQuote) {
      activeFollowUpQuote = null;
      if (chatQuoteBarContainer) chatQuoteBarContainer.classList.add('hidden');
    }

    // Create girlfriend message bubble (with optional WhatsApp-style quote banner inside)
    const msgRow = document.createElement('div');
    msgRow.className = 'chat-msg-row girlfriend-row';

    const bubble = document.createElement('div');
    bubble.className = 'chat-msg-bubble girlfriend-bubble';

    if (quotedData) {
      const quoteBox = document.createElement('div');
      quoteBox.className = 'msg-quote-preview-bubble';
      quoteBox.innerHTML = `
        <div class="quote-mini-title"><i class="fa-solid fa-feather-pointed"></i> Chapter ${quotedData.chapterNum || ''}: ${quotedData.heading || ''}</div>
        <div class="quote-mini-desc">"${(quotedData.snippet || '').substring(0, 75)}..."</div>
      `;
      bubble.appendChild(quoteBox);
    }

    const textSpan = document.createElement('span');
    textSpan.className = 'chat-bubble-text';
    textSpan.textContent = text;

    const timeSpan = document.createElement('div');
    timeSpan.className = 'chat-bubble-time';
    timeSpan.textContent = timeStr;

    bubble.appendChild(textSpan);
    bubble.appendChild(timeSpan);

    const avatar = document.createElement('div');
    avatar.className = 'chat-bubble-avatar';
    avatar.textContent = '👸';

    msgRow.appendChild(bubble);
    msgRow.appendChild(avatar);

    chatMessagesScroll.appendChild(msgRow);
    scrollChatToBottom();

    // If she is in follow-up / 2-way live chat mode:
    if (isAutomatedChatPaused || quotedData) {
      isAutomatedChatPaused = true;

      // Reset input for next custom live message
      if (chatUserInput) {
        chatUserInput.value = '';
        chatUserInput.disabled = false;
        chatUserInput.placeholder = "Type your message to him...";
        chatUserInput.focus();
      }
      if (chatSendBtn) chatSendBtn.disabled = true;
      if (chatQuickReplies) chatQuickReplies.innerHTML = '';
      if (chatLiveStatus) chatLiveStatus.textContent = "Live Chat Connected 💕";

      // Dispatch 2-way live chat message to backend server
      const username = getRecipientUserKey();
      const livePayload = {
        username: username,
        sender: 'celebrant',
        text: text,
        quote: quotedData,
        time: timeStr
      };

      fetch(`${API_BASE}/api/live_chat_send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(livePayload)
      }).catch(() => {});

      if (liveChatBus) {
        try {
          liveChatBus.postMessage({ type: 'live_chat_msg', data: livePayload });
        } catch(e) {}
      }

      // Track activity
      trackRecipientActivity('live_chat_msg', `Girlfriend sent: "${text.substring(0, 35)}..."`, '💬');

      // Play sweet chime
      try {
        if (window.birthdayAudio) {
          window.birthdayAudio.init();
          if (typeof window.birthdayAudio.playChimeTone === 'function' && window.birthdayAudio.ctx) {
            window.birthdayAudio.playChimeTone(659.25, window.birthdayAudio.ctx.currentTime, 0.35, 0.3);
          }
        }
      } catch(e) {}

      if (window.confetti) {
        window.confetti({ particleCount: 25, spread: 55, origin: { y: 0.7 } });
      }

      // Do NOT auto-advance romanticQuestions while in 2-way follow-up conversation!
      return;
    }

    // Default automated questionnaire flow
    if (chatUserInput) {
      chatUserInput.value = '';
      chatUserInput.disabled = true;
      chatUserInput.placeholder = "Sending love... 💕";
    }
    if (chatSendBtn) chatSendBtn.disabled = true;
    if (chatQuickReplies) chatQuickReplies.innerHTML = '';

    // Save answer into persistent local storage for boyfriend to view anytime
    const answerData = {
      index: currentQuestionIndex + 1,
      questionNumber: currentQuestionIndex + 1,
      question: currentQData ? currentQData.question : `Question ${currentQuestionIndex + 1}`,
      reply: text,
      celebrant: celebrantName || 'Girlfriend',
      time: timeStr,
      date: now.toLocaleDateString()
    };
    saveChatMessageToHistory(answerData);

    // Sync in real-time to Telegram Bot API
    syncAnswerToTelegram(answerData);

    // Play sweet chime safely
    try {
      if (window.birthdayAudio) {
        window.birthdayAudio.init();
        if (typeof window.birthdayAudio.playChimeTone === 'function' && window.birthdayAudio.ctx) {
          window.birthdayAudio.playChimeTone(659.25, window.birthdayAudio.ctx.currentTime, 0.35, 0.3);
        }
      }
    } catch(err) {
      console.log('Audio notice:', err);
    }

    // Mini confetti on reply
    if (window.confetti) {
      window.confetti({ particleCount: 25, spread: 55, origin: { y: 0.7 } });
    }

    // Move to next question smoothly
    currentQuestionIndex++;
    if (currentQuestionIndex < romanticQuestions.length) {
      setTimeout(() => {
        typeNextQuestion();
      }, 700);
    } else {
      setTimeout(() => {
        finishChatJourney();
      }, 900);
    }
  }

  // Receive Creator's Live Replies in Girlfriend's Chat Screen via BroadcastChannel & Polling
  function receiveCreatorLiveMessage(msgData) {
    if (!msgData || msgData.sender !== 'creator') return;

    const msgRow = document.createElement('div');
    msgRow.className = 'chat-msg-row boyfriend-row live-incoming';

    const avatar = document.createElement('div');
    avatar.className = 'chat-bubble-avatar';
    avatar.textContent = '👦';

    const bubble = document.createElement('div');
    bubble.className = 'chat-msg-bubble boyfriend-bubble';

    const textSpan = document.createElement('span');
    textSpan.className = 'chat-bubble-text';
    textSpan.textContent = msgData.text;

    const timeSpan = document.createElement('div');
    timeSpan.className = 'chat-bubble-time';
    timeSpan.textContent = msgData.time || `${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}`;

    bubble.appendChild(textSpan);
    bubble.appendChild(timeSpan);

    msgRow.appendChild(avatar);
    msgRow.appendChild(bubble);

    if (chatMessagesScroll) {
      chatMessagesScroll.appendChild(msgRow);
      scrollChatToBottom();
    }

    if (chatLiveStatus) {
      chatLiveStatus.textContent = "Boyfriend replied 💕";
    }

    // Play chime tone
    try {
      if (window.birthdayAudio) {
        window.birthdayAudio.init();
        if (typeof window.birthdayAudio.playChimeTone === 'function' && window.birthdayAudio.ctx) {
          window.birthdayAudio.playChimeTone(523.25, window.birthdayAudio.ctx.currentTime, 0.4, 0.35);
        }
      }
    } catch(e) {}
  }

  if (liveChatBus) {
    liveChatBus.onmessage = (event) => {
      const { type, data } = event.data || {};
      if (type === 'live_chat_msg' && data && data.sender === 'creator') {
        receiveCreatorLiveMessage(data);
      }
    };
  }

  function finishChatJourney() {
    if (chatLiveStatus) chatLiveStatus.textContent = "So in love with you! 💖";
    if (chatUserInput) {
      chatUserInput.disabled = true;
      chatUserInput.placeholder = "All 5 questions answered with love! 💕";
    }
    if (chatSendBtn) chatSendBtn.disabled = true;
    if (chatQuickReplies) chatQuickReplies.innerHTML = '';

    // Show sweet concluding boyfriend message
    const msgRow = document.createElement('div');
    msgRow.className = 'chat-msg-row boyfriend-row';

    const avatar = document.createElement('div');
    avatar.className = 'chat-bubble-avatar';
    avatar.textContent = '👦';

    const bubble = document.createElement('div');
    bubble.className = 'chat-msg-bubble boyfriend-bubble';
    bubble.innerHTML = `
      <div style="font-size: 1.05rem; font-weight: 700; color: #ffccd5; margin-bottom: 4px;">Aww, you have my whole heart! 💖</div>
      <div>Happy Birthday to the love of my life! Every second with you is a blessing. All your sweet answers are saved in our Chat History! Now let's enter your grand 3D birthday surprise wonderland! 🎉🎂✨</div>
      <div class="chat-bubble-time">${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}</div>
    `;

    msgRow.appendChild(avatar);
    msgRow.appendChild(bubble);
    chatMessagesScroll.appendChild(msgRow);
    scrollChatToBottom();

    // Big celebration fanfare
    if (window.confetti) {
      window.confetti({ particleCount: 100, spread: 90, origin: { y: 0.55 } });
    }
    try {
      if (window.birthdayAudio) {
        window.birthdayAudio.init();
        if (typeof window.birthdayAudio.playGiftOpen === 'function') {
          window.birthdayAudio.playGiftOpen();
        }
      }
    } catch(err) {}

    // Reveal Action Buttons: "Go to Order" and "Enter 3D Birthday World"
    if (chatFooterActions) {
      chatFooterActions.classList.remove('hidden');
    }
  }

  function scrollChatToBottom() {
    if (chatMessagesScroll) {
      chatMessagesScroll.scrollTop = chatMessagesScroll.scrollHeight;
    }
  }

  // Input events
  if (chatUserInput) {
    chatUserInput.addEventListener('input', () => {
      if (chatSendBtn) {
        chatSendBtn.disabled = !chatUserInput.value.trim();
      }
    });

    chatUserInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendGirlfriendReply();
      }
    });
  }

  if (chatEmojiHeartBtn) {
    chatEmojiHeartBtn.addEventListener('click', () => {
      if (chatUserInput && !chatUserInput.disabled) {
        chatUserInput.value += '💖';
        chatUserInput.focus();
        if (chatSendBtn) chatSendBtn.disabled = false;
      }
    });
  }

  if (chatSendBtn) {
    chatSendBtn.addEventListener('click', () => sendGirlfriendReply());
  }

  // "Go to Order" Full Screen Page Elements
  const orderHubFullscreenPage = document.getElementById('order-hub-fullscreen-page');
  const btnOrderBackToStory = document.getElementById('btn-order-back-to-story');
  const btnOrderFooterBack = document.getElementById('btn-order-footer-back');
  const btnOrderNavEnter3D = document.getElementById('btn-order-nav-enter-3d');
  const btnOrderFooter3D = document.getElementById('btn-order-footer-3d');
  const btnDrawerOrderHub = document.getElementById('btn-drawer-order-hub');
  const orderFilterPills = document.querySelectorAll('.order-filter-pill');

  function openFullScreenOrderHub() {
    if (romanticChatScreen) romanticChatScreen.classList.add('hidden');
    if (orderHubFullscreenPage) {
      orderHubFullscreenPage.classList.remove('hidden');
      orderHubFullscreenPage.scrollTop = 0;
      if (window.birthdayAudio) {
        try { window.birthdayAudio.playGiftOpen(); } catch(e) {}
      }
      if (window.confetti) {
        window.confetti({ particleCount: 35, spread: 65, origin: { y: 0.6 } });
      }
    }
  }

  function closeFullScreenOrderHub() {
    if (orderHubFullscreenPage) orderHubFullscreenPage.classList.add('hidden');
    if (romanticChatScreen) romanticChatScreen.classList.remove('hidden');
  }

  if (btnGoToOrder) {
    btnGoToOrder.addEventListener('click', openFullScreenOrderHub);
  }

  if (btnDrawerOrderHub) {
    btnDrawerOrderHub.addEventListener('click', () => {
      closeMenuDrawer();
      openFullScreenOrderHub();
    });
  }

  if (btnOrderBackToStory) {
    btnOrderBackToStory.addEventListener('click', closeFullScreenOrderHub);
  }

  if (btnOrderFooterBack) {
    btnOrderFooterBack.addEventListener('click', closeFullScreenOrderHub);
  }

  if (btnOrderNavEnter3D) {
    btnOrderNavEnter3D.addEventListener('click', () => {
      if (orderHubFullscreenPage) orderHubFullscreenPage.classList.add('hidden');
      transitionFromChatTo3D();
    });
  }

  if (btnOrderFooter3D) {
    btnOrderFooter3D.addEventListener('click', () => {
      if (orderHubFullscreenPage) orderHubFullscreenPage.classList.add('hidden');
      transitionFromChatTo3D();
    });
  }

  // Filter Pills for Store Apps (Zomato, Swiggy, Blinkit, Amazon, etc.)
  if (orderFilterPills) {
    orderFilterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        orderFilterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const filterKey = pill.getAttribute('data-filter');
        const sections = document.querySelectorAll('.store-app-section');

        sections.forEach(sec => {
          const storeKey = sec.getAttribute('data-store');
          if (filterKey === 'all' || filterKey === storeKey) {
            sec.style.display = 'flex';
          } else {
            sec.style.display = 'none';
          }
        });
      });
    });
  }

  // "Enter 3D Birthday World" and "Skip to 3D" buttons
  function transitionFromChatTo3D() {
    if (romanticChatScreen) {
      romanticChatScreen.style.opacity = '0';
      romanticChatScreen.style.transform = 'scale(0.95)';
      setTimeout(() => {
        romanticChatScreen.classList.add('hidden');
        romanticChatScreen.style.opacity = '';
        romanticChatScreen.style.transform = '';
      }, 500);
    }

    currentStoryStep = 'balloons';

    // Smoothly animate 3D camera to grand celebration angle
    const grandCam = scene.getCelebrationCameraCoords();
    gsap.to(scene.camera.position, {
      x: grandCam.pos.x,
      y: grandCam.pos.y,
      z: grandCam.pos.z,
      duration: 1.6,
      ease: 'power2.out'
    });
    gsap.to(scene.controls.target, {
      x: grandCam.target.x,
      y: grandCam.target.y,
      z: grandCam.target.z,
      duration: 1.6,
      ease: 'power2.out'
    });

    // Play music & fireworks
    if (window.birthdayAudio) {
      window.birthdayAudio.init();
      window.birthdayAudio.playGiftOpen();
    }
    if (window.confetti) {
      window.confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } });
    }
  }

  if (btnEnter3DWorld) {
    btnEnter3DWorld.addEventListener('click', transitionFromChatTo3D);
  }

  if (btnSkipChat) {
    btnSkipChat.addEventListener('click', transitionFromChatTo3D);
  }

  /* =========================================================
     STEP 3: TO REVEAL CAKE - BURST BALLOONS AROUND CAKE
     ========================================================= */
  window.onTableBalloonPopped = (remaining) => {
    trackRecipientActivity('balloon_popped', `Popped table balloon (${5 - remaining}/5) 🎈`, '🎈');
    if (questBalloonCount) questBalloonCount.textContent = remaining;
    if (questDescText && remaining > 0) {
      questDescText.textContent = `around the cake to reveal the surprise`;
    }

    // Update progress dots (gray out popped ones)
    for (let i = 0; i < 5; i++) {
      const dot = document.getElementById(`dot-${i}`);
      if (dot) {
        if (i < 5 - remaining) {
          dot.classList.remove('active');
        } else {
          dot.classList.add('active');
        }
      }
    }

    if (remaining === 0) {
      trackRecipientActivity('all_balloons_popped', 'Popped all 5 balloons — 3D Birthday Cake revealed! 🎂', '🎂');
      if (questTitleText) questTitleText.textContent = `✨ ALL BALLOONS BURST! ✨`;
      if (questDescText) questDescText.textContent = `Revealing the Birthday Cake... 🎂`;

      // 1-second pause, then zoom in & lift cloth
      setTimeout(() => {
        scene.liftAndRemoveCloth(() => {
          // Cloth removed -> Hide main screen quest card and show Burn Candles button
          if (mainScreenQuestCard) mainScreenQuestCard.classList.add('hidden');
          stepBurnCandles.classList.remove('hidden');
          currentStoryStep = 'burn-candles';
        });
      }, 1000);
    }
  };

  /* =========================================================
     STEP 3: BURN CANDLES ("BURN CANDLE")
     ========================================================= */
  stepBurnCandles.addEventListener('click', () => {
    trackRecipientActivity('candles_lit', 'Lit romantic candles on 3D Birthday Cake 🕯️', '🕯️');
    scene.lightCandles();

    // Transition to Step 4 (Cut the Cake)
    stepBurnCandles.classList.add('hidden');
    stepCutCake.classList.remove('hidden');
    currentStoryStep = 'cut-cake';
  });

  /* =========================================================
     STEP 4: CUT THE CAKE -> 3S FIREWORKS + SONG
     ========================================================= */
  stepCutCake.addEventListener('click', () => {
    trackRecipientActivity('cake_cut', 'Cut the 3D Birthday Cake & celebrated with fireworks! 🍰✨', '🍰');
    stepCutCake.classList.add('hidden');

    scene.cutCakeAndCelebrate(() => {
      // After 3-second fireworks finish -> Transition to Step 5 (Open Gift)
      stepOpenGift.classList.remove('hidden');
      currentStoryStep = 'open-gift';
    });
  });

  /* =========================================================
     STEP 5: BRING GIFT FORWARD & TAP TO OPEN
     ========================================================= */
  stepOpenGift.addEventListener('click', () => {
    trackRecipientActivity('gift_opened', 'Opened surprise 3D gift box with love message 🎁', '🎁');
    stepOpenGift.classList.add('hidden');

    // Fly gift box smoothly to front center
    scene.presentGiftBoxToCenter(() => {
      // Show "Tap Box to Open" notification
      if (tapGiftCard) tapGiftCard.classList.remove('hidden');
    });

    // Unlock full free-play dock
    guidedStoryBar.classList.add('hidden');
    freePlayBottomBar.classList.remove('hidden');
    currentStoryStep = 'free-play';
  });

  // Clicking the floating "Tap Box to Open" badge
  if (tapGiftCard) {
    tapGiftCard.addEventListener('click', () => {
      trackRecipientActivity('gift_opened', 'Opened surprise 3D gift box with love message 🎁', '🎁');
      scene.openGift();
      tapGiftCard.classList.add('hidden');
    });
  }

  /* =========================================================
     URL PARAMETERS & SHARING (PHOTO + NAME + AGE + THEME)
     ========================================================= */
  let currentPhotoDataUrl = null;
  let userMemoriesPhotos = [];
  // Clear any stale local cache from previous sessions
  try {
    localStorage.removeItem('birthday_custom_photo');
  } catch(e) {}

  function compressImage(img, maxWidth = 200, maxHeight = 260, quality = 0.52) {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  async function parseUrlParams() {
    const params = new URLSearchParams(window.location.search || window.location.hash.replace(/^#/, '?'));

    // === SHORT LINK: ?s=TOKEN — fetch all data from server ===
    if (params.has('s') && params.get('s').trim()) {
      const token = params.get('s').trim();
      try {
        const res = await fetch(`${API_BASE}/api/get_surprise?s=${encodeURIComponent(token)}`);
        if (res.status === 410) {
          // Link expired
          document.body.innerHTML = `
            <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;
              background:#12030f;color:#fff;font-family:sans-serif;text-align:center;padding:40px;">
              <div>
                <div style="font-size:3rem;margin-bottom:16px;">⌛💔</div>
                <h2 style="color:#ff758c;">This surprise link has expired!</h2>
                <p style="color:rgba(255,255,255,0.75);">The 48-hour window has passed and this birthday surprise is no longer available. Ask the creator to send a fresh link! 🎁</p>
              </div>
            </div>`;
          return;
        }
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && json.data) {
            const d = json.data;
            if (d.name) { celebrantName = d.name; if (inputName) inputName.value = d.name; }
            if (d.age) { celebrantAge = d.age; if (inputAge) inputAge.value = d.age; }
            if (d.wish) { customWish = d.wish; if (inputWish) inputWish.value = d.wish; }
            if (d.theme) activeTheme = d.theme;
            if (d.memories && Array.isArray(d.memories) && d.memories.length > 0) {
              userMemoriesPhotos = d.memories;
            }
            if (d.safarnama) {
              try {
                const parsed = typeof d.safarnama === 'string'
                  ? JSON.parse(decodeURIComponent(d.safarnama)) : d.safarnama;
                if (Array.isArray(parsed)) userSafarnamaChapters = parsed;
              } catch(e) {}
            }
            let sharedPhoto = d.photo || null;
            currentPhotoDataUrl = sharedPhoto;
            if (sharedPhoto) {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                if (scene) scene.updateUserPhoto(img);
                updateMemoriesPhoto(sharedPhoto, userMemoriesPhotos);
              };
              img.src = sharedPhoto;
            } else {
              updateMemoriesPhoto(null, userMemoriesPhotos);
            }
            updateCelebrantInfo();
            applyTheme(activeTheme);
            return;
          }
        }
      } catch(e) { /* fall through to normal param parsing */ }
    }

    // === LEGACY LONG URL params (backward compat) ===
    if (params.has('name')) {
      celebrantName = params.get('name');
      inputName.value = celebrantName;
    }
    if (params.has('age')) {
      celebrantAge = params.get('age');
      inputAge.value = celebrantAge;
    }
    if (params.has('wish')) {
      customWish = params.get('wish');
      inputWish.value = customWish;
    }
    if (params.has('theme')) {
      activeTheme = params.get('theme');
    }

    // Check shared photo in URL hash/param
    let sharedPhoto = params.get('photo') || null;
    currentPhotoDataUrl = sharedPhoto;
    if (inputPhotoUrl && sharedPhoto && sharedPhoto.startsWith('http')) {
      inputPhotoUrl.value = sharedPhoto;
    }

    // Check memories photos list in URL
    if (params.has('memories')) {
      try {
        const parsed = JSON.parse(decodeURIComponent(params.get('memories')));
        if (Array.isArray(parsed) && parsed.length > 0) {
          userMemoriesPhotos = parsed;
        }
      } catch(e) {}
    }

    if (sharedPhoto) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (scene) scene.updateUserPhoto(img);
        updateMemoriesPhoto(sharedPhoto, userMemoriesPhotos);
      };
      img.src = sharedPhoto;
    } else {
      if (scene && scene.clearUserPhoto) {
        scene.clearUserPhoto();
      }
      updateMemoriesPhoto(null, userMemoriesPhotos);
    }

    updateCelebrantInfo();
    applyTheme(activeTheme);
  }

  function updateCelebrantInfo() {
    const isCustom = celebrantName && celebrantName !== 'Birthday Star';
    const displayName = isCustom ? celebrantName : 'My Love';

    if (isCustom) {
      displayNameText.textContent = celebrantName;
      celebrantTitle.textContent = `Happy Birthday ${celebrantName}!`;
      bannerTitle.textContent = `${celebrantName.toUpperCase()}`;
      document.title = `✨ Happy Birthday ${celebrantName}! 🎉`;
    } else {
      displayNameText.textContent = 'Happy Birthday';
      celebrantTitle.textContent = 'Happy Birthday!';
      bannerTitle.textContent = 'HAPPY BIRTHDAY';
      document.title = '✨ Happy Birthday Celebration! 🎉';
    }

    if (celebrantAge && parseInt(celebrantAge) > 0) {
      displayAgeBadge.textContent = celebrantAge;
      displayAgeBadge.style.display = 'inline-block';
    } else {
      displayAgeBadge.style.display = 'none';
    }

    giftCustomWish.textContent = `"${customWish}"`;

    // --- Update Curtain Intro Screen ---
    const introHeadline = document.querySelector('.intro-headline');
    const introSubtext = document.querySelector('.intro-subtext');
    const introSparkle = document.querySelector('.intro-sparkle-badge');
    if (introHeadline) introHeadline.textContent = `Happy Birthday ${displayName}! ✨`;
    if (introSubtext && customWish && customWish !== 'Happy Birthday!') {
      introSubtext.textContent = customWish.length > 80 ? customWish.substring(0, 80) + '...' : customWish;
    }

    // --- Update Romantic Chat Screen Hero ---
    const romanticHeroTitle = document.querySelector('.romantic-hero-title');
    const romanticHeroSub = document.querySelector('.romantic-hero-subtitle');
    if (romanticHeroTitle) romanticHeroTitle.textContent = `Happy Birthday, ${displayName}! 💖`;
    if (romanticHeroSub && customWish && customWish !== 'Happy Birthday!') {
      const shortWish = customWish.length > 90 ? customWish.substring(0, 90) + '...' : customWish;
      romanticHeroSub.textContent = `"${shortWish}"`;
    }

    // Real-time update to 3D Stand Board, Numeric Candles & Photo Frame
    if (scene && scene.updateCelebrantInfo3D) {
      scene.updateCelebrantInfo3D(celebrantName, celebrantAge);
    }
  }

  // --- Lightbox overlay for full image preview (original resolution) ---
  function openMemoryLightbox(src) {
    if (!src) return;
    let lb = document.getElementById('memory-lightbox-overlay');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'memory-lightbox-overlay';
      lb.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:999999;
        display:flex;align-items:center;justify-content:center;cursor:zoom-out;
        animation:fadeIn 0.2s ease;padding:20px;`;
      const lbImg = document.createElement('img');
      lbImg.id = 'memory-lightbox-img';
      lbImg.style.cssText = `max-width:92vw;max-height:88vh;border-radius:16px;
        box-shadow:0 20px 80px rgba(255,117,140,0.6);object-fit:contain;
        border:3px solid rgba(255,117,140,0.7);background:#12030f;`;
      const lbClose = document.createElement('button');
      lbClose.textContent = '✕';
      lbClose.title = 'Close Photo Preview';
      lbClose.style.cssText = `position:fixed;top:20px;right:24px;background:#ff0a54;
        color:#fff;border:none;border-radius:50%;width:42px;height:42px;font-size:1.2rem;
        cursor:pointer;font-weight:700;z-index:1000000;box-shadow:0 4px 15px rgba(255,10,84,0.6);
        display:flex;align-items:center;justify-content:center;`;
      lb.appendChild(lbImg);
      lb.appendChild(lbClose);
      document.body.appendChild(lb);
      lb.addEventListener('click', (e) => { if (e.target === lb || e.target === lbClose) lb.remove(); });
    }
    const imgEl = document.getElementById('memory-lightbox-img');
    if (imgEl) imgEl.src = src;
  }

  // --- Inject uploaded photos into all memory/polaroid frames ---
  function updateMemoriesPhoto(photoUrl, photosArray) {
    // Normalize: accept both plain strings and {cdnUrl, localUrl} objects
    function toSrcUrl(item) {
      if (!item) return null;
      if (typeof item === 'string') {
        const s = item.trim();
        return s && s !== 'null' && s !== 'undefined' ? s : null;
      }
      if (typeof item === 'object') {
        const u = (item.cdnUrl || item.localUrl || item.url || '').trim();
        return u && u !== 'null' && u !== 'undefined' ? u : null;
      }
      return null;
    }

    const collected = [];

    // 1. Add main portrait photo first if available
    const mainSrc = toSrcUrl(photoUrl || currentPhotoDataUrl);
    if (mainSrc && !collected.includes(mainSrc)) {
      collected.push(mainSrc);
    }

    // 2. Add photos from argument array
    if (Array.isArray(photosArray)) {
      photosArray.forEach(p => {
        const u = toSrcUrl(p);
        if (u && !collected.includes(u)) collected.push(u);
      });
    }

    // 3. Add photos from global userMemoriesPhotos
    if (Array.isArray(userMemoriesPhotos)) {
      userMemoriesPhotos.forEach(p => {
        const u = toSrcUrl(p);
        if (u && !collected.includes(u)) collected.push(u);
      });
    }

    const photosList = collected;

    // 1. Book memories modal polaroid cards (#modal-book-memories)
    const memoriesGridWrapper = document.querySelector('#modal-book-memories .memories-grid-wrapper');
    if (memoriesGridWrapper && photosList.length > 0) {
      const captions = [
        "Where Our Story Began ✨",
        "That Unforgettable Smile 🥰",
        "Endless Laughs & Calls 🌙",
        "Celebrating Your Special Day 👑",
        "Precious Moments Together 💕",
        "Pure Love & Happiness ❤️",
        "Forever My Favorite View ✨",
        "Sweet Birthday Memories 💖",
        "You Make My World Beautiful 🌸",
        "A Thousand Beautiful Smiles 💫"
      ];

      let html = '';
      photosList.forEach((src, idx) => {
        const captionText = captions[idx % captions.length] || `Memory #${idx + 1} ✨`;
        html += `
          <div class="polaroid-memory-card" data-src="${src}" style="cursor: pointer;" title="Click to view full photo">
            <div class="polaroid-inner-frame">
              <div class="polaroid-sample-img" style="position: relative; overflow: hidden; background: #200418; border-radius: 6px;">
                <img src="${src}" alt="${captionText}" class="polaroid-real-img" style="width: 100%; height: 170px; object-fit: cover; display: block; transition: transform 0.3s ease;">
                <div style="position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,0.65); color: #fff; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 0.72rem;">
                  <i class="fa-solid fa-expand"></i>
                </div>
              </div>
              <div class="polaroid-caption">${captionText}</div>
            </div>
          </div>
        `;
      });
      memoriesGridWrapper.innerHTML = html;

      // Click any polaroid to zoom in lightbox
      memoriesGridWrapper.querySelectorAll('.polaroid-memory-card').forEach(card => {
        card.addEventListener('click', () => {
          const src = card.getAttribute('data-src');
          if (src) openMemoryLightbox(src);
        });
      });
    }

    // 2. Polaroids modal in drawer (#polaroids-modal)
    const polaroidsGrid = document.querySelector('#polaroids-modal .polaroids-grid');
    if (polaroidsGrid && photosList.length > 0) {
      let drawerHtml = '';
      const drawerCaptions = [
        "The moment I fell for you ❤️",
        "Every second with you is pure joy 💖",
        "To many more adventures together 🥂",
        "You are my whole universe 👑",
        "Forever and always in love 💕",
        "Our sweetest birthday memory ✨"
      ];
      photosList.forEach((src, idx) => {
        const cap = drawerCaptions[idx % drawerCaptions.length] || `Memory #${idx + 1} 💕`;
        drawerHtml += `
          <div class="polaroid-item" data-src="${src}" style="cursor: pointer;" title="Click to view full photo">
            <div class="polaroid-photo-frame" style="position: relative; overflow: hidden;">
              <img src="${src}" alt="Memory ${idx + 1}" class="polaroid-preview-img" style="width: 100%; height: 100%; object-fit: cover; display: block;">
            </div>
            <p class="polaroid-caption">"${cap}"</p>
          </div>
        `;
      });
      polaroidsGrid.innerHTML = drawerHtml;
      polaroidsGrid.querySelectorAll('.polaroid-item').forEach(item => {
        item.addEventListener('click', () => {
          const src = item.getAttribute('data-src');
          if (src) openMemoryLightbox(src);
        });
      });
    }

    // 3. Update 3D Book Cover on Landing / Chat Screen (#book-card-memories)
    const miniPreview = document.querySelector('#book-card-memories .mini-polaroid-preview');
    if (miniPreview && photosList.length > 0) {
      miniPreview.innerHTML = `
        <img src="${photosList[0]}" alt="Cover Photo" class="book-cover-mini-photo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: block;">
        <span class="polaroid-sparkle" style="position: absolute; top: -6px; right: -6px;">💖</span>
      `;
    }

    // 4. Update 3D Scene easel frame if available
    if (scene && scene.updateUserPhoto && photosList.length > 0) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try { scene.updateUserPhoto(img); } catch(e) {}
      };
      img.src = photosList[0];
    }
  }

  function generateShareUrl(includePhoto = true) {
    const url = new URL(window.location.href);
    url.search = '';
    const params = new URLSearchParams();
    params.set('name', celebrantName || 'Birthday Star');
    if (celebrantAge) params.set('age', celebrantAge);
    params.set('wish', customWish || 'Happy Birthday!');
    params.set('theme', activeTheme || 'midnight-gold');
    if (includePhoto && currentPhotoDataUrl) {
      params.set('photo', currentPhotoDataUrl);
    }
    url.hash = params.toString();
    return url.toString();
  }

  /* =========================================================
     THEME SELECTOR
     ========================================================= */
  function applyTheme(themeName) {
    activeTheme = themeName;
    document.body.className = `theme-${themeName}`;
    scene.setTheme(themeName);

    document.querySelectorAll('.drawer-theme-pill').forEach(opt => {
      if (opt.getAttribute('data-theme') === themeName) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
  }

  document.querySelectorAll('.drawer-theme-pill').forEach(opt => {
    opt.addEventListener('click', () => {
      const theme = opt.getAttribute('data-theme');
      applyTheme(theme);
    });
  });

  /* =========================================================
     AUDIO CONTROLS
     ========================================================= */
  if (musicToggleBtn) {
    musicToggleBtn.addEventListener('click', () => {
      const isPlaying = (window.birthdayAudio && window.birthdayAudio.toggleMusic) ? window.birthdayAudio.toggleMusic() : false;
      if (soundWave) {
        if (isPlaying) {
          soundWave.classList.add('playing');
        } else {
          soundWave.classList.remove('playing');
        }
      }
    });
  }

  /* =========================================================
     CAMERA VIEWS (DRAWER)
     ========================================================= */
  Object.keys(camPills).forEach(key => {
    const btn = camPills[key];
    if (btn) {
      btn.addEventListener('click', () => {
        Object.values(camPills).forEach(b => { if (b) b.classList.remove('active'); });
        btn.classList.add('active');
        if (scene && scene.setCameraView) scene.setCameraView(key);
        closeMenuDrawer();
      });
    }
  });

  /* =========================================================
     FEATURE TOGGLES (DRAWER)
     ========================================================= */
  const btnDiscoMode = document.getElementById('btn-disco-mode');
  if (btnDiscoMode) {
    btnDiscoMode.addEventListener('click', () => {
      const isActive = (scene && scene.toggleDiscoMode) ? scene.toggleDiscoMode() : false;
      btnDiscoMode.classList.toggle('active', isActive);
    });
  }

  if (btnSparklerWand) {
    btnSparklerWand.addEventListener('click', () => {
      if (scene) {
        scene.sparklerActive = !scene.sparklerActive;
        btnSparklerWand.classList.toggle('active', scene.sparklerActive);
        document.body.classList.toggle('sparkler-active', scene.sparklerActive);
      }
    });
  }

  if (btnSkyLanterns) {
    btnSkyLanterns.addEventListener('click', () => {
      closeMenuDrawer();
      if (scene) {
        scene.setCameraView('fireworks');
        Object.values(camPills).forEach(b => { if (b) b.classList.remove('active'); });
        if (camPills.fireworks) camPills.fireworks.classList.add('active');
        scene.start3SecondFirecrackers();
      }
    });
  }

  if (btnPhotoBooth) {
    btnPhotoBooth.addEventListener('click', () => {
      closeMenuDrawer();
      generatePostcard();
    });
  }

  function generatePostcard() {
    if (!scene || !scene.renderer) return;
    const canvas = scene.renderer.domElement;
    const postCanvas = document.createElement('canvas');
    postCanvas.width = 1200;
    postCanvas.height = 900;
    const ctx = postCanvas.getContext('2d');

    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 900);
    bgGrad.addColorStop(0, '#1a103c');
    bgGrad.addColorStop(0.5, '#0c071e');
    bgGrad.addColorStop(1, '#05020c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 900);

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 14;
    ctx.strokeRect(30, 30, 1140, 840);

    ctx.drawImage(canvas, 60, 60, 1080, 620);

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 60, 1080, 620);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 44px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`✨ HAPPY BIRTHDAY ${celebrantName.toUpperCase()}! ✨`, 600, 735);

    ctx.fillStyle = '#f0f0ff';
    ctx.font = 'italic 22px Playfair Display, serif';
    ctx.fillText(`"${customWish}"`, 600, 785);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '18px Outfit, sans-serif';
    const ageTag = (celebrantAge && parseInt(celebrantAge) > 0) ? ` • Age ${celebrantAge}` : '';
    ctx.fillText(`Celebrated with Love • ${celebrantName}${ageTag}`, 600, 835);

    const dataUrl = postCanvas.toDataURL('image/png');
    if (postcardPreviewImg) postcardPreviewImg.src = dataUrl;
    if (btnDownloadPostcard) btnDownloadPostcard.href = dataUrl;
    if (photoBoothModal) photoBoothModal.classList.add('show');
  }

  if (closePhotoModal && photoBoothModal) {
    closePhotoModal.addEventListener('click', () => photoBoothModal.classList.remove('show'));
  }

  // Arcade Game
  if (btnArcadeGame) {
    btnArcadeGame.addEventListener('click', () => {
      closeMenuDrawer();
      startArcadeGame();
    });
  }

  function startArcadeGame() {
    let arcadeScore = 0;
    let arcadeCombo = 1;
    let arcadeTimeLeft = 30;

    if (arcadeScoreVal) arcadeScoreVal.textContent = '0000';
    if (arcadeComboVal) arcadeComboVal.textContent = 'x1';
    if (arcadeTimerVal) arcadeTimerVal.textContent = '30s';
    if (arcadeTimerFill) arcadeTimerFill.style.width = '100%';

    if (arcadeHud) arcadeHud.classList.add('active');

    const timerInt = setInterval(() => {
      arcadeTimeLeft--;
      if (arcadeTimerVal) arcadeTimerVal.textContent = `${arcadeTimeLeft}s`;
      if (arcadeTimerFill) arcadeTimerFill.style.width = `${(arcadeTimeLeft / 30) * 100}%`;

      if (arcadeTimeLeft <= 0) {
        clearInterval(timerInt);
        if (arcadeHud) arcadeHud.classList.remove('active');
        if (finalScoreVal) finalScoreVal.textContent = String(arcadeScore);
        if (finalRankBadge) finalRankBadge.textContent = arcadeScore > 800 ? "🎉 CELEBRATION MASTER 🎉" : "⭐ PARTY PRO ⭐";
        if (window.birthdayAudio) window.birthdayAudio.playGameOverFanfare();
        if (arcadeOverModal) arcadeOverModal.classList.add('show');
      }
    }, 1000);

    if (btnQuitArcade) {
      btnQuitArcade.onclick = () => {
        clearInterval(timerInt);
        if (arcadeHud) arcadeHud.classList.remove('active');
      };
    }
  }

  if (btnReplayArcade && arcadeOverModal) {
    btnReplayArcade.addEventListener('click', () => {
      arcadeOverModal.classList.remove('show');
      startArcadeGame();
    });
  }

  if (btnCloseArcadeModal && arcadeOverModal) {
    btnCloseArcadeModal.addEventListener('click', () => arcadeOverModal.classList.remove('show'));
  }

  /* =========================================================
     FREE PLAY BUTTONS
     ========================================================= */
  if (btnLaunchFireworks) {
    btnLaunchFireworks.addEventListener('click', () => {
      if (scene) {
        scene.setCameraView('fireworks');
        Object.values(camPills).forEach(b => { if (b) b.classList.remove('active'); });
        if (camPills.fireworks) camPills.fireworks.classList.add('active');
        scene.start3SecondFirecrackers();
      }
    });
  }

  const canvasContainer = document.getElementById('canvas-container');
  if (canvasContainer) {
    canvasContainer.addEventListener('click', () => {
      if (camPills.fireworks && camPills.fireworks.classList.contains('active')) {
        if (scene) scene.start3SecondFirecrackers();
      }
    });
  }

  if (btnOpenGift) {
    btnOpenGift.addEventListener('click', () => {
      if (scene) {
        scene.setCameraView('gift');
        Object.values(camPills).forEach(b => { if (b) b.classList.remove('active'); });
        if (camPills.gift) camPills.gift.classList.add('active');
        scene.openGift();
      }
    });
  }

  if (btnSpawnBalloons) {
    btnSpawnBalloons.addEventListener('click', () => {
      if (scene) scene.createTableBalloons(5);
      if (window.confetti) window.confetti({ particleCount: 40, spread: 70, origin: { y: 0.8 } });
    });
  }

  if (btnBlowCandles) {
    btnBlowCandles.addEventListener('click', () => {
      if (scene) {
        scene.setCameraView('cake');
        Object.values(camPills).forEach(b => { if (b) b.classList.remove('active'); });
        if (camPills.cake) camPills.cake.classList.add('active');
        scene.start3SecondFirecrackers();
      }
    });
  }

  /* =========================================================
     MODAL CONTROLS & FORMS
     ========================================================= */
  if (customizeBtn && customizeModal) {
    customizeBtn.addEventListener('click', () => {
      closeMenuDrawer();
      customizeModal.classList.add('show');
    });
  }
  if (closeCustomizeModal && customizeModal) {
    closeCustomizeModal.addEventListener('click', () => customizeModal.classList.remove('show'));
  }

  if (customizeForm) {
    customizeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      celebrantName = inputName ? (inputName.value.trim() || 'Birthday Star') : 'Birthday Star';
      celebrantAge = inputAge ? (inputAge.value.trim() || '') : '';
      customWish = inputWish ? (inputWish.value.trim() || 'Happy Birthday!') : 'Happy Birthday!';

      updateCelebrantInfo();
      if (currentPhotoDataUrl) updateMemoriesPhoto(currentPhotoDataUrl);
      if (customizeModal) customizeModal.classList.remove('show');
      if (scene) scene.start3SecondFirecrackers();
    });
  }

  if (inputPhoto) {
    inputPhoto.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (photoFilename) photoFilename.textContent = file.name;
        if (photoUploadStatus) {
          photoUploadStatus.textContent = '⏳ Preparing photo for cloud sharing...';
          photoUploadStatus.className = 'photo-upload-status show';
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const compressed = compressImage(img);
            currentPhotoDataUrl = compressed;
            try {
              localStorage.setItem('birthday_custom_photo', compressed);
            } catch(err) {}
            if (scene) scene.updateUserPhoto(img);
            updateMemoriesPhoto(compressed);

            const formData = new FormData();
            formData.append('image', file);
            fetch('https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a5', {
              method: 'POST',
              body: formData
            })
            .then(res => res.json())
            .then(data => {
              if (data && data.image && data.image.url) {
                currentPhotoDataUrl = data.image.url;
                if (inputPhotoUrl) inputPhotoUrl.value = data.image.url;
                if (photoUploadStatus) {
                  photoUploadStatus.textContent = '✅ Photo cloud-hosted! Link is ready to share anywhere.';
                  photoUploadStatus.className = 'photo-upload-status show success';
                }
                try { localStorage.setItem('birthday_custom_photo', data.image.url); } catch(e) {}
              } else {
                if (photoUploadStatus) {
                  photoUploadStatus.textContent = '✅ Photo ready for sharing.';
                  photoUploadStatus.className = 'photo-upload-status show success';
                }
              }
            })
            .catch(() => {
              if (photoUploadStatus) {
                photoUploadStatus.textContent = '✅ Photo ready for sharing.';
                photoUploadStatus.className = 'photo-upload-status show success';
              }
            });
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (inputPhotoUrl) {
    inputPhotoUrl.addEventListener('input', () => {
      const url = inputPhotoUrl.value.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image'))) {
        currentPhotoDataUrl = url;
        try { localStorage.setItem('birthday_custom_photo', url); } catch(e) {}
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (scene) scene.updateUserPhoto(img);
          if (photoUploadStatus) {
            photoUploadStatus.textContent = '✅ Photo loaded successfully from URL!';
            photoUploadStatus.className = 'photo-upload-status show success';
          }
        };
        img.onerror = () => {
          if (photoUploadStatus) {
            photoUploadStatus.textContent = '⚠️ Check image URL (must be direct image link)';
            photoUploadStatus.className = 'photo-upload-status show error';
          }
        };
        img.src = url;
      }
    });
  }

  /* =========================================================
     LOVE LETTER & POLAROID MODALS
     ========================================================= */
  if (btnLoveLetter) {
    btnLoveLetter.addEventListener('click', () => {
      closeMenuDrawer();
      giftModal.classList.add('show');
    });
  }

  if (btnMemoryGallery) {
    btnMemoryGallery.addEventListener('click', () => {
      closeMenuDrawer();
      updateMemoriesPhoto(currentPhotoDataUrl, userMemoriesPhotos);
      if (polaroidsModal) polaroidsModal.classList.add('show');
    });
  }

  if (closePolaroidsModal) {
    closePolaroidsModal.addEventListener('click', () => {
      polaroidsModal.classList.remove('show');
    });
  }

  if (btnOpenCustomizerFromPolaroids) {
    btnOpenCustomizerFromPolaroids.addEventListener('click', () => {
      polaroidsModal.classList.remove('show');
      customizeModal.classList.add('show');
    });
  }

  closeGiftModal.addEventListener('click', () => giftModal.classList.remove('show'));
  btnGiftReplay.addEventListener('click', () => {
    giftModal.classList.remove('show');
    scene.start3SecondFirecrackers();
  });

  shareBtn.addEventListener('click', () => {
    closeMenuDrawer();
    const shareUrl = generateShareUrl(true); // Includes Photo in Link!
    const qrUrl = generateShareUrl(false); // Clean URL for QR Code
    shareLinkInput.value = shareUrl;
    copyFeedback.classList.remove('show');

    if (window.QRCode && qrcodeContainer) {
      try {
        qrcodeContainer.innerHTML = '';
        qrcodeInstance = new QRCode(qrcodeContainer, {
          text: qrUrl,
          width: 170,
          height: 170,
          colorDark: "#380c25",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch(qrErr) {
        console.warn('QR Code generation notice:', qrErr);
      }
    }
    shareModal.classList.add('show');
  });

  closeShareModal.addEventListener('click', () => shareModal.classList.remove('show'));

  btnCopyLink.addEventListener('click', () => {
    shareLinkInput.select();
    shareLinkInput.setSelectionRange(0, 99999);
    try {
      navigator.clipboard.writeText(shareLinkInput.value).then(() => {
        copyFeedback.classList.add('show');
        setTimeout(() => copyFeedback.classList.remove('show'), 3000);
      }).catch(() => {
        document.execCommand('copy');
        copyFeedback.classList.add('show');
        setTimeout(() => copyFeedback.classList.remove('show'), 3000);
      });
    } catch(err) {
      document.execCommand('copy');
      copyFeedback.classList.add('show');
      setTimeout(() => copyFeedback.classList.remove('show'), 3000);
    }
  });

  /* =========================================================
     LIVE CAMERA TELEMETRY INSPECTOR HUD LOGIC
     ========================================================= */
  const btnToggleCamInspector = document.getElementById('btn-toggle-cam-inspector');
  const cameraTelemetryHud = document.getElementById('camera-telemetry-hud');
  const closeHudBtn = document.getElementById('close-hud-btn');
  const metricCamDist = document.getElementById('metric-cam-dist');
  const metricCamPitch = document.getElementById('metric-cam-pitch');
  const metricCamYaw = document.getElementById('metric-cam-yaw');
  const metricCamPos = document.getElementById('metric-cam-pos');
  const metricCamTarget = document.getElementById('metric-cam-target');
  const camDistanceSlider = document.getElementById('cam-distance-slider');
  const sliderDistVal = document.getElementById('slider-dist-val');
  const btnCopyCamCoords = document.getElementById('btn-copy-cam-coords');
  const copyCamText = document.getElementById('copy-cam-text');

  let currentTelemetry = null;

  if (btnToggleCamInspector) {
    btnToggleCamInspector.addEventListener('click', () => {
      cameraTelemetryHud.classList.toggle('show');
      closeMenuDrawer();
    });
  }

  if (closeHudBtn) {
    closeHudBtn.addEventListener('click', () => {
      cameraTelemetryHud.classList.remove('show');
    });
  }

  window.onCameraTelemetryUpdate = (data) => {
    currentTelemetry = data;
    if (!cameraTelemetryHud.classList.contains('show')) return;

    metricCamDist.textContent = `${data.distance.toFixed(1)} u`;
    metricCamPitch.textContent = `${data.pitch.toFixed(1)}°`;
    metricCamYaw.textContent = `${data.yaw.toFixed(1)}°`;

    metricCamPos.textContent = `X: ${data.pos.x.toFixed(1)}, Y: ${data.pos.y.toFixed(1)}, Z: ${data.pos.z.toFixed(1)}`;
    metricCamTarget.textContent = `X: ${data.target.x.toFixed(1)}, Y: ${data.target.y.toFixed(1)}, Z: ${data.target.z.toFixed(1)}`;

    if (document.activeElement !== camDistanceSlider) {
      camDistanceSlider.value = data.distance;
      sliderDistVal.textContent = `${data.distance.toFixed(1)} u`;
    }
  };

  if (camDistanceSlider) {
    camDistanceSlider.addEventListener('input', (e) => {
      const dist = parseFloat(e.target.value);
      sliderDistVal.textContent = `${dist.toFixed(1)} u`;
      scene.setCameraDistance(dist);
    });
  }

  if (btnCopyCamCoords) {
    btnCopyCamCoords.addEventListener('click', () => {
      if (!currentTelemetry) return;
      const t = currentTelemetry;
      const textToCopy = `camera: { x: ${t.pos.x.toFixed(2)}, y: ${t.pos.y.toFixed(2)}, z: ${t.pos.z.toFixed(2)} }, target: { x: ${t.target.x.toFixed(2)}, y: ${t.target.y.toFixed(2)}, z: ${t.target.z.toFixed(2)} }, distance: ${t.distance.toFixed(1)}, pitch: ${t.pitch.toFixed(1)}°, yaw: ${t.yaw.toFixed(1)}°`;
      
      navigator.clipboard.writeText(textToCopy).then(() => {
        copyCamText.textContent = "✅ Copied to Clipboard!";
        setTimeout(() => {
          copyCamText.textContent = "Copy Angle & Distance";
        }, 2500);
      });
    });
  }

  /* =========================================================
     DUAL BOOK ALBUMS: MEMORIES & SAFARNAMA HANDLERS
     ========================================================= */
  const bookCardMemories = document.getElementById('book-card-memories');
  const bookCardSafarnama = document.getElementById('book-card-safarnama');
  const modalBookMemories = document.getElementById('modal-book-memories');
  const modalBookSafarnama = document.getElementById('modal-book-safarnama');
  const closeModalMemories = document.getElementById('close-modal-memories');
  const closeModalSafarnama = document.getElementById('close-modal-safarnama');
  const btnOpenCustomizerFromAlbum = document.getElementById('btn-open-customizer-from-album');
  const btnSafarnamaToChat = document.getElementById('btn-safarnama-to-chat');

  // --- Dynamic Safarnama Chapters State ---
  const DEFAULT_SAFARNAMA_PRESETS = [
    {
      heading: "Jab Tum Zindagi Me Aaye 🌸",
      description: "Ek aam sa din tha, lekin jab tum meri zindagi me aayi, toh har lamha khaas ban gaya. Tumhari muskurahat ne dil ko ek aisi sukoon di jo pehle kabhi mehsoos nahi hui thi."
    },
    {
      heading: "Der Raat Ki Baatein & Silly Fights 🥰",
      description: "Wo ghanton phone par baatein karna, bina kisi wajah ke muskurana, choti-choti baaton par ruthna aur phir ek pyare se sorry par maan jana... Ye saare pal mere dil ke sabse kareeb hain."
    },
    {
      heading: "Har Kadam Par Saath 🤝",
      description: "Chahe din achha ho ya mushkil, tumne hamesha meri himmat badhayi hai. Tum sirf meri girlfriend nahi, meri sabse achhi dost aur meri sabse badi taakat ho."
    },
    {
      heading: "Aaj, Kal Aur Hamesha ❤️",
      description: "Aaj tumhare is khaas janamdin par, main rab se bas yahi dua karta hu ki tumhari har khwahish puri ho. Tumhari aankhon me hamesha khushi ke aansu hon aur hothon par pyari hasi. Happy Birthday My Love! 💖"
    }
  ];

  let userSafarnamaChapters = JSON.parse(JSON.stringify(DEFAULT_SAFARNAMA_PRESETS));

  // Render Safarnama Builder in Creator Dashboard
  function renderSafarnamaBuilder() {
    const listEl = document.getElementById('safarnama-builder-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    userSafarnamaChapters.forEach((ch, idx) => {
      const card = document.createElement('div');
      card.className = 'safarnama-entry-card';
      const numStr = String(idx + 1).padStart(2, '0');
      card.innerHTML = `
        <div class="safarnama-entry-top">
          <span class="safarnama-chapter-tag"><i class="fa-solid fa-feather-pointed"></i> Chapter ${numStr}</span>
          ${userSafarnamaChapters.length > 1 ? `<button type="button" class="btn-remove-chapter" data-idx="${idx}"><i class="fa-solid fa-trash-can"></i> Remove</button>` : ''}
        </div>
        <div class="safarnama-inputs-grid">
          <div class="safarnama-input-group">
            <label><i class="fa-solid fa-heading"></i> Chapter Heading / Title</label>
            <input type="text" class="chapter-heading-input" data-idx="${idx}" placeholder="e.g. Jab Tum Zindagi Me Aaye 🌸" value="${ch.heading ? ch.heading.replace(/"/g, '&quot;') : ''}">
          </div>
          <div class="safarnama-input-group">
            <label><i class="fa-solid fa-align-left"></i> Story / Description</label>
            <textarea class="chapter-desc-input" data-idx="${idx}" rows="2" placeholder="Write the memory or story for this chapter...">${ch.description || ''}</textarea>
          </div>
        </div>
      `;
      listEl.appendChild(card);
    });

    // Heading change listener
    listEl.querySelectorAll('.chapter-heading-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        if (userSafarnamaChapters[idx]) {
          userSafarnamaChapters[idx].heading = e.target.value;
          if (currentPortalUser) saveUserFormData(currentPortalUser);
        }
      });
    });

    // Description change listener
    listEl.querySelectorAll('.chapter-desc-input').forEach(txt => {
      txt.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        if (userSafarnamaChapters[idx]) {
          userSafarnamaChapters[idx].description = e.target.value;
          if (currentPortalUser) saveUserFormData(currentPortalUser);
        }
      });
    });

    // Remove button listener
    listEl.querySelectorAll('.btn-remove-chapter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        userSafarnamaChapters.splice(idx, 1);
        renderSafarnamaBuilder();
        if (currentPortalUser) saveUserFormData(currentPortalUser);
      });
    });
  }

  const btnAddSafarnamaChapter = document.getElementById('btn-add-safarnama-chapter');
  if (btnAddSafarnamaChapter) {
    btnAddSafarnamaChapter.addEventListener('click', () => {
      const nextNum = userSafarnamaChapters.length + 1;
      userSafarnamaChapters.push({
        heading: `Khaas Lamha ${nextNum} 💕`,
        description: "Ek aur khoobsurat yaadein jo humare dil ke kareeb hain..."
      });
      renderSafarnamaBuilder();
      if (currentPortalUser) saveUserFormData(currentPortalUser);
      if (window.birthdayAudio) {
        try { window.birthdayAudio.playPop(); } catch(e) {}
      }
    });
  }

  const btnResetSafarnama = document.getElementById('btn-reset-safarnama');
  if (btnResetSafarnama) {
    btnResetSafarnama.addEventListener('click', () => {
      if (confirm('Reset Safarnama chapters to romantic presets?')) {
        userSafarnamaChapters = JSON.parse(JSON.stringify(DEFAULT_SAFARNAMA_PRESETS));
        renderSafarnamaBuilder();
        if (currentPortalUser) saveUserFormData(currentPortalUser);
      }
    });
  }

  if (bookCardMemories) {
    bookCardMemories.addEventListener('click', () => {
      // Inject all memory photos into memories modal when it opens
      updateMemoriesPhoto(currentPhotoDataUrl, userMemoriesPhotos);
      if (modalBookMemories) modalBookMemories.classList.add('show');
      if (window.birthdayAudio) {
        try { window.birthdayAudio.playGiftOpen(); } catch(e) {}
      }
    });
  }

  if (closeModalMemories) {
    closeModalMemories.addEventListener('click', () => {
      if (modalBookMemories) modalBookMemories.classList.remove('show');
    });
  }

  if (btnOpenCustomizerFromAlbum) {
    btnOpenCustomizerFromAlbum.addEventListener('click', () => {
      if (modalBookMemories) modalBookMemories.classList.remove('show');
      if (customizeModal) customizeModal.classList.add('show');
    });
  }

  // Helper: Transition to Live Chat when user clicks "Follow in Chat"
  function transitionToRealChat() {
    if (modalBookSafarnama) modalBookSafarnama.classList.remove('show');
    if (modalBookMemories) modalBookMemories.classList.remove('show');

    // Ensure story containers are visible
    if (portalLandingScreen) portalLandingScreen.classList.add('hidden');
    if (portalCreatorDashboard) portalCreatorDashboard.classList.add('hidden');
    if (curtainContainer) curtainContainer.style.display = 'none';

    const romanticChatScreen = document.getElementById('romantic-chat-screen');
    if (romanticChatScreen) {
      romanticChatScreen.classList.remove('hidden');
      romanticChatScreen.style.opacity = '1';
      romanticChatScreen.style.transform = 'none';
    }

    const chatCard = document.querySelector('.chat-card-window');
    if (chatCard) {
      chatCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const chatInput = document.getElementById('chat-user-input');
      if (chatInput && !chatInput.disabled) {
        setTimeout(() => chatInput.focus(), 600);
      }
    }
    if (window.birthdayAudio) {
      try { window.birthdayAudio.playPop(); } catch(e) {}
    }
  }

  // --- Safarnama: Dynamically populate custom chapters with Follow In Chat Buttons ---
  function renderSafarnamaChapters() {
    const chaptersScroll = document.querySelector('.safarnama-chapters-scroll');
    if (!chaptersScroll) return;

    const history = getSavedChatHistory();
    const name = celebrantName && celebrantName !== 'Birthday Star' ? celebrantName : 'Tum';

    const chaptersToRender = (userSafarnamaChapters && userSafarnamaChapters.length > 0) ? userSafarnamaChapters : DEFAULT_SAFARNAMA_PRESETS;

    let html = '';

    // Render each custom chapter filled by user
    chaptersToRender.forEach((ch, idx) => {
      const isHighlight = idx === chaptersToRender.length - 1;
      const numStr = String(idx + 1).padStart(2, '0');
      const heading = ch.heading || `Chapter ${numStr}`;
      const desc = ch.description || '';

      html += `
        <div class="safarnama-chapter-card${isHighlight ? ' highlight-chapter' : ''}">
          <div class="chapter-badge">Chapter ${numStr}</div>
          <h3 class="chapter-title">${heading}</h3>
          <p class="chapter-text">${desc}</p>
          <div class="chapter-follow-chat-row">
            <button type="button" class="btn-chapter-follow-chat" data-chapter="${numStr}" data-heading="${heading.replace(/"/g, '&quot;')}" data-desc="${desc.substring(0, 100).replace(/"/g, '&quot;')}" title="Continue in Live Chat">
              <i class="fa-solid fa-comments"></i> Follow in Chat 💬
            </button>
          </div>
        </div>`;
    });

    // Add chapters from girlfriend's live chat answers if any
    if (history.length > 0) {
      html += `
        <div class="safarnama-chapter-card" style="background: linear-gradient(135deg, rgba(255,117,140,0.12), rgba(255,200,124,0.08)); border-left: 3px solid #ff758c;">
          <div class="chapter-badge" style="background: linear-gradient(135deg, #ff758c, #ffd700);">Her Words 💬</div>
          <h3 class="chapter-title">${name} Ki Apni Zuban Se... 💕</h3>
          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">`;
      history.forEach((item, idx) => {
        html += `
            <div style="padding: 10px 12px; background: rgba(255,255,255,0.05); border-radius: 10px;">
              <div style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">Q${idx+1}: ${item.question || ''}</div>
              <div style="font-size: 0.9rem; color: #ffb3c1; font-style: italic;">"${item.reply || ''}"</div>
            </div>`;
      });
      html += `
          </div>
          <div class="chapter-follow-chat-row">
            <button type="button" class="btn-chapter-follow-chat" data-chapter="Her Words" data-heading="${name} Ki Apni Zuban Se" data-desc="Saved memories from live chat" title="Chat with Her">
              <i class="fa-solid fa-comments"></i> Follow in Chat 💬
            </button>
          </div>
        </div>`;
    }

    chaptersScroll.innerHTML = html;

    // Attach click listeners to all "Follow in Chat" buttons on each chapter
    chaptersScroll.querySelectorAll('.btn-chapter-follow-chat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const chNum = btn.dataset.chapter || '01';
        const chHeading = btn.dataset.heading || 'Our Journey';
        const chDesc = btn.dataset.desc || '';

        // 1. Pause automated question flow so boyfriend & girlfriend can converse
        isAutomatedChatPaused = true;

        // 2. Set active WhatsApp-style follow-up quote
        activeFollowUpQuote = {
          chapterNum: chNum,
          heading: chHeading,
          snippet: chDesc
        };

        // 3. Populate and display quote banner
        if (quoteChapterTitle) {
          quoteChapterTitle.textContent = `📖 Chapter ${chNum}: ${chHeading}`;
        }
        if (quoteChapterDesc) {
          quoteChapterDesc.textContent = `"${chDesc.substring(0, 80)}..."`;
        }
        if (chatQuoteBarContainer) {
          chatQuoteBarContainer.classList.remove('hidden');
        }

        // 4. Transition to live chat view
        transitionToRealChat();

        // 5. Unlock user input immediately
        if (chatLiveStatus) chatLiveStatus.textContent = "Live 2-Way Chat Mode 💕";
        if (chatUserInput) {
          chatUserInput.disabled = false;
          chatUserInput.placeholder = `Type your reply or question about "${chHeading}"...`;
          setTimeout(() => chatUserInput.focus(), 300);
        }
        if (chatSendBtn) chatSendBtn.disabled = true;
        if (chatQuickReplies) chatQuickReplies.innerHTML = '';

        // 6. Track recipient activity & send live notification
        trackRecipientActivity('follow_chat_clicked', `Celebrant followed up on "${chHeading}"`, '💬');
      });
    });
  }

  if (bookCardSafarnama) {
    bookCardSafarnama.addEventListener('click', () => {
      trackRecipientActivity('safarnama_opened', 'Opened & Reading Safarnama Journey Book 📖', '📖');
      renderSafarnamaChapters();
      if (modalBookSafarnama) modalBookSafarnama.classList.add('show');
      if (window.birthdayAudio) {
        try { window.birthdayAudio.playGiftOpen(); } catch(e) {}
      }
    });
  }

  if (bookCardMemories) {
    bookCardMemories.addEventListener('click', () => {
      trackRecipientActivity('memories_opened', 'Opened Memories Photo Album 📸', '📸');
    });
  }

  if (closeModalSafarnama) {
    closeModalSafarnama.addEventListener('click', () => {
      if (modalBookSafarnama) modalBookSafarnama.classList.remove('show');
    });
  }

  if (btnSafarnamaToChat) {
    btnSafarnamaToChat.addEventListener('click', () => {
      transitionToRealChat();
    });
  }

  /* =========================================================
     STEP 0: MASTER INDEX & NEON LOGIN & 3D DECK CREATOR LOGIC
     ========================================================= */
  const portalLandingScreen = document.getElementById('portal-landing-screen');
  const btnPortalOpenLogin = document.getElementById('btn-portal-open-login');
  const btnPortalViewDemo = document.getElementById('btn-portal-view-demo');
  const portalLoginModal = document.getElementById('portal-login-modal');
  const closeLoginModal = document.getElementById('close-login-modal');
  const portalLoginForm = document.getElementById('portal-login-form');
  const portalRegisterForm = document.getElementById('portal-register-form');
  const loginUsername = document.getElementById('login-username');
  const loginPassword = document.getElementById('login-password');
  const registerUsername = document.getElementById('register-username');
  const registerPassword = document.getElementById('register-password');
  const btnToggleLoginPwd = document.getElementById('btn-toggle-login-pwd');
  const btnToggleRegPwd = document.getElementById('btn-toggle-reg-pwd');
  const btnLoginHelp = document.getElementById('btn-login-help');
  const tabBtnReturning = document.getElementById('tab-btn-returning');
  const tabBtnNew = document.getElementById('tab-btn-new');

  const portalCreatorDashboard = document.getElementById('portal-creator-dashboard');
  const loggedUserName = document.getElementById('logged-user-name');
  const deckCardGf = document.getElementById('deck-card-gf');
  const deckCardBf = document.getElementById('deck-card-bf');
  const creatorSurpriseForm = document.getElementById('creator-surprise-form');
  const creatorFormHeading = document.getElementById('creator-form-heading');
  const creatorFormSubheading = document.getElementById('creator-form-subheading');
  const creatorInputName = document.getElementById('creator-input-name');
  const creatorInputNickname = document.getElementById('creator-input-nickname');
  const creatorInputAge = document.getElementById('creator-input-age');
  const creatorInputTheme = document.getElementById('creator-input-theme');
  const creatorInputWish = document.getElementById('creator-input-wish');
  const creatorInputPhoto = document.getElementById('creator-input-photo');
  const creatorPhotoStatus = document.getElementById('creator-photo-status');
  const creatorInputPhotoUrl = document.getElementById('creator-input-photo-url');
  const generatedLinkBox = document.getElementById('generated-link-box');
  const finalSurpriseLinkInput = document.getElementById('final-surprise-link-input');
  const btnCopyFinalLink = document.getElementById('btn-copy-final-link');
  const finalCopyFeedback = document.getElementById('final-copy-feedback');
  const btnLaunchPreview = document.getElementById('btn-launch-preview');
  const btnLogoutPortal = document.getElementById('btn-logout-portal');

  let selectedCreatorMode = 'gf';
  let currentPortalUser = null; // tracks logged-in username key

  // 1. Landing Screen CTAs
  if (btnPortalOpenLogin) {
    btnPortalOpenLogin.addEventListener('click', () => {
      if (portalLoginModal) portalLoginModal.classList.add('show');
      if (loginUsername) loginUsername.focus();
    });
  }

  if (closeLoginModal) {
    closeLoginModal.addEventListener('click', () => {
      if (portalLoginModal) portalLoginModal.classList.remove('show');
    });
  }

  if (btnPortalViewDemo) {
    btnPortalViewDemo.addEventListener('click', () => {
      if (portalLandingScreen) portalLandingScreen.classList.add('hidden');
      if (portalCreatorDashboard) portalCreatorDashboard.classList.add('hidden');
      if (window.birthdayAudio) {
        try { window.birthdayAudio.playFanfare(); } catch(e) {}
      }
    });
  }

  // 2. Toggle Login Password Visibility
  if (btnToggleLoginPwd && loginPassword) {
    btnToggleLoginPwd.addEventListener('click', () => {
      const isPwd = loginPassword.type === 'password';
      loginPassword.type = isPwd ? 'text' : 'password';
      btnToggleLoginPwd.innerHTML = isPwd ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });
  }

  // 3. Help Button
  if (btnLoginHelp) {
    btnLoginHelp.addEventListener('click', () => {
      alert("💡 PORTAL & PASSWORD HELP:\n\n• Aapka username & password aapke browser & Telegram bot me secure save hota hai.\n• NOTE: Agar password bhool gaye to access recover nahi hoga, isliye apna password hamesha yaad rakhein!\n• Har baar isi password se authenticate karke aap apni surprise settings edit ya generate kar sakte hain. 💕");
    });
  }

  // --- Helper: Save current form data to localStorage keyed by username ---
  function saveUserFormData(userKey) {
    if (!userKey) return;
    const data = {
      name: creatorInputName ? creatorInputName.value : '',
      nickname: creatorInputNickname ? creatorInputNickname.value : '',
      age: creatorInputAge ? creatorInputAge.value : '',
      theme: creatorInputTheme ? creatorInputTheme.value : 'rose-glamour',
      wish: creatorInputWish ? creatorInputWish.value : '',
      photoUrl: creatorInputPhotoUrl ? creatorInputPhotoUrl.value : '',
      mode: selectedCreatorMode,
      safarnama: userSafarnamaChapters,
      memoriesPhotos: userMemoriesPhotos,
      savedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(`birthday_userdata_${userKey}`, JSON.stringify(data));
      localStorage.setItem(`birthday_safarnama_${userKey}`, JSON.stringify(userSafarnamaChapters));
      localStorage.setItem(`birthday_memories_photos_${userKey}`, JSON.stringify(userMemoriesPhotos));
    } catch(e) {}
    // Also try server
    try {
      fetch(`${API_BASE}/api/save_user_data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userKey, user_data: data })
      }).catch(() => {});
    } catch(e) {}
  }

  // --- Helper: Restore saved form data ---
  function restoreUserFormData(userKey) {
    if (!userKey) return;
    let data = null;
    try {
      const local = localStorage.getItem(`birthday_userdata_${userKey}`);
      if (local) data = JSON.parse(local);
    } catch(e) {}

    if (data) {
      if (creatorInputName && data.name) creatorInputName.value = data.name;
      if (creatorInputNickname && data.nickname) creatorInputNickname.value = data.nickname;
      if (creatorInputAge && data.age) creatorInputAge.value = data.age;
      if (creatorInputTheme && data.theme) creatorInputTheme.value = data.theme;
      if (creatorInputWish && data.wish) creatorInputWish.value = data.wish;
      if (creatorInputPhotoUrl && data.photoUrl) {
        creatorInputPhotoUrl.value = data.photoUrl;
      }
      if (data.photoUrl) {
        currentPhotoDataUrl = data.photoUrl;
        const singlePreview = document.getElementById('creator-single-photo-preview');
        const previewImg = document.getElementById('main-photo-preview-img');
        if (singlePreview && previewImg) {
          previewImg.src = data.photoUrl;
          singlePreview.classList.remove('hidden');
        }
        if (creatorPhotoStatus) {
          creatorPhotoStatus.textContent = '✅ Photo loaded!';
          creatorPhotoStatus.style.color = '#00ff88';
        }
      }
      if (data.mode) setDeckMode(data.mode);

      if (data.safarnama && Array.isArray(data.safarnama) && data.safarnama.length > 0) {
        userSafarnamaChapters = data.safarnama;
      }

      if (data.memoriesPhotos && Array.isArray(data.memoriesPhotos) && data.memoriesPhotos.length > 0) {
        userMemoriesPhotos = data.memoriesPhotos;
        renderMemoriesPreviewsGrid();
      }

      // Merge and render all photos across modals & scene
      updateMemoriesPhoto(currentPhotoDataUrl, userMemoriesPhotos);

      // Apply restored theme & name
      if (data.theme) applyTheme(data.theme);
      if (data.name) {
        celebrantName = data.name;
        celebrantAge = data.age || '';
        customWish = data.wish || customWish;
        updateCelebrantInfo();
      }
      if (data.photoUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { if (scene) scene.updateUserPhoto(img); };
        img.src = data.photoUrl;
      }
    }

    renderSafarnamaBuilder();
  }

  // --- Helper: Open dashboard after successful login/register ---
  function openDashboardForUser(uName) {
    currentPortalUser = uName.toLowerCase();
    if (loggedUserName) loggedUserName.textContent = uName;
    if (portalLoginModal) portalLoginModal.classList.remove('show');
    if (portalLandingScreen) portalLandingScreen.classList.add('hidden');
    if (portalCreatorDashboard) portalCreatorDashboard.classList.remove('hidden');

    // Restore previous form data & render Safarnama builder
    restoreUserFormData(currentPortalUser);

    if (window.confetti) window.confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    if (window.birthdayAudio) { try { window.birthdayAudio.playFanfare(); } catch(e) {} }
  }

  // --- Login Tab Switcher ---
  if (tabBtnReturning && tabBtnNew) {
    [tabBtnReturning, tabBtnNew].forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        [tabBtnReturning, tabBtnNew].forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.login-tab-content').forEach(c => {
          c.classList.toggle('active', c.getAttribute('data-tab') === tab);
        });
      });
    });
  }

  // 1. Landing Screen CTAs
  if (btnPortalOpenLogin) {
    btnPortalOpenLogin.addEventListener('click', () => {
      if (portalLoginModal) portalLoginModal.classList.add('show');
      if (loginUsername) loginUsername.focus();
    });
  }

  if (closeLoginModal) {
    closeLoginModal.addEventListener('click', () => {
      if (portalLoginModal) portalLoginModal.classList.remove('show');
    });
  }

  if (btnPortalViewDemo) {
    btnPortalViewDemo.addEventListener('click', () => {
      if (portalLandingScreen) portalLandingScreen.classList.add('hidden');
      if (portalCreatorDashboard) portalCreatorDashboard.classList.add('hidden');
      if (window.birthdayAudio) { try { window.birthdayAudio.playFanfare(); } catch(e) {} }
    });
  }

  // 2. Toggle Password Visibility
  if (btnToggleLoginPwd && loginPassword) {
    btnToggleLoginPwd.addEventListener('click', () => {
      const isPwd = loginPassword.type === 'password';
      loginPassword.type = isPwd ? 'text' : 'password';
      btnToggleLoginPwd.innerHTML = isPwd ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });
  }

  if (btnToggleRegPwd && registerPassword) {
    btnToggleRegPwd.addEventListener('click', () => {
      const isPwd = registerPassword.type === 'password';
      registerPassword.type = isPwd ? 'text' : 'password';
      btnToggleRegPwd.innerHTML = isPwd ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });
  }

  // 3. Help Button
  if (btnLoginHelp) {
    btnLoginHelp.addEventListener('click', () => {
      alert('💡 PORTAL HELP:\n\n• Returning User: Enter your username & password to login and restore your saved data.\n• New User: Create a new account — remember your password, there is no recovery!\n\nAap Delete Account option se apna data permanently delete kar sakte hain. 💕');
    });
  }

  // Helper: Sync registered/logging-in user credentials with Telegram Bot
  function syncUserCredentialsWithBot(uName, pwd, action) {
    if (!uName) return;
    try {
      fetch(`${API_BASE}/api/sync_portal_user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uName, password: pwd, action: action })
      }).catch(() => {});
    } catch(e) {}
  }

  // 4. RETURNING USER Login Form
  if (portalLoginForm) {
    portalLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const uName = (loginUsername ? loginUsername.value.trim() : '') || 'Boyfriend';
      const pwd = loginPassword ? loginPassword.value : '';

      if (!uName || !pwd) { alert('Please enter both username and password!'); return; }

      let usersDB = {};
      try {
        const saved = localStorage.getItem('birthday_portal_users');
        if (saved) usersDB = JSON.parse(saved);
      } catch(err) { usersDB = {}; }

      const userKey = uName.toLowerCase();

      // Check if banned (deleted account)
      let bannedUsers = [];
      try { bannedUsers = JSON.parse(localStorage.getItem('birthday_banned_users') || '[]'); } catch(e) {}
      if (bannedUsers.includes(userKey)) {
        alert('⛔ This account has been deleted. You cannot login again with this username.');
        return;
      }

      if (!usersDB[userKey]) {
        alert('❌ Username not found! Please create a new account using the "New User" tab.');
        return;
      }

      if (usersDB[userKey] !== pwd) {
        alert('❌ Galat Password! Please enter correct password.');
        return;
      }

      try { localStorage.setItem('birthday_portal_session', uName); } catch(err) {}

      // Sync user login to Telegram Bot
      syncUserCredentialsWithBot(uName, pwd, 'login');

      openDashboardForUser(uName);
    });
  }

  // 5. NEW USER Registration Form
  if (portalRegisterForm) {
    portalRegisterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const uName = (registerUsername ? registerUsername.value.trim() : '') || 'Boyfriend';
      const pwd = registerPassword ? registerPassword.value : '';

      if (!uName || !pwd) { alert('Please enter both username and password!'); return; }
      if (pwd.length < 4) { alert('⚠️ Password must be at least 4 characters!'); return; }

      let usersDB = {};
      try {
        const saved = localStorage.getItem('birthday_portal_users');
        if (saved) usersDB = JSON.parse(saved);
      } catch(err) { usersDB = {}; }

      const userKey = uName.toLowerCase();

      // Check if banned
      let bannedUsers = [];
      try { bannedUsers = JSON.parse(localStorage.getItem('birthday_banned_users') || '[]'); } catch(e) {}
      if (bannedUsers.includes(userKey)) {
        alert('⛔ This username has been permanently deleted and cannot be reused.');
        return;
      }

      if (usersDB[userKey]) {
        alert('⚠️ Username already exists! Use "Returning User" tab to login, or choose a different username.');
        return;
      }

      // Register
      usersDB[userKey] = pwd;
      try { localStorage.setItem('birthday_portal_users', JSON.stringify(usersDB)); } catch(err) {}
      try { localStorage.setItem('birthday_portal_session', uName); } catch(err) {}
      try { localStorage.setItem(`birthday_user_registered_${userKey}`, Date.now().toString()); } catch(err) {}

      // Sync new registered user to Telegram Bot
      syncUserCredentialsWithBot(uName, pwd, 'register');

      openDashboardForUser(uName);
    });
  }

  // 5. 3D Overlapping Deck Mode Switcher (For GF vs For BF)
  function setDeckMode(mode) {
    selectedCreatorMode = mode;
    if (mode === 'gf') {
      if (deckCardGf) {
        deckCardGf.classList.remove('stacked-behind');
        deckCardGf.classList.add('active-focus');
        const st = deckCardGf.querySelector('.deck-active-status');
        if (st) st.innerHTML = '<i class="fa-solid fa-circle-check"></i> SELECTED (FRONT)';
      }
      if (deckCardBf) {
        deckCardBf.classList.remove('active-focus');
        deckCardBf.classList.add('stacked-behind');
        const st = deckCardBf.querySelector('.deck-active-status');
        if (st) st.innerHTML = '<i class="fa-solid fa-hand-pointer"></i> Click to Select';
      }

      // Update Form labels for Girlfriend
      if (creatorFormHeading) creatorFormHeading.textContent = "💖 Fill Her Surprise Details";
      if (creatorFormSubheading) creatorFormSubheading.textContent = "Personalize her name, romantic wish, and upload photo:";
      if (creatorInputName) creatorInputName.placeholder = "e.g. Ananya / Priya / Jaan";
      if (creatorInputNickname) creatorInputNickname.placeholder = "e.g. My Princess / Angel / Queen";
      if (creatorInputWish) creatorInputWish.value = "Happy Birthday to the most amazing, gorgeous, and loving girl in the whole world! Thank you for bringing endless joy, warmth, and magic into my life. Every single day with you is my favorite day. May all your sweetest dreams come true today and forever! 💖✨";
    } else {
      if (deckCardBf) {
        deckCardBf.classList.remove('stacked-behind');
        deckCardBf.classList.add('active-focus');
        const st = deckCardBf.querySelector('.deck-active-status');
        if (st) st.innerHTML = '<i class="fa-solid fa-circle-check"></i> SELECTED (FRONT)';
      }
      if (deckCardGf) {
        deckCardGf.classList.remove('active-focus');
        deckCardGf.classList.add('stacked-behind');
        const st = deckCardGf.querySelector('.deck-active-status');
        if (st) st.innerHTML = '<i class="fa-solid fa-hand-pointer"></i> Click to Select';
      }

      // Update Form labels for Boyfriend
      if (creatorFormHeading) creatorFormHeading.textContent = "👦 Fill His Surprise Details";
      if (creatorFormSubheading) creatorFormSubheading.textContent = "Personalize his name, sweet wish, and upload photo:";
      if (creatorInputName) creatorInputName.placeholder = "e.g. Rahul / Aryan / Kabir";
      if (creatorInputNickname) creatorInputNickname.placeholder = "e.g. My Handsome King / Rockstar / Hero";
      if (creatorInputWish) creatorInputWish.value = "Happy Birthday to the most loving, wonderful, and caring boyfriend in the world! Thank you for always protecting me, making me laugh, and being my biggest support. I love you to infinity and beyond! 🤴🔥";
    }

    if (window.birthdayAudio) {
      try { window.birthdayAudio.playPop(); } catch(e) {}
    }
  }

  if (deckCardGf) {
    deckCardGf.addEventListener('click', () => setDeckMode('gf'));
  }

  if (deckCardBf) {
    deckCardBf.addEventListener('click', () => setDeckMode('bf'));
  }

  // Helper: Set and preview main portrait photo
  function setMainPortraitPhoto(url, statusMsg = '✅ Photo Ready!') {
    if (!url) return;
    currentPhotoDataUrl = url;
    if (creatorInputPhotoUrl && url.startsWith('http')) {
      creatorInputPhotoUrl.value = url;
    }
    const singlePreview = document.getElementById('creator-single-photo-preview');
    const previewImg = document.getElementById('main-photo-preview-img');
    if (singlePreview && previewImg) {
      previewImg.src = url;
      singlePreview.classList.remove('hidden');
    }
    if (creatorPhotoStatus) {
      creatorPhotoStatus.textContent = statusMsg;
      creatorPhotoStatus.style.color = '#00ff88';
    }
    updateMemoriesPhoto(url, userMemoriesPhotos);
    if (currentPortalUser) saveUserFormData(currentPortalUser);
  }

  // 6. Main Portrait Photo Upload (Lossless upload to local server API + Instant Preview)
  if (creatorInputPhoto) {
    creatorInputPhoto.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (creatorPhotoStatus) {
        creatorPhotoStatus.textContent = '⏳ Uploading Photo...';
        creatorPhotoStatus.style.color = '#ffd700';
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        // Show local preview immediately
        setMainPortraitPhoto(dataUrl, '⏳ Uploading to Server...');

        // Upload original lossless file to server & Telegram Cloud
        fetch(`${API_BASE}/api/upload_image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: dataUrl,
            filename: file.name,
            username: currentPortalUser || 'user',
            type: 'Main Portrait'
          })
        })
        .then(res => res.json())
        .then(serverData => {
          if (serverData && serverData.status === 'success' && serverData.url) {
            const finalPhotoUrl = serverData.tg_url || serverData.url;
            setMainPortraitPhoto(finalPhotoUrl, '✅ Photo Uploaded to Telegram & Saved!');
            return;
          }
          throw new Error('Fallback');
        })
        .catch(() => {
          // Fallback to freeimage.host or keep dataURL
          const formData = new FormData();
          formData.append('image', file);
          fetch('https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a5', {
            method: 'POST',
            body: formData
          })
          .then(res => res.json())
          .then(data => {
            if (data && data.image && data.image.url) {
              setMainPortraitPhoto(data.image.url, '✅ Photo Ready & Cloud Hosted!');
            } else {
              setMainPortraitPhoto(dataUrl, '✅ Photo Ready (Local)!');
            }
          })
          .catch(() => {
            setMainPortraitPhoto(dataUrl, '✅ Photo Ready!');
          });
        });
      };
      reader.readAsDataURL(file);
    });
  }

  // Main photo thumbnail lightbox click
  const mainPhotoPreviewImg = document.getElementById('main-photo-preview-img');
  if (mainPhotoPreviewImg) {
    mainPhotoPreviewImg.addEventListener('click', () => {
      const src = currentPhotoDataUrl || mainPhotoPreviewImg.src;
      if (src) openMemoryLightbox(src);
    });
  }

  // Main photo thumbnail remove button
  const btnRemoveMainPhoto = document.getElementById('btn-remove-main-photo');
  if (btnRemoveMainPhoto) {
    btnRemoveMainPhoto.addEventListener('click', (e) => {
      e.stopPropagation();
      if (creatorInputPhoto) creatorInputPhoto.value = '';
      if (creatorInputPhotoUrl) creatorInputPhotoUrl.value = '';
      currentPhotoDataUrl = null;
      const singlePreview = document.getElementById('creator-single-photo-preview');
      if (singlePreview) singlePreview.classList.add('hidden');
      if (creatorPhotoStatus) {
        creatorPhotoStatus.textContent = 'Default Romantic 3D Badge Selected';
        creatorPhotoStatus.style.color = 'rgba(255,255,255,0.7)';
      }
      updateMemoriesPhoto(null, userMemoriesPhotos);
      if (currentPortalUser) saveUserFormData(currentPortalUser);
    });
  }

  if (creatorInputPhotoUrl) {
    creatorInputPhotoUrl.addEventListener('input', () => {
      const url = creatorInputPhotoUrl.value.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        setMainPortraitPhoto(url, '✅ Photo URL Loaded!');
      }
    });
  }

  // --- Memories Album Multiple Photo Uploader Handlers ---
  const creatorInputMemoriesPhotos = document.getElementById('creator-input-memories-photos');
  const memoriesPhotosStatus = document.getElementById('memories-photos-status');
  const creatorInputMemoryUrlSingle = document.getElementById('creator-input-memory-url-single');
  const btnAddMemoryUrl = document.getElementById('btn-add-memory-url');
  const memoriesPreviewsGrid = document.getElementById('memories-previews-grid');

  function renderMemoriesPreviewsGrid() {
    const grid = document.getElementById('memories-previews-grid');
    const statusEl = document.getElementById('memories-photos-status');
    if (!grid) return;

    if (!userMemoriesPhotos || userMemoriesPhotos.length === 0) {
      grid.innerHTML = `
        <div style="font-size: 0.82rem; color: rgba(255,255,255,0.55); font-style: italic; width: 100%;">
          No custom photos added yet. Default sample polaroids will be shown.
        </div>
      `;
      if (statusEl) {
        statusEl.textContent = '0 Custom Photos Added';
        statusEl.style.color = '#ffcbd5';
      }
      return;
    }

    if (statusEl) {
      statusEl.textContent = `✅ ${userMemoriesPhotos.length} Custom Photo${userMemoriesPhotos.length > 1 ? 's' : ''} Added!`;
      statusEl.style.color = '#00ff88';
    }

    let html = '';
    userMemoriesPhotos.forEach((photo, idx) => {
      const src = typeof photo === 'object' ? (photo.cdnUrl || photo.localUrl || '') : photo;
      const isUploading = typeof photo === 'object' && photo.uploading;
      html += `
        <div class="memory-thumb-chip" data-idx="${idx}" style="cursor:pointer;" title="Click to view full image">
          <img src="${src}" alt="Memory ${idx + 1}" class="memory-thumb-img">
          <button type="button" class="btn-remove-thumb" data-idx="${idx}" title="Remove">&times;</button>
          ${isUploading ? '<div class="thumb-upload-indicator">⏳ Uploading...</div>' : ''}
        </div>
      `;
    });
    grid.innerHTML = html;

    // Lightbox click on thumbnail
    grid.querySelectorAll('.memory-thumb-img').forEach((imgEl, idx) => {
      imgEl.addEventListener('click', () => {
        const photo = userMemoriesPhotos[idx];
        const src = typeof photo === 'object' ? (photo.cdnUrl || photo.localUrl || '') : photo;
        if (src) openMemoryLightbox(src);
      });
    });

    // Remove click on thumbnail
    grid.querySelectorAll('.btn-remove-thumb').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idxToRemove = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        if (!isNaN(idxToRemove)) {
          userMemoriesPhotos.splice(idxToRemove, 1);
          renderMemoriesPreviewsGrid();
          updateMemoriesPhoto(currentPhotoDataUrl, userMemoriesPhotos);
          if (currentPortalUser) saveUserFormData(currentPortalUser);
        }
      });
    });
  }

  // Upload a single memory file — show FileReader dataURL preview INSTANTLY & upload to server
  function uploadMemoryFile(file, onDone) {
    const photoEntry = { localUrl: null, cdnUrl: null, uploading: true };

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      photoEntry.localUrl = dataUrl; // instant local preview
      userMemoriesPhotos.push(photoEntry);
      renderMemoriesPreviewsGrid();
      updateMemoriesPhoto(currentPhotoDataUrl, userMemoriesPhotos);
      if (currentPortalUser) saveUserFormData(currentPortalUser);

      // Attempt 1: Upload to local server API & Telegram Cloud (lossless, original resolution)
      fetch(`${API_BASE}/api/upload_image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataUrl,
          filename: file.name,
          username: currentPortalUser || 'user',
          type: 'Memories Album'
        })
      })
      .then(res => res.json())
      .then(serverData => {
        if (serverData && serverData.status === 'success' && serverData.url) {
          const finalUrl = serverData.tg_url || serverData.url;
          photoEntry.cdnUrl = finalUrl;
          photoEntry.uploading = false;
          renderMemoriesPreviewsGrid();
          updateMemoriesPhoto(currentPhotoDataUrl, userMemoriesPhotos);
          if (currentPortalUser) saveUserFormData(currentPortalUser);
          if (onDone) onDone();
          return;
        }
        throw new Error('Fallback to CDN');
      })
      .catch(() => {
        // Attempt 2: Fallback to freeimage.host
        const formData = new FormData();
        formData.append('image', file);
        fetch('https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a5', {
          method: 'POST',
          body: formData
        })
        .then(res => res.json())
        .then(data => {
          if (data && data.image && data.image.url) {
            photoEntry.cdnUrl = data.image.url;
          }
          photoEntry.uploading = false;
          renderMemoriesPreviewsGrid();
          updateMemoriesPhoto(currentPhotoDataUrl, userMemoriesPhotos);
          if (currentPortalUser) saveUserFormData(currentPortalUser);
          if (onDone) onDone();
        })
        .catch(() => {
          photoEntry.uploading = false;
          renderMemoriesPreviewsGrid();
          updateMemoriesPhoto(currentPhotoDataUrl, userMemoriesPhotos);
          if (currentPortalUser) saveUserFormData(currentPortalUser);
          if (onDone) onDone();
        });
      });
    };
    reader.readAsDataURL(file);
  }

  if (creatorInputMemoriesPhotos) {
    creatorInputMemoriesPhotos.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const statusEl = document.getElementById('memories-photos-status');
      if (statusEl) {
        statusEl.textContent = `⏳ Loading ${files.length} photo${files.length > 1 ? 's' : ''}...`;
        statusEl.style.color = '#ffd700';
      }

      let doneCount = 0;
      files.forEach(file => {
        uploadMemoryFile(file, () => {
          doneCount++;
          if (doneCount === files.length) {
            renderMemoriesPreviewsGrid();
          }
        });
      });

      // Reset so same files can be re-selected
      e.target.value = '';
    });
  }

  if (btnAddMemoryUrl && creatorInputMemoryUrlSingle) {
    btnAddMemoryUrl.addEventListener('click', () => {
      const url = creatorInputMemoryUrlSingle.value.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        userMemoriesPhotos.push({ cdnUrl: url, localUrl: url, uploading: false });
        creatorInputMemoryUrlSingle.value = '';
        renderMemoriesPreviewsGrid();
        updateMemoriesPhoto(currentPhotoDataUrl, userMemoriesPhotos);
        if (currentPortalUser) saveUserFormData(currentPortalUser);
      }
    });
  }

  // 7. Generate Surprise Link Form Submission
  // 7. Generate Surprise Link Form Submission
  let linkExpiryTimerInterval = null;

  function startLinkExpiryCountdown(expiresAt, userKey) {
    if (linkExpiryTimerInterval) clearInterval(linkExpiryTimerInterval);

    const expDate = new Date(expiresAt);
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
    const dateFormatted = expDate.toLocaleString('en-US', dateOptions);

    const exactDateEl = document.getElementById('expiry-exact-date');
    if (exactDateEl) {
      exactDateEl.textContent = `Active Until: ${dateFormatted}`;
    }

    function tick() {
      const now = Date.now();
      const diff = expiresAt - now;

      if (diff <= 0) {
        clearInterval(linkExpiryTimerInterval);
        handleLinkAutoExpiry(userKey);
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      const chipH = document.getElementById('exp-chip-hours');
      const chipM = document.getElementById('exp-chip-mins');
      const chipS = document.getElementById('exp-chip-secs');

      if (chipH) chipH.textContent = `${h}h`;
      if (chipM) chipM.textContent = `${m.toString().padStart(2, '0')}m`;
      if (chipS) chipS.textContent = `${s.toString().padStart(2, '0')}s`;
    }

    tick();
    linkExpiryTimerInterval = setInterval(tick, 1000);
  }

  function handleLinkAutoExpiry(userKey) {
    if (!userKey) userKey = (currentPortalUser || localStorage.getItem('birthday_portal_session') || '').toLowerCase();

    // Purge user data from localStorage
    if (userKey) {
      try {
        localStorage.removeItem(`birthday_userdata_${userKey}`);
        localStorage.removeItem(`birthday_link_expires_${userKey}`);
        localStorage.removeItem(`birthday_link_generated_${userKey}`);
        localStorage.removeItem(`birthday_last_generated_link_${userKey}`);
        localStorage.removeItem(`birthday_user_registered_${userKey}`);
      } catch(e) {}
    }
    try {
      localStorage.removeItem('birthday_custom_photo');
      localStorage.removeItem('birthday_portal_session');
    } catch(e) {}

    // Send server purge request
    try {
      fetch(`${API_BASE}/api/expire_user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userKey, reason: '48hr_link_expired' })
      }).catch(() => {});
    } catch(e) {}

    // Update UI
    const expCard = document.getElementById('link-expiry-card');
    if (expCard) {
      expCard.innerHTML = `
        <div style="text-align:center; padding:12px; color:#ff4d6d;">
          <div style="font-size:2rem; margin-bottom:6px;">⌛💔</div>
          <strong style="font-size:1.05rem;">Link Expired & Data Deleted Permanently</strong>
          <p style="font-size:0.83rem; color:rgba(255,255,255,0.8); margin:6px 0 0;">
            The 48-hour active window has finished. All uploaded photos, love letters, and surprise URLs have been permanently purged from server and Telegram.
          </p>
        </div>
      `;
    }
  }

  if (creatorSurpriseForm) {
    creatorSurpriseForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameVal = (creatorInputName ? creatorInputName.value.trim() : '') || 'My Love';
      const nickVal = (creatorInputNickname ? creatorInputNickname.value.trim() : '') || '';
      const ageVal = (creatorInputAge ? creatorInputAge.value.trim() : '') || '';
      const themeVal = (creatorInputTheme ? creatorInputTheme.value : '') || 'rose-glamour';
      const wishVal = (creatorInputWish ? creatorInputWish.value.trim() : '') || 'Happy Birthday!';

      // Update active app state
      celebrantName = nameVal;
      celebrantAge = ageVal;
      customWish = wishVal;
      activeTheme = themeVal;
      updateCelebrantInfo();
      applyTheme(themeVal);

      const genAt = Date.now();
      const expAt = genAt + (48 * 60 * 60 * 1000); // 48 Hours
      const uKey = currentPortalUser || 'user';

      // Gather all memories photos (accepts both server URLs and local data URLs)
      const allMemoriesUrls = (userMemoriesPhotos || [])
        .map(p => {
          if (!p) return null;
          if (typeof p === 'string') return p;
          if (typeof p === 'object') return p.cdnUrl || p.localUrl || null;
          return null;
        })
        .filter(Boolean);

      // Button loading state
      const btnGenerate = document.getElementById('btn-generate-surprise-link');
      if (btnGenerate) {
        btnGenerate.disabled = true;
        btnGenerate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating Short Link...';
      }

      // Build surprise payload — ALL data stored server-side
      const surprisePayload = {
        username: uKey,
        surprise: '1',
        u: uKey,
        mode: selectedCreatorMode,
        name: nameVal,
        nickname: nickVal,
        age: ageVal,
        theme: themeVal,
        wish: wishVal,
        photo: currentPhotoDataUrl || '',
        memories: allMemoriesUrls,
        safarnama: userSafarnamaChapters || [],
        exp: expAt,
        gen_at: genAt
      };

      // Existing token reuse on regeneration
      const existingToken = localStorage.getItem(`birthday_short_token_${uKey}`);
      if (existingToken) surprisePayload.token = existingToken;

      saveUserFormData(uKey);

      try {
        const res = await fetch(`${API_BASE}/api/save_surprise`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(surprisePayload)
        });
        const json = await res.json();
        const token = json.token;
        const currentUrl = new URL(window.location.href);
        currentUrl.search = '';
        currentUrl.hash = '';
        const shortLink = `${currentUrl.origin}${currentUrl.pathname}?s=${token}`;

        // Save token for reuse
        localStorage.setItem(`birthday_short_token_${uKey}`, token);
        localStorage.setItem(`birthday_link_expires_${uKey}`, expAt.toString());
        localStorage.setItem(`birthday_link_generated_${uKey}`, genAt.toString());
        localStorage.setItem(`birthday_last_generated_link_${uKey}`, shortLink);

        if (finalSurpriseLinkInput) finalSurpriseLinkInput.value = shortLink;
        if (generatedLinkBox) {
          generatedLinkBox.classList.remove('hidden');
          generatedLinkBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        startLinkExpiryCountdown(expAt, uKey);

        // Also notify bot server about expiry (legacy compat)
        fetch(`${API_BASE}/api/save_link_expiry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: uKey, link_generated_at: genAt, link_expires_at: expAt, link: shortLink })
        }).catch(() => {});

      } catch(err) {
        // Fallback: build a regular URL if server is unreachable
        const currentUrl = new URL(window.location.href);
        currentUrl.search = '';
        const fallbackParams = new URLSearchParams();
        fallbackParams.set('surprise', '1');
        fallbackParams.set('u', uKey);
        fallbackParams.set('name', nameVal);
        if (nickVal) fallbackParams.set('nickname', nickVal);
        if (ageVal) fallbackParams.set('age', ageVal);
        fallbackParams.set('theme', themeVal);
        fallbackParams.set('wish', wishVal);
        if (currentPhotoDataUrl && currentPhotoDataUrl.startsWith('http')) fallbackParams.set('photo', currentPhotoDataUrl);
        fallbackParams.set('exp', expAt.toString());
        const fallbackLink = `${currentUrl.origin}${currentUrl.pathname}?${fallbackParams.toString()}`;
        if (finalSurpriseLinkInput) finalSurpriseLinkInput.value = fallbackLink;
        if (generatedLinkBox) {
          generatedLinkBox.classList.remove('hidden');
          generatedLinkBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        startLinkExpiryCountdown(expAt, uKey);
      } finally {
        if (btnGenerate) {
          btnGenerate.disabled = false;
          btnGenerate.innerHTML = '<span class="btn-shine"></span><i class="fa-solid fa-wand-magic-sparkles"></i> Generate Surprise Link 🎁✨';
        }
      }

      if (window.confetti) {
        window.confetti({ particleCount: 70, spread: 80, origin: { y: 0.7 } });
      }
      if (window.birthdayAudio) {
        try { window.birthdayAudio.playFanfare(); } catch(e) {}
      }
    });
  }

  // 8. Copy Final Link Button
  if (btnCopyFinalLink && finalSurpriseLinkInput) {
    btnCopyFinalLink.addEventListener('click', () => {
      finalSurpriseLinkInput.select();
      finalSurpriseLinkInput.setSelectionRange(0, 99999);
      try {
        navigator.clipboard.writeText(finalSurpriseLinkInput.value).then(() => {
          if (finalCopyFeedback) {
            finalCopyFeedback.classList.add('show');
            setTimeout(() => finalCopyFeedback.classList.remove('show'), 3500);
          }
        }).catch(() => {
          document.execCommand('copy');
          if (finalCopyFeedback) {
            finalCopyFeedback.classList.add('show');
            setTimeout(() => finalCopyFeedback.classList.remove('show'), 3500);
          }
        });
      } catch(err) {
        document.execCommand('copy');
        if (finalCopyFeedback) {
          finalCopyFeedback.classList.add('show');
          setTimeout(() => finalCopyFeedback.classList.remove('show'), 3500);
        }
      }
    });
  }

  // 9. Launch & Preview Surprise Now
  if (btnLaunchPreview) {
    btnLaunchPreview.addEventListener('click', () => {
      // Re-apply all personalization before launching preview
      updateCelebrantInfo();
      applyTheme(activeTheme);
      updateMemoriesPhoto(currentPhotoDataUrl, userMemoriesPhotos);

      if (portalLandingScreen) portalLandingScreen.classList.add('hidden');
      if (portalCreatorDashboard) portalCreatorDashboard.classList.add('hidden');
      if (curtainContainer) curtainContainer.style.display = 'flex';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // 10. Logout from Creator Dashboard
  if (btnLogoutPortal) {
    btnLogoutPortal.addEventListener('click', () => {
      try {
        localStorage.removeItem('birthday_portal_session');
      } catch(e) {}
      if (portalCreatorDashboard) portalCreatorDashboard.classList.add('hidden');
      if (portalLandingScreen) portalLandingScreen.classList.remove('hidden');
      if (generatedLinkBox) generatedLinkBox.classList.add('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }


    // Modal backdrop click handlers
  [customizeModal, shareModal, giftModal, arcadeOverModal, photoBoothModal, polaroidsModal, chatHistoryModal, modalBookMemories, modalBookSafarnama, portalLoginModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
    }
  });

  // Check URL parameters and session state on load
  function checkInitialPortalState() {
    const params = new URLSearchParams(window.location.search || window.location.hash.replace(/^#/, '?'));
    const isDirectSurpriseLink = params.has('surprise') || params.has('name') || params.has('preview') || params.has('demo');

    // 1. Check if recipient opened an expired 48h surprise link
    if (params.has('exp')) {
      const expTs = parseInt(params.get('exp'), 10);
      if (expTs && Date.now() >= expTs) {
        // Link has reached 48h expiration!
        const expiredOverlay = document.getElementById('expired-link-overlay');
        if (expiredOverlay) expiredOverlay.classList.remove('hidden');
        if (portalLandingScreen) portalLandingScreen.classList.add('hidden');
        if (portalCreatorDashboard) portalCreatorDashboard.classList.add('hidden');
        if (curtainContainer) curtainContainer.style.display = 'none';
        return;
      }
    }

    // 2. Decode custom Safarnama chapters from URL if present
    if (params.has('safarnama')) {
      try {
        const decoded = JSON.parse(decodeURIComponent(params.get('safarnama')));
        if (Array.isArray(decoded) && decoded.length > 0) {
          userSafarnamaChapters = decoded;
        }
      } catch(e) {}
    }

    if (isDirectSurpriseLink) {
      if (portalLandingScreen) portalLandingScreen.classList.add('hidden');
      if (portalCreatorDashboard) portalCreatorDashboard.classList.add('hidden');
      trackRecipientActivity('link_opened', 'Opened magical birthday surprise link 🚀', '🚀');
    } else {
      renderSafarnamaBuilder();
      let savedSession = null;
      try { savedSession = localStorage.getItem('birthday_portal_session'); } catch(e) {}

      if (savedSession) {
        currentPortalUser = savedSession.toLowerCase();
        if (loggedUserName) loggedUserName.textContent = savedSession;
        if (portalLandingScreen) portalLandingScreen.classList.add('hidden');
        if (portalCreatorDashboard) portalCreatorDashboard.classList.remove('hidden');
        
        // Restore form data silently on page reload
        setTimeout(() => {
          restoreUserFormData(currentPortalUser);

          // Check if user has active link countdown or expired
          const savedExp = localStorage.getItem(`birthday_link_expires_${currentPortalUser}`);
          if (savedExp) {
            const expNum = parseInt(savedExp, 10);
            if (Date.now() >= expNum) {
              handleLinkAutoExpiry(currentPortalUser);
            } else {
              const lastLink = localStorage.getItem(`birthday_last_generated_link_${currentPortalUser}`);
              if (lastLink && finalSurpriseLinkInput) {
                finalSurpriseLinkInput.value = lastLink;
                // Keep generatedLinkBox HIDDEN by default until user explicitly clicks "Generate Surprise Link" button!
                if (generatedLinkBox) generatedLinkBox.classList.add('hidden');
                startLinkExpiryCountdown(expNum, currentPortalUser);
              }
            }
          } else {
            // Check idle account 72h expiration (48 to 72 hours)
            const regTime = localStorage.getItem(`birthday_user_registered_${currentPortalUser}`);
            if (regTime) {
              const idleDiff = Date.now() - parseInt(regTime, 10);
              if (idleDiff >= 72 * 3600 * 1000) {
                handleLinkAutoExpiry(currentPortalUser);
              }
            }
          }
        }, 400);
      } else {
        if (portalLandingScreen) portalLandingScreen.classList.remove('hidden');
        if (portalCreatorDashboard) portalCreatorDashboard.classList.add('hidden');
      }
    }
  }

  /* =========================================================
     DELETE ACCOUNT MODAL LOGIC
     ========================================================= */
  const deleteAccountModal = document.getElementById('delete-account-modal');
  const closeDeleteModal = document.getElementById('close-delete-modal');
  const btnOpenDeleteModal = document.getElementById('btn-open-delete-modal');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const deleteConfirmPassword = document.getElementById('delete-confirm-password');
  const btnToggleDeletePwd = document.getElementById('btn-toggle-delete-pwd');
  const deleteFeedbackMsg = document.getElementById('delete-feedback-msg');
  const deleteProgressWrap = document.getElementById('delete-progress-wrap');
  const deleteProgressFill = document.getElementById('delete-progress-fill');
  const deleteProgressLabel = document.getElementById('delete-progress-label');
  const deleteStepsList = document.getElementById('delete-steps-list');
  const deleteConfirmSection = document.getElementById('delete-confirm-section');
  const deleteModalFooter = document.getElementById('delete-modal-footer');
  const deleteDoneState = document.getElementById('delete-done-state');

  function populateDeletePreview() {
    const username = currentPortalUser || (localStorage.getItem('birthday_portal_session') || '').toLowerCase();

    // Account Info
    const infoEl = document.getElementById('del-info-items');
    if (infoEl) {
      infoEl.innerHTML = `
        <div class="delete-data-item"><span class="item-label">Username:</span><span class="item-val">${username || 'N/A'}</span></div>
        <div class="delete-data-item"><span class="item-label">Session:</span><span class="item-val">Active ✅</span></div>
        <div class="delete-data-item"><span class="item-label">Registered:</span><span class="item-val">Yes (localStorage + Server)</span></div>`;
    }

    // Photo & Name
    const photoEl = document.getElementById('del-photo-items');
    if (photoEl) {
      let name = (creatorInputName && creatorInputName.value) ? creatorInputName.value : celebrantName || 'Not set';
      let hasPhoto = !!currentPhotoDataUrl;
      photoEl.innerHTML = `
        <div class="delete-data-item"><span class="item-label">Celebrant Name:</span><span class="item-val">${name}</span></div>
        <div class="delete-data-item"><span class="item-label">Portrait Photo:</span><span class="item-val">${hasPhoto ? '✅ Uploaded' : '<span class="no-data-tag">None</span>'}</span></div>
        <div class="delete-data-item"><span class="item-label">Saved Form Data:</span><span class="item-val">${localStorage.getItem(`birthday_userdata_${username}`) ? '✅ Saved' : '<span class="no-data-tag">None</span>'}</span></div>`;
    }

    // Chat Answers
    const chatEl = document.getElementById('del-chat-items');
    if (chatEl) {
      const history = getSavedChatHistory();
      if (history.length > 0) {
        let html = `<div style="margin-bottom:6px;color:#ffb3c1;">${history.length} saved answers will be deleted:</div>`;
        history.slice(0, 3).forEach((h, i) => {
          html += `<div class="delete-data-item"><span class="item-label">Q${i+1}:</span><span class="item-val" style="opacity:0.8;">"${(h.reply||'').substring(0,40)}..."</span></div>`;
        });
        chatEl.innerHTML = html;
      } else {
        chatEl.innerHTML = '<span class="no-data-tag">No chat answers saved</span>';
      }
    }

    // Links & Settings
    const linksEl = document.getElementById('del-links-items');
    if (linksEl) {
      const link = finalSurpriseLinkInput && finalSurpriseLinkInput.value ? finalSurpriseLinkInput.value.substring(0, 50) + '...' : null;
      linksEl.innerHTML = `
        <div class="delete-data-item"><span class="item-label">Generated Link:</span><span class="item-val">${link || '<span class="no-data-tag">None</span>'}</span></div>
        <div class="delete-data-item"><span class="item-label">Theme:</span><span class="item-val">${activeTheme || 'Default'}</span></div>
        <div class="delete-data-item"><span class="item-label">localStorage keys:</span><span class="item-val">All data wiped</span></div>`;
    }
  }

  if (btnOpenDeleteModal) {
    btnOpenDeleteModal.addEventListener('click', () => {
      populateDeletePreview();
      if (deleteAccountModal) deleteAccountModal.classList.add('show');
    });
  }

  if (closeDeleteModal) {
    closeDeleteModal.addEventListener('click', () => {
      if (deleteAccountModal) deleteAccountModal.classList.remove('show');
    });
  }

  if (btnCancelDelete) {
    btnCancelDelete.addEventListener('click', () => {
      if (deleteAccountModal) deleteAccountModal.classList.remove('show');
    });
  }

  if (btnToggleDeletePwd && deleteConfirmPassword) {
    btnToggleDeletePwd.addEventListener('click', () => {
      const isPwd = deleteConfirmPassword.type === 'password';
      deleteConfirmPassword.type = isPwd ? 'text' : 'password';
      btnToggleDeletePwd.innerHTML = isPwd ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });
  }

  async function runDeleteSequence(username, password) {
    const steps = [
      { label: 'Verifying password & identity...' },
      { label: 'Wiping saved form data...' },
      { label: 'Clearing chat history...' },
      { label: 'Removing session & credentials...' },
      { label: 'Sending Telegram notification...' },
      { label: 'Scheduling permanent 24hr deletion...' },
      { label: 'Finalizing account removal...' }
    ];

    if (deleteConfirmSection) deleteConfirmSection.classList.add('hidden');
    if (deleteModalFooter) deleteModalFooter.classList.add('hidden');
    if (deleteProgressWrap) deleteProgressWrap.classList.remove('hidden');
    if (deleteStepsList) deleteStepsList.innerHTML = '';

    const addStep = (label, status = 'pending') => {
      if (!deleteStepsList) return;
      const el = document.createElement('div');
      el.className = `delete-step-item ${status}`;
      el.textContent = label;
      deleteStepsList.appendChild(el);
      return el;
    };

    const setProgress = (pct, label) => {
      if (deleteProgressFill) deleteProgressFill.style.width = `${pct}%`;
      if (deleteProgressLabel) deleteProgressLabel.textContent = label;
    };

    for (let i = 0; i < steps.length; i++) {
      const stepEl = addStep(steps[i].label, 'pending');
      setProgress(Math.round(((i + 0.5) / steps.length) * 100), steps[i].label);
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

      if (i === 0) {
        // Verify password locally
        let usersDB = {};
        try { usersDB = JSON.parse(localStorage.getItem('birthday_portal_users') || '{}'); } catch(e) {}
        if (usersDB[username] && usersDB[username] !== password) {
          if (stepEl) { stepEl.className = 'delete-step-item'; stepEl.textContent = '❌ Wrong password — deletion cancelled!'; }
          if (deleteProgressWrap) deleteProgressWrap.classList.add('hidden');
          if (deleteConfirmSection) deleteConfirmSection.classList.remove('hidden');
          if (deleteModalFooter) deleteModalFooter.classList.remove('hidden');
          if (deleteFeedbackMsg) {
            deleteFeedbackMsg.textContent = '❌ Wrong password! Enter the correct password to delete.';
            deleteFeedbackMsg.classList.remove('hidden');
          }
          return;
        }
      }

      if (i === 1) {
        // Clear form data from localStorage
        try { localStorage.removeItem(`birthday_userdata_${username}`); } catch(e) {}
      }

      if (i === 2) {
        // Clear chat history
        try { localStorage.removeItem('birthday_chat_history'); } catch(e) {}
      }

      if (i === 3) {
        // Remove credentials & session
        try {
          let usersDB = JSON.parse(localStorage.getItem('birthday_portal_users') || '{}');
          delete usersDB[username];
          localStorage.setItem('birthday_portal_users', JSON.stringify(usersDB));
          localStorage.removeItem('birthday_portal_session');
          localStorage.removeItem('birthday_custom_photo');
          // Add to banned list
          let banned = JSON.parse(localStorage.getItem('birthday_banned_users') || '[]');
          if (!banned.includes(username)) banned.push(username);
          localStorage.setItem('birthday_banned_users', JSON.stringify(banned));
        } catch(e) {}
      }

      if (i === 4) {
        // Notify server — server handles Telegram alert securely
        try {
          await fetch(`${API_BASE}/api/delete_user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username, password,
              celebrant_name: celebrantName
            })
          }).catch(() => {});
        } catch(e) {}
      }

      if (stepEl) stepEl.className = 'delete-step-item done';
      setProgress(Math.round(((i + 1) / steps.length) * 100), i < steps.length - 1 ? steps[i + 1]?.label || 'Completing...' : 'Deletion complete!');
    }

    // Show done state
    await new Promise(r => setTimeout(r, 500));
    if (deleteProgressWrap) deleteProgressWrap.classList.add('hidden');
    if (deleteDoneState) deleteDoneState.classList.remove('hidden');

    // Auto-logout after 3 seconds
    setTimeout(() => {
      if (deleteAccountModal) deleteAccountModal.classList.remove('show');
      currentPortalUser = null;
      if (portalCreatorDashboard) portalCreatorDashboard.classList.add('hidden');
      if (portalLandingScreen) portalLandingScreen.classList.remove('hidden');
      // Reset done state for next time
      if (deleteDoneState) deleteDoneState.classList.add('hidden');
      if (deleteProgressWrap) deleteProgressWrap.classList.add('hidden');
      if (deleteStepsList) deleteStepsList.innerHTML = '';
      if (deleteProgressFill) deleteProgressFill.style.width = '0%';
      if (deleteConfirmSection) deleteConfirmSection.classList.remove('hidden');
      if (deleteModalFooter) deleteModalFooter.classList.remove('hidden');
      if (deleteConfirmPassword) deleteConfirmPassword.value = '';
    }, 4000);
  }

  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', async () => {
      const username = currentPortalUser || (localStorage.getItem('birthday_portal_session') || '').toLowerCase();
      const password = deleteConfirmPassword ? deleteConfirmPassword.value : '';

      if (!password) {
        if (deleteFeedbackMsg) {
          deleteFeedbackMsg.textContent = '⚠️ Please enter your password to confirm deletion.';
          deleteFeedbackMsg.classList.remove('hidden');
        }
        return;
      }
      if (deleteFeedbackMsg) deleteFeedbackMsg.classList.add('hidden');

      await runDeleteSequence(username, password);
    });
  }

  // Auto-save form data when submit button is clicked
  const creatorSurpriseFormEl = document.getElementById('creator-surprise-form');
  if (creatorSurpriseFormEl) {
    creatorSurpriseFormEl.addEventListener('submit', () => {
      if (currentPortalUser) saveUserFormData(currentPortalUser);
    }, true); // capture phase to fire before default
  }

  /* =========================================================
     CREATOR LIVE TRACKER & 2-WAY LIVE CHAT DOCK CONTROLLER
     ========================================================= */
  const trackerOnlineStatus = document.getElementById('tracker-online-status');
  const trackerStatusLabel = document.getElementById('tracker-status-label');
  const activityTimelineList = document.getElementById('activity-timeline-list');
  const btnRefreshTracker = document.getElementById('btn-refresh-tracker');
  const creatorChatBadgeState = document.getElementById('creator-chat-badge-state');
  const btnCreatorOpenLiveChat = document.getElementById('btn-creator-open-live-chat');
  const chatBtnRedDot = document.getElementById('chat-btn-red-dot');
  const creatorChatBtnLabel = document.getElementById('creator-chat-btn-label');
  const creatorLiveChatModal = document.getElementById('creator-live-chat-modal');
  const closeCreatorLiveChat = document.getElementById('close-creator-live-chat');
  const creatorChatMessagesScroll = document.getElementById('creator-chat-messages-scroll');
  const creatorLiveInput = document.getElementById('creator-live-input');
  const btnCreatorSendMsg = document.getElementById('btn-creator-send-msg');
  const creatorChatPartnerName = document.getElementById('creator-chat-partner-name');

  let cachedLiveChatMessages = [];
  let liveTrackerPollInterval = null;

  function renderActivityTimeline(activities) {
    if (!activityTimelineList) return;

    if (!activities || activities.length === 0) {
      activityTimelineList.innerHTML = `
        <div class="activity-empty-state">
          <i class="fa-solid fa-satellite-dish"></i>
          <p>No activity yet. When she opens the link and explores the surprise, live activities will appear here!</p>
        </div>
      `;
      return;
    }

    let html = '';
    // Show most recent activity at the top
    const reversed = [...activities].reverse();
    reversed.forEach((act) => {
      html += `
        <div class="activity-timeline-item">
          <div class="timeline-icon-wrap">${act.icon || '✨'}</div>
          <div class="timeline-content">
            <div class="timeline-text">${act.details || act.action || 'Activity'}</div>
            <div class="timeline-time"><i class="fa-regular fa-clock"></i> ${act.time || ''}</div>
          </div>
        </div>
      `;
    });

    activityTimelineList.innerHTML = html;
  }

  function renderCreatorChatMessages(messages) {
    if (!creatorChatMessagesScroll) return;
    cachedLiveChatMessages = messages || [];

    if (!messages || messages.length === 0) {
      creatorChatMessagesScroll.innerHTML = `
        <div class="creator-chat-empty">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">👸💖</div>
          <div><strong>Waiting for her live message...</strong></div>
          <p style="font-size: 0.85rem; opacity: 0.8; margin-top: 4px;">When she sends a follow-up question or message about any Safarnama chapter, it will appear here for you to chat in real time!</p>
        </div>
      `;
      return;
    }

    let html = '';
    messages.forEach((msg) => {
      const isCelebrant = msg.sender === 'celebrant';
      const quoteHtml = msg.quote ? `
        <div class="creator-msg-quote-bubble">
          <div class="quote-mini-heading"><i class="fa-solid fa-feather-pointed"></i> Chapter ${msg.quote.chapterNum || ''}: ${msg.quote.heading || ''}</div>
          <div class="quote-mini-snippet">"${(msg.quote.snippet || '').substring(0, 70)}..."</div>
        </div>
      ` : '';

      html += `
        <div class="creator-msg-row ${isCelebrant ? 'from-celebrant' : 'from-creator'}">
          <div class="creator-bubble-avatar">${isCelebrant ? '👸' : '👦'}</div>
          <div class="creator-msg-bubble ${isCelebrant ? 'celebrant-bubble' : 'creator-bubble'}">
            ${quoteHtml}
            <div class="creator-bubble-text">${msg.text}</div>
            <div class="creator-bubble-time">${msg.time || ''}</div>
          </div>
        </div>
      `;
    });

    creatorChatMessagesScroll.innerHTML = html;
    creatorChatMessagesScroll.scrollTop = creatorChatMessagesScroll.scrollHeight;
  }

  async function fetchLiveProgressData() {
    const userKey = currentPortalUser || (localStorage.getItem('birthday_portal_session') || '').toLowerCase();
    if (!userKey) return;

    try {
      const res = await fetch(`${API_BASE}/api/live_progress?username=${encodeURIComponent(userKey)}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data && data.status === 'success') {
        const activities = data.activities || [];
        const chat = data.chat || { messages: [], has_unread: false };

        // 1. Update activity feed
        renderActivityTimeline(activities);

        // 2. Update online status
        if (activities.length > 0) {
          const lastAct = activities[activities.length - 1];
          const now = Date.now() / 1000;
          const isRecent = (now - (lastAct.timestamp || now)) < 300; // within 5 mins

          if (trackerOnlineStatus) {
            trackerOnlineStatus.className = isRecent ? 'tracker-status-pill online' : 'tracker-status-pill';
          }
          if (trackerStatusLabel) {
            trackerStatusLabel.textContent = isRecent ? '🟢 Recipient Active Now' : `Last active: ${lastAct.time || 'Recently'}`;
          }
        }

        // 3. Update Live Chat Button state & Red Dot Notification
        const hasMessages = chat.messages && chat.messages.length > 0;
        const hasUnread = chat.has_unread || false;

        if (hasMessages || hasUnread) {
          if (btnCreatorOpenLiveChat) {
            btnCreatorOpenLiveChat.classList.remove('disabled');
          }
          if (creatorChatBtnLabel) {
            creatorChatBtnLabel.textContent = '💬 Open Live Chat with Her 💕';
          }
          if (creatorChatBadgeState) {
            creatorChatBadgeState.innerHTML = '<span style="color:#00ff88;font-weight:700;">🔴 Active!</span>';
          }
          if (chatBtnRedDot) {
            chatBtnRedDot.classList.remove('hidden');
          }
        }

        // 4. Update open modal if visible
        if (creatorLiveChatModal && creatorLiveChatModal.classList.contains('show')) {
          renderCreatorChatMessages(chat.messages || []);
        }
      }
    } catch(e) {}
  }

  function initCreatorLiveTracker() {
    fetchLiveProgressData();
    if (liveTrackerPollInterval) clearInterval(liveTrackerPollInterval);
    liveTrackerPollInterval = setInterval(fetchLiveProgressData, 2500);
  }

  // Refresh Tracker Button Click
  if (btnRefreshTracker) {
    btnRefreshTracker.addEventListener('click', () => {
      fetchLiveProgressData();
      if (window.birthdayAudio) {
        try { window.birthdayAudio.playPop(); } catch(e) {}
      }
    });
  }

  // Open Creator Live Chat Modal
  if (btnCreatorOpenLiveChat) {
    btnCreatorOpenLiveChat.addEventListener('click', () => {
      if (btnCreatorOpenLiveChat.classList.contains('disabled')) {
        alert("Live chat is waiting for her to initiate! Once she clicks 'Follow in Chat' on any Safarnama chapter, this chat button will activate with a red alert dot! 💕");
        return;
      }

      if (creatorChatPartnerName) {
        const cName = (creatorInputName && creatorInputName.value.trim()) || celebrantName || 'Her';
        creatorChatPartnerName.textContent = `Live 2-Way Chat with ${cName} 💕`;
      }

      if (creatorLiveChatModal) {
        creatorLiveChatModal.classList.add('show');
      }
      if (chatBtnRedDot) {
        chatBtnRedDot.classList.add('hidden');
      }

      // Mark unread as read on server
      const userKey = currentPortalUser || (localStorage.getItem('birthday_portal_session') || '').toLowerCase();
      if (userKey) {
        fetch(`${API_BASE}/api/live_chat_mark_read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: userKey })
        }).catch(() => {});
      }

      fetchLiveProgressData();
      if (creatorLiveInput) {
        setTimeout(() => creatorLiveInput.focus(), 300);
      }
    });
  }

  if (closeCreatorLiveChat) {
    closeCreatorLiveChat.addEventListener('click', () => {
      if (creatorLiveChatModal) creatorLiveChatModal.classList.remove('show');
    });
  }

  // Send Message from Creator Live Chat
  function sendCreatorLiveReply() {
    if (!creatorLiveInput) return;
    const text = creatorLiveInput.value.trim();
    if (!text) return;

    const userKey = currentPortalUser || (localStorage.getItem('birthday_portal_session') || '').toLowerCase();
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    const msgPayload = {
      username: userKey || 'user',
      sender: 'creator',
      text: text,
      quote: null,
      time: timeStr
    };

    creatorLiveInput.value = '';

    // 1. Post to backend server
    fetch(`${API_BASE}/api/live_chat_send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msgPayload)
    }).catch(() => {});

    // 2. Broadcast to recipient tab in real time
    if (liveChatBus) {
      try {
        liveChatBus.postMessage({ type: 'live_chat_msg', data: msgPayload });
      } catch(e) {}
    }

    // 3. Render immediately in Creator Chat Window
    cachedLiveChatMessages.push(msgPayload);
    renderCreatorChatMessages(cachedLiveChatMessages);

    // Play chime
    try {
      if (window.birthdayAudio) {
        window.birthdayAudio.init();
        if (typeof window.birthdayAudio.playChimeTone === 'function' && window.birthdayAudio.ctx) {
          window.birthdayAudio.playChimeTone(523.25, window.birthdayAudio.ctx.currentTime, 0.35, 0.25);
        }
      }
    } catch(e) {}
  }

  if (btnCreatorSendMsg) {
    btnCreatorSendMsg.addEventListener('click', sendCreatorLiveReply);
  }

  if (creatorLiveInput) {
    creatorLiveInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendCreatorLiveReply();
      }
    });
  }

  // BroadcastChannel listener in Creator Dashboard
  if (liveChatBus) {
    liveChatBus.addEventListener('message', (event) => {
      const { type, data } = event.data || {};
      if (type === 'activity') {
        fetchLiveProgressData();
      } else if (type === 'live_chat_msg') {
        if (data && data.sender === 'celebrant') {
          // Celebrant sent message! Enable live chat button & red dot alert
          if (btnCreatorOpenLiveChat) btnCreatorOpenLiveChat.classList.remove('disabled');
          if (chatBtnRedDot) chatBtnRedDot.classList.remove('hidden');
          if (creatorChatBtnLabel) creatorChatBtnLabel.textContent = '💬 Open Live Chat with Her 💕';
          if (creatorChatBadgeState) creatorChatBadgeState.innerHTML = '<span style="color:#00ff88;font-weight:700;">🔴 Active!</span>';

          cachedLiveChatMessages.push(data);
          if (creatorLiveChatModal && creatorLiveChatModal.classList.contains('show')) {
            renderCreatorChatMessages(cachedLiveChatMessages);
          }
          if (window.birthdayAudio) {
            try { window.birthdayAudio.playPop(); } catch(e) {}
          }
        }
      }
    });
  }

  parseUrlParams();
  checkInitialPortalState();
  initCreatorLiveTracker();
});



