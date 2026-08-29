/**
 * IzumiRain - Personal Donation Website Interactivity
 * Features:
 * 1. Ambient Rain & Particle Canvas System (with toggle & persistence)
 * 2. Client-Side QR Code generation & Dialog Modal
 * 3. Clipboard Copying with Web Audio synth chime and Toast alerts
 */

document.addEventListener('DOMContentLoaded', () => {
  initRainCanvas();
  initCopySystem();
  initQrModal();
  initSoundSystem();
});

/* ==========================================================================
   1. Ambient Rain & Particle Background
   ========================================================================== */
let rainActive = true;
let rainAnimId = null;

function initRainCanvas() {
  const canvas = document.getElementById('rainCanvas');
  const toggleBtn = document.getElementById('rainToggleBtn');
  const btnLabel = document.getElementById('rainBtnLabel');

  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  // Check user preference in localStorage
  const savedState = localStorage.getItem('izumi_rain_effect');
  if (savedState === 'disabled') {
    rainActive = false;
    canvas.style.opacity = '0';
    if (btnLabel) btnLabel.textContent = 'افکت باران: خاموش';
  }

  // Raindrop properties
  const dropsCount = Math.min(Math.floor(width / 14), 100);
  const drops = [];
  const splashes = [];

  for (let i = 0; i < dropsCount; i++) {
    drops.push({
      x: Math.random() * width,
      y: Math.random() * height,
      length: Math.random() * 18 + 10,
      speed: Math.random() * 4 + 3,
      opacity: Math.random() * 0.4 + 0.15,
      color: Math.random() > 0.3 ? '#38bdf8' : '#a855f7'
    });
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resize, { passive: true });

  function render() {
    if (!rainActive) return;

    ctx.clearRect(0, 0, width, height);

    // Update and draw raindrops
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];

      ctx.beginPath();
      ctx.strokeStyle = d.color;
      ctx.globalAlpha = d.opacity;
      ctx.lineWidth = 1.2;
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 1.5, d.y + d.length);
      ctx.stroke();

      d.y += d.speed;
      d.x -= 0.5;

      // Bottom collision / splash
      if (d.y > height) {
        // Spawn splash
        if (Math.random() > 0.6) {
          splashes.push({
            x: d.x,
            y: height - 2,
            radius: Math.random() * 3 + 1,
            maxRadius: Math.random() * 6 + 4,
            opacity: d.opacity,
            color: d.color
          });
        }
        d.y = -d.length;
        d.x = Math.random() * (width + 50);
      }
    }

    // Render splashes
    for (let j = splashes.length - 1; j >= 0; j--) {
      const s = splashes[j];
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = s.opacity;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      s.radius += 0.35;
      s.opacity -= 0.025;

      if (s.opacity <= 0 || s.radius >= s.maxRadius) {
        splashes.splice(j, 1);
      }
    }

    rainAnimId = requestAnimationFrame(render);
  }

  if (rainActive) {
    rainAnimId = requestAnimationFrame(render);
  }

  // Toggle button handler
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      rainActive = !rainActive;
      if (rainActive) {
        canvas.style.opacity = '0.65';
        if (btnLabel) btnLabel.textContent = 'افکت باران: روشن';
        localStorage.setItem('izumi_rain_effect', 'enabled');
        cancelAnimationFrame(rainAnimId);
        rainAnimId = requestAnimationFrame(render);
        showToast('🌧️ افکت باران فعال شد');
      } else {
        canvas.style.opacity = '0';
        if (btnLabel) btnLabel.textContent = 'افکت باران: خاموش';
        localStorage.setItem('izumi_rain_effect', 'disabled');
        cancelAnimationFrame(rainAnimId);
        ctx.clearRect(0, 0, width, height);
        showToast('✨ افکت باران غیرفعال شد');
      }
    });
  }
}

/* ==========================================================================
   2. Audio Synth Chime (Zero External Dependencies)
   ========================================================================== */
let audioCtx = null;

function initSoundSystem() {
  // Lazily initialized on first user interaction
}

function playSuccessChime() {
  try {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    
    // Note 1 (E6)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1318.51, now);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Note 2 (B6)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1975.53, now + 0.08);
    gain2.gain.setValueAtTime(0.06, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.35);
  } catch {
    // Gracefully handle browser autoplay restrictions
  }
}

/* ==========================================================================
   3. Clipboard Copying System & Toasts
   ========================================================================== */
