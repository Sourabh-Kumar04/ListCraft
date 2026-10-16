// ListCraft Frontend Logic
// High-Precision Studio Architecture

const PRESETS = {
  bottle: {
    product: "Stainless Steel Water Bottle",
    category: "Sports & Outdoors / Hydration",
    price: "$24.99",
    specs: "1L capacity (32 oz), double-wall vacuum insulated, 18/8 food-grade stainless steel, matte black powder-coat finish, keeps drinks cold 24h, hot 12h, leak-proof chug cap with carry handle, BPA-free, sweat-free exterior, dishwasher safe, fits standard cup holders."
  },
  wallet: {
    product: "Minimalist Bifold Leather Wallet",
    category: "Clothing, Shoes & Jewelry / Men's Wallets",
    price: "$34.00",
    specs: "Handcrafted full-grain crazy horse leather, slim profile (0.4 inch thick), RFID-blocking lining, holds 8-10 cards plus folded cash, quick-access thumb slot, burnished edges with durable waxed nylon stitching, vintage brown patina develops over time."
  },
  desk: {
    product: "Architect LED Desk Lamp",
    category: "Home & Office / Lighting",
    price: "$49.99",
    specs: "12W dimmable LED, 5 color temperature modes (3000K-6000K), flexible swing arm with 3-axis rotation, sturdy metal clamp for desks up to 2.5 inches, eye-care flicker-free technology, memory function for brightness setting, touch sensitive controls."
  }
};

const MARKETPLACE_INFO = {
  amazon: { limit: 200, label: "Amazon Ready", hint: "Amazon Title Limit: 200 chars (Factual & Structured)" },
  flipkart: { limit: 200, label: "Flipkart Ready", hint: "Flipkart Title Limit: 200 chars (Clear Specs & High Discovery)" },
  etsy: { limit: 140, label: "Etsy Ready", hint: "Etsy Title Limit: 140 chars (Aesthetic & Gift Keywords)" },
  shopify: { limit: 160, label: "Shopify Ready", hint: "Shopify Title Limit: Flexible / 160 chars recommended" }
};

let currentListing = null;
let activeStream = null;

function stopCurrentStream() {
  if (activeStream) {
    activeStream.cancelled = true;
    if (activeStream.timer) clearTimeout(activeStream.timer);
    activeStream = null;
  }
  document.querySelectorAll(".streaming-cursor").forEach(c => c.remove());
}

function skipStream() {
  if (currentListing) {
    stopCurrentStream();
    renderListingImmediate(currentListing);
    const statusBar = document.getElementById("streamingStatusBar");
    if (statusBar) statusBar.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  checkHealth();
  setupEventListeners();
  updateMarketplaceHint();
  updateInputCounters();
  if (window.__INITIAL_LISTING__) {
    currentListing = window.__INITIAL_LISTING__;
    renderListing(window.__INITIAL_LISTING__, { immediate: true });
  }
});

// Check Ollama Server Health
async function checkHealth() {
  const dot = document.querySelector(".status-dot");
  const text = document.getElementById("ollamaStatusText");
  const modelText = document.getElementById("activeModelName");

  try {
    const res = await fetch("/api/health");
    if (res.ok) {
      const data = await res.json();
      if (data.ollama_connected) {
        if (dot) dot.className = "status-dot online";
        if (text) text.textContent = "Ollama Active";
        if (data.model && modelText) {
          modelText.textContent = data.model;
        }
      } else {
        if (dot) dot.className = "status-dot offline";
        if (text) text.textContent = "Ollama Disconnected";
      }
    } else {
      if (dot) dot.className = "status-dot offline";
      if (text) text.textContent = "API Degraded";
    }
  } catch (err) {
    if (dot) dot.className = "status-dot offline";
    if (text) text.textContent = "Offline (Local)";
  }
}