function initCopySystem() {
  // Generic copy buttons (crypto cards & secondary buttons)
  const copyButtons = document.querySelectorAll('[data-copy]');

  copyButtons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const textToCopy = btn.getAttribute('data-copy');
      const name = btn.getAttribute('data-name') || 'متن';

      if (!textToCopy) return;

      const success = await copyToClipboard(textToCopy);
      if (success) {
        playSuccessChime();
        showToast(`آدرس ${name} با موفقیت کپی شد! ✨`);

        // Visual button feedback
        const originalHtml = btn.innerHTML;
        btn.classList.add('copied');
        const btnText = btn.querySelector('.btn-text');
        if (btnText) {
          btnText.textContent = 'کپی شد! 🎉';
        }

        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = originalHtml;
        }, 2200);
      } else {
        showToast('خطا در کپی کردن آدرس!', true);
      }
    });
  });
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
    }
  }

  // Fallback for older browsers / non-HTTPS
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

function showToast(message, isError = false) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (isError) toast.style.borderColor = 'rgba(239, 68, 68, 0.6)';

  toast.innerHTML = `
    <span class="toast-icon">${isError ? '⚠️' : '✅'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}

/* ==========================================================================
   4. QR Code Modal System (Using Native <dialog>)
   ========================================================================== */
function initQrModal() {
  const modal = document.getElementById('qrModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const qrButtons = document.querySelectorAll('.qr-btn');
  const titleEl = document.getElementById('modalNetworkTitle');
  const badgeEl = document.getElementById('modalCurrencyBadge');
  const addressTextEl = document.getElementById('modalAddressText');
  const modalCopyBtn = document.getElementById('modalCopyBtn');
  const modalCopyText = document.getElementById('modalCopyBtnText');
  const qrCanvas = document.getElementById('modalQrCanvas');
  const qrLoading = document.getElementById('qrLoading');

  let currentModalAddress = '';
  let currentModalNetwork = '';

  if (!modal || !qrCanvas) return;

  // Open modal handler
  qrButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const network = btn.getAttribute('data-network') || 'کیف پول';
      const address = btn.getAttribute('data-address') || '';
      const currency = btn.getAttribute('data-currency') || '';

      currentModalAddress = address;
      currentModalNetwork = network;

      if (titleEl) titleEl.textContent = `QR Code ${network}`;
      if (badgeEl) badgeEl.textContent = currency;
      if (addressTextEl) addressTextEl.textContent = address;
      if (modalCopyText) modalCopyText.textContent = 'کپی کردن آدرس';

      modal.showModal();
      generateQr(address);
    });
  });

  // Close modal button
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.close();
    });
  }

  // Close when clicking dialog backdrop
  modal.addEventListener('click', (event) => {
    const rect = modal.getBoundingClientRect();
    const isInDialog = (
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      modal.close();
    }
  });

  // Modal Copy Button
  if (modalCopyBtn) {
    modalCopyBtn.addEventListener('click', async () => {
      if (!currentModalAddress) return;
      const success = await copyToClipboard(currentModalAddress);
      if (success) {
        playSuccessChime();
        if (modalCopyText) modalCopyText.textContent = 'آدرس کپی شد! 🎉';
        showToast(`آدرس ${currentModalNetwork} کپی شد! ✨`);
        setTimeout(() => {
          if (modalCopyText) modalCopyText.textContent = 'کپی کردن آدرس';
        }, 2000);
      }
    });
  }

  // Render QR Code onto canvas
  function generateQr(text) {
    if (qrLoading) qrLoading.style.display = 'block';

    if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
      window.QRCode.toCanvas(
        qrCanvas,
        text,
        {
          width: 200,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        },
        (error) => {
          if (qrLoading) qrLoading.style.display = 'none';
          if (error) {
            drawFallbackQR(qrCanvas, text);
          }
        }
      );
    } else {
      // Fallback if CDN failed
      drawFallbackQR(qrCanvas, text);
    }
  }

  // Offline / CDN Fallback QR generator using lightweight client renderer
  function drawFallbackQR(canvas, text) {
    if (qrLoading) qrLoading.style.display = 'none';
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    
    // Draw an aesthetic placeholder or quick image fallback
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 200, 200);
    };
    img.onerror = () => {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#0f172a';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('برای اسکن QR آنلاین شوید', 100, 100);
    };
  }
}