function setupEventListeners() {
  // Preset buttons
  const btnBottle = document.getElementById("btnSampleBottle");
  const btnWallet = document.getElementById("btnSampleWallet");
  const btnDesk = document.getElementById("btnSampleDesk");

  if (btnBottle) btnBottle.addEventListener("click", (e) => loadPreset("bottle", e.target));
  if (btnWallet) btnWallet.addEventListener("click", (e) => loadPreset("wallet", e.target));
  if (btnDesk) btnDesk.addEventListener("click", (e) => loadPreset("desk", e.target));

  // Marketplace selection change
  const select = document.getElementById("marketplaceSelect");
  if (select) {
    select.addEventListener("change", updateMarketplaceHint);
  }

  // Interactive marketplace pills
  document.querySelectorAll(".marketplace-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      const market = pill.getAttribute("data-market");
      if (select && market) {
        select.value = market;
        select.dispatchEvent(new Event("change"));
      }
    });
  });

  // Real-time character counters
  const prodInput = document.getElementById("productName");
  if (prodInput) {
    prodInput.addEventListener("input", updateInputCounters);
  }

  const specsTextarea = document.getElementById("specsInput");
  if (specsTextarea) {
    specsTextarea.addEventListener("input", updateInputCounters);
  }

  // Form submit
  const form = document.getElementById("listingForm");
  if (form) {
    form.addEventListener("submit", handleGenerate);
  }

  // Copy Buttons
  document.querySelectorAll(".btn-copy").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const targetId = e.currentTarget.getAttribute("data-copy-target");
      if (targetId) {
        copyElementText(targetId);
      }
    });
  });

  const btnCopyKws = document.getElementById("btnCopyKeywords");
  if (btnCopyKws) btnCopyKws.addEventListener("click", copyKeywords);

  const btnCopyAll = document.getElementById("btnCopyAll");
  if (btnCopyAll) btnCopyAll.addEventListener("click", copyEntireListing);

  const btnGenExport = document.getElementById("btnGenerateExport");
  if (btnGenExport) btnGenExport.addEventListener("click", (e) => handleGenerate(e, true));

  const btnExp = document.getElementById("btnExport");
  if (btnExp) btnExp.addEventListener("click", exportListing);
}

function updateInputCounters() {
  const prod = document.getElementById("productName");
  const prodCounter = document.getElementById("productNameCount");
  if (prod && prodCounter) {
    prodCounter.textContent = `${prod.value.length} chars`;
  }

  const specs = document.getElementById("specsInput");
  const specsCounter = document.getElementById("specsCharCount");
  if (specs && specsCounter) {
    specsCounter.textContent = `${specs.value.length} chars`;
  }
}

function updateMarketplaceHint() {
  const select = document.getElementById("marketplaceSelect");
  if (!select) return;

  const hint = document.getElementById("marketplaceHint");
  const info = MARKETPLACE_INFO[select.value] || MARKETPLACE_INFO.amazon;
  if (hint) {
    hint.textContent = info.hint;
  }

  // Sync interactive marketplace pills
  document.querySelectorAll(".marketplace-pill").forEach(pill => {
    if (pill.getAttribute("data-market") === select.value) {
      pill.classList.add("active");
    } else {
      pill.classList.remove("active");
    }
  });
}

function loadPreset(key, clickedBtn) {
  const data = PRESETS[key];
  if (!data) return;

  document.querySelectorAll(".sample-btn").forEach(b => b.classList.remove("active"));
  if (clickedBtn) clickedBtn.classList.add("active");

  const prodEl = document.getElementById("productName");
  if (prodEl) prodEl.value = data.product;
  const catEl = document.getElementById("categoryInput");
  if (catEl) catEl.value = data.category;
  const priceEl = document.getElementById("priceInput");
  if (priceEl) priceEl.value = data.price;
  const specsEl = document.getElementById("specsInput");
  if (specsEl) specsEl.value = data.specs;

  updateInputCounters();
}

async function handleGenerate(e, autoExport = false) {
  if (e) e.preventDefault();

  const generateBtn = document.getElementById("generateBtn");
  const btnText = generateBtn ? generateBtn.querySelector(".btn-text") : null;
  const spinner = generateBtn ? generateBtn.querySelector(".btn-spinner") : null;

  const marketplaceEl = document.getElementById("marketplaceSelect");
  const marketplace = marketplaceEl ? marketplaceEl.value : "amazon";
  const productEl = document.getElementById("productName");
  const product = productEl ? productEl.value.trim() : "";
  const categoryEl = document.getElementById("categoryInput");
  const category = categoryEl ? categoryEl.value.trim() : "";
  const priceEl = document.getElementById("priceInput");
  const price = priceEl ? priceEl.value.trim() : "";
  const specsEl = document.getElementById("specsInput");
  const specs = specsEl ? specsEl.value.trim() : "";

  if (!product || !specs) {
    showToast("Please fill in the product name and specifications.");
    return null;
  }

  // Set loading state
  if (generateBtn) generateBtn.disabled = true;
  if (btnText) btnText.textContent = "Synthesizing Listing with Local LLM...";
  if (spinner) spinner.classList.remove("hidden");

  // Show loading skeleton in output canvas
  const skeleton = document.getElementById("loadingSkeleton");
  const emptyState = document.getElementById("emptyState");
  const container = document.getElementById("resultsContainer");

  if (emptyState) emptyState.classList.add("hidden");
  if (container) container.classList.add("hidden");
  if (skeleton) skeleton.classList.remove("hidden");

  // AI Thinking State Tracker
  let thinkingInterval = null;
  const startTime = performance.now();
  const thinkingStatusText = document.getElementById("thinkingStatusText");
  const thinkingTimerBadge = document.getElementById("thinkingTimerBadge");

  const thinkingSteps = [
    "Analyzing product parameters & specifications...",
    `Applying ${marketplace.toUpperCase()} A10 algorithmic limits & character boundaries...`,
    "Synthesizing 5 structured conversion benefit anchors...",
    "Formulating editorial brand narrative and indexing search terms..."
  ];

  if (thinkingStatusText) thinkingStatusText.textContent = thinkingSteps[0];
  if (thinkingTimerBadge) thinkingTimerBadge.textContent = "Thinking · 0.0s";

  thinkingInterval = setInterval(() => {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    if (thinkingTimerBadge) thinkingTimerBadge.textContent = `Thinking · ${elapsed}s`;
    const stepIdx = Math.min(thinkingSteps.length - 1, Math.floor((performance.now() - startTime) / 1200));
    if (thinkingStatusText) thinkingStatusText.textContent = thinkingSteps[stepIdx];
  }, 100);

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, marketplace, specs, category, price })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error (${res.status})`);
    }

    const listing = await res.json();
    currentListing = listing;
    renderListing(listing);
    if (autoExport) {
      exportListing();
    } else {
      showToast("Listing generated successfully!");
    }
    return listing;
  } catch (err) {
    console.error("Generation error:", err);
    alert(`Generation Error: ${err.message}\n\nPlease check that Ollama is running ('ollama serve') and the model is downloaded.`);
    return null;
  } finally {
    if (thinkingInterval) clearInterval(thinkingInterval);
    if (generateBtn) generateBtn.disabled = false;
    if (btnText) btnText.textContent = "Generate Platform Listing";
    if (spinner) spinner.classList.add("hidden");
    if (skeleton) skeleton.classList.add("hidden");
    if (!currentListing) {
      if (emptyState) emptyState.classList.remove("hidden");
    }
  }
}

function renderListing(data, options = {}) {
  stopCurrentStream();
  currentListing = data;

  const skeleton = document.getElementById("loadingSkeleton");
  if (skeleton) skeleton.classList.add("hidden");

  const emptyState = document.getElementById("emptyState");
  if (emptyState) emptyState.classList.add("hidden");

  const container = document.getElementById("resultsContainer");
  if (container) container.classList.remove("hidden");

  const copyAllBtn = document.getElementById("btnCopyAll");
  if (copyAllBtn) copyAllBtn.disabled = false;

  const exportBtn = document.getElementById("btnExport");
  if (exportBtn) exportBtn.disabled = false;

  // Marketplace badge
  const info = MARKETPLACE_INFO[data.marketplace.toLowerCase()] || { label: `${data.marketplace} Ready`, limit: data.char_limit };
  const badge = document.getElementById("resultMarketplaceBadge");
  if (badge) {
    badge.textContent = info.label;
  }

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || options.immediate) {
    renderListingImmediate(data);
    return;
  }

  // AI-Native Progressive Reveal
  startStreamingReveal(data);
}

function renderListingImmediate(data) {
  stopCurrentStream();
  currentListing = data;

  const statusBar = document.getElementById("streamingStatusBar");
  if (statusBar) statusBar.classList.add("hidden");

  const copyAllBtn = document.getElementById("btnCopyAll");
  if (copyAllBtn) copyAllBtn.disabled = false;

  const exportBtn = document.getElementById("btnExport");
  if (exportBtn) exportBtn.disabled = false;

  // Badge
  const info = MARKETPLACE_INFO[data.marketplace.toLowerCase()] || { label: `${data.marketplace} Ready`, limit: data.char_limit };
  const badge = document.getElementById("resultMarketplaceBadge");
  if (badge) badge.textContent = info.label;

  // Title
  const titleEl = document.getElementById("listingTitle");
  if (titleEl) titleEl.textContent = data.title;

  const countEl = document.getElementById("titleCharCount");
  if (countEl) {
    countEl.textContent = `${data.char_count} / ${data.char_limit} chars`;
    countEl.style.color = data.char_count <= data.char_limit ? "#059669" : "#e11d48";
  }

  // Progress Bar
  const progressBar = document.getElementById("titleProgressBar");
  if (progressBar) {
    const pct = Math.min(100, Math.round((data.char_count / data.char_limit) * 100));
    progressBar.style.width = `${pct}%`;
    progressBar.style.backgroundColor = data.char_count <= data.char_limit ? "#059669" : "#e11d48";
  }

  // Bullets
  const bulletsList = document.getElementById("bulletsList");
  if (bulletsList) {
    bulletsList.innerHTML = "";
    data.bullets.forEach((bullet, idx) => {
      const li = document.createElement("li");

      const dot = document.createElement("span");
      dot.className = "bullet-dot";
      dot.textContent = `${idx + 1}.`;

      const content = document.createElement("span");
      content.className = "bullet-content";

      // Split bold title if brackets or colon present
      const colonIdx = bullet.indexOf(":");
      if (bullet.startsWith("[") && bullet.includes("]")) {
        const endBracket = bullet.indexOf("]");
        const header = bullet.substring(0, endBracket + 1);
        const rest = bullet.substring(endBracket + 1).replace(/^[\s:]+/, "");
        content.innerHTML = `<strong class="bullet-header">${escapeHtml(header)}</strong> ${escapeHtml(rest)}`;
      } else if (colonIdx > 0 && colonIdx < 40) {
        const header = bullet.substring(0, colonIdx);
        const rest = bullet.substring(colonIdx + 1).trim();
        content.innerHTML = `<strong class="bullet-header">${escapeHtml(header)}:</strong> ${escapeHtml(rest)}`;
      } else {
        content.textContent = bullet;
      }

      const copyBtn = document.createElement("button");
      copyBtn.className = "bullet-copy-mini";
      copyBtn.title = "Copy this bullet";
      copyBtn.setAttribute("aria-label", `Copy bullet ${idx + 1}`);
      copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(bullet);
        showToast(`Copied bullet #${idx + 1}`);
      });

      li.appendChild(dot);
      li.appendChild(content);
      li.appendChild(copyBtn);
      bulletsList.appendChild(li);
    });
  }

  // Description
  const descEl = document.getElementById("listingDescription");
  if (descEl) descEl.textContent = data.description;

  // Keywords
  const kwContainer = document.getElementById("keywordsTags");
  if (kwContainer) {
    kwContainer.innerHTML = "";
    const kwCountEl = document.getElementById("keywordCount");
    if (kwCountEl) {
      kwCountEl.textContent = `${data.keywords.length} keywords`;
    }

    data.keywords.forEach(kw => {
      const span = document.createElement("span");
      span.className = "keyword-tag";
      span.textContent = kw;
      span.title = "Click to copy keyword";
      span.addEventListener("click", () => {
        navigator.clipboard.writeText(kw);
        showToast(`Copied "${kw}"`);
      });
      kwContainer.appendChild(span);
    });
  }
}

function startStreamingReveal(data) {
  const streamState = { cancelled: false, timer: null };
  activeStream = streamState;

  const statusBar = document.getElementById("streamingStatusBar");
  const streamMsg = document.getElementById("streamingMsg");
  const btnSkip = document.getElementById("btnSkipStream");
  if (statusBar) {
    statusBar.classList.remove("hidden");
    statusBar.classList.remove("fade-out");
  }
  if (streamMsg) streamMsg.textContent = "Streaming AI generation...";
  if (btnSkip) {
    btnSkip.onclick = () => skipStream();
  }

  // Reset elements
  const titleEl = document.getElementById("listingTitle");
  const bulletsList = document.getElementById("bulletsList");
  const descEl = document.getElementById("listingDescription");
  const kwContainer = document.getElementById("keywordsTags");
  const kwCountEl = document.getElementById("keywordCount");
  const countEl = document.getElementById("titleCharCount");
  const progressBar = document.getElementById("titleProgressBar");

  if (titleEl) titleEl.innerHTML = "";
  if (bulletsList) bulletsList.innerHTML = "";
  if (descEl) descEl.innerHTML = "";
  if (kwContainer) kwContainer.innerHTML = "";
  if (kwCountEl) kwCountEl.textContent = "0 keywords";
  if (countEl) {
    countEl.textContent = `0 / ${data.char_limit} chars`;
    countEl.style.color = "#059669";
  }
  if (progressBar) {
    progressBar.style.width = "0%";
    progressBar.style.backgroundColor = "#059669";
  }

  // 1. Stream Title
  const titleText = data.title || "";
  let titleIdx = 0;
  const cursor = document.createElement("span");
  cursor.className = "streaming-cursor";
  cursor.setAttribute("aria-hidden", "true");

  function stepTitle() {
    if (streamState.cancelled) return;
    if (titleIdx < titleText.length) {
      const step = Math.min(titleText.length - titleIdx, 3);
      titleIdx += step;
      if (titleEl) {
        titleEl.textContent = titleText.slice(0, titleIdx);
        titleEl.appendChild(cursor);
      }
      if (countEl) {
        countEl.textContent = `${titleIdx} / ${data.char_limit} chars`;
        countEl.style.color = titleIdx <= data.char_limit ? "#059669" : "#e11d48";
      }
      if (progressBar) {
        const pct = Math.min(100, Math.round((titleIdx / data.char_limit) * 100));
        progressBar.style.width = `${pct}%`;
        progressBar.style.backgroundColor = titleIdx <= data.char_limit ? "#059669" : "#e11d48";
      }
      streamState.timer = setTimeout(stepTitle, 12);
    } else {
      cursor.remove();
      streamState.timer = setTimeout(stepBullets, 60);
    }
  }

  // 2. Stream Bullets
  let bulletIdx = 0;
  function stepBullets() {
    if (streamState.cancelled) return;
    if (bulletIdx < data.bullets.length) {
      const bText = data.bullets[bulletIdx];
      const li = document.createElement("li");
      li.className = "streaming-bullet-item";

      const dot = document.createElement("span");
      dot.className = "bullet-dot";
      dot.textContent = `${bulletIdx + 1}.`;

      const content = document.createElement("span");
      content.className = "bullet-content";

      const bCursor = document.createElement("span");
      bCursor.className = "streaming-cursor";
      bCursor.setAttribute("aria-hidden", "true");

      li.appendChild(dot);
      li.appendChild(content);
      if (bulletsList) bulletsList.appendChild(li);

      let charIdx = 0;
      function streamSingleBullet() {
        if (streamState.cancelled) return;
        if (charIdx < bText.length) {
          const step = Math.min(bText.length - charIdx, 4);
          charIdx += step;
          const currentSub = bText.slice(0, charIdx);

          const colonIdx = currentSub.indexOf(":");
          if (currentSub.startsWith("[") && currentSub.includes("]")) {
            const endBracket = currentSub.indexOf("]");
            const header = currentSub.substring(0, endBracket + 1);
            const rest = currentSub.substring(endBracket + 1).replace(/^[\s:]+/, "");
            content.innerHTML = `<strong class="bullet-header">${escapeHtml(header)}</strong> ${escapeHtml(rest)}`;
          } else if (colonIdx > 0 && colonIdx < 40) {
            const header = currentSub.substring(0, colonIdx);
            const rest = currentSub.substring(colonIdx + 1).trim();
            content.innerHTML = `<strong class="bullet-header">${escapeHtml(header)}:</strong> ${escapeHtml(rest)}`;
          } else {
            content.textContent = currentSub;
          }
          content.appendChild(bCursor);
          streamState.timer = setTimeout(streamSingleBullet, 12);
        } else {
          bCursor.remove();
          const currentBulletIndex = bulletIdx;
          const copyBtn = document.createElement("button");
          copyBtn.className = "bullet-copy-mini";
          copyBtn.title = "Copy this bullet";
          copyBtn.setAttribute("aria-label", `Copy bullet ${currentBulletIndex + 1}`);
          copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
          copyBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(bText);
            showToast(`Copied bullet #${currentBulletIndex + 1}`);
          });
          li.appendChild(copyBtn);

          bulletIdx++;
          streamState.timer = setTimeout(stepBullets, 30);
        }
      }
      streamSingleBullet();
    } else {
      streamState.timer = setTimeout(stepDescription, 60);
    }
  }

  // 3. Stream Description
  function stepDescription() {
    if (streamState.cancelled) return;
    const descText = data.description || "";
    let descIdx = 0;
    const dCursor = document.createElement("span");
    dCursor.className = "streaming-cursor";
    dCursor.setAttribute("aria-hidden", "true");

    function streamDesc() {
      if (streamState.cancelled) return;
      if (descIdx < descText.length) {
        const step = Math.min(descText.length - descIdx, 6);
        descIdx += step;
        if (descEl) {
          descEl.textContent = descText.slice(0, descIdx);
          descEl.appendChild(dCursor);
        }
        streamState.timer = setTimeout(streamDesc, 12);
      } else {
        dCursor.remove();
        streamState.timer = setTimeout(stepKeywords, 40);
      }
    }
    streamDesc();
  }

  // 4. Reveal Keywords
  function stepKeywords() {
    if (streamState.cancelled) return;
    if (kwCountEl) kwCountEl.textContent = `${data.keywords.length} keywords`;
    if (kwContainer) {
      kwContainer.innerHTML = "";
      data.keywords.forEach((kw, i) => {
        const span = document.createElement("span");
        span.className = "keyword-tag keyword-pop-in";
        span.style.animationDelay = `${i * 30}ms`;
        span.textContent = kw;
        span.title = "Click to copy keyword";
        span.addEventListener("click", () => {
          navigator.clipboard.writeText(kw);
          showToast(`Copied "${kw}"`);
        });
        kwContainer.appendChild(span);
      });
    }

    if (streamMsg) streamMsg.textContent = "✓ Synthesis Complete";
    if (statusBar) {
      setTimeout(() => {
        if (!streamState.cancelled) {
          statusBar.classList.add("fade-out");
          setTimeout(() => statusBar.classList.add("hidden"), 300);
        }
      }, 1600);
    }
    activeStream = null;
  }

  // Start stream
  stepTitle();
}

function copyElementText(id) {
  let text = "";
  if (!currentListing) {
    const el = document.getElementById(id);
    if (el) text = el.innerText || el.textContent;
  } else if (id === "listingTitle") {
    text = currentListing.title || "";
  } else if (id === "bulletsList") {
    text = currentListing.bullets ? currentListing.bullets.map(b => `• ${b}`).join("\n") : "";
  } else if (id === "listingDescription") {
    text = currentListing.description || "";
  } else {
    const el = document.getElementById(id);
    if (el) text = el.innerText || el.textContent;
  }
  if (text) {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!");
  }
}

function copyKeywords() {
  if (!currentListing || !currentListing.keywords) return;
  const kwText = currentListing.keywords.join(", ");
  navigator.clipboard.writeText(kwText);
  showToast("Keywords copied as comma-separated list!");
}

function copyEntireListing() {
  if (!currentListing) return;
  const output = [
    `=== PRODUCT TITLE (${currentListing.marketplace}) ===`,
    currentListing.title,
    `\n=== 5 BULLET POINTS ===`,
    ...currentListing.bullets.map((b, i) => `${i + 1}. ${b}`),
    `\n=== PRODUCT DESCRIPTION ===`,
    currentListing.description,
    `\n=== BACKEND KEYWORDS ===`,
    currentListing.keywords.join(", ")
  ].join("\n");

  navigator.clipboard.writeText(output);
  showToast("Complete formatted listing copied!");
}

function exportListing() {
  if (!currentListing) return;
  const md = [
    `# ${currentListing.title}`,
    ``,
    `*Marketplace: ${currentListing.marketplace} | Generated by ListCraft (open-model AI)*`,
    ``,
    `## Bullet Points`,
    ``,
    ...currentListing.bullets.map((b) => `- ${b}`),
    ``,
    `## Product Description`,
    ``,
    currentListing.description,
    ``,
    `## Backend Search Keywords`,
    ``,
    currentListing.keywords.join(", "),
    ``
  ].join("\n");
  const slug = currentListing.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "listing";
  const blob = new Blob([md], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `listcraft-${currentListing.marketplace.toLowerCase()}-${slug}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  showToast("Listing exported as Markdown!");
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2400);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
