// ListCraft Frontend Logic
// Obsidian Synth SaaS Redesign

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

document.addEventListener("DOMContentLoaded", () => {
  checkHealth();
  setupEventListeners();
  updateMarketplaceHint();
  updateInputCounters();
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
        dot.className = "status-dot online";
        text.textContent = "Ollama Active";
        if (data.model) {
          modelText.textContent = data.model;
        }
      } else {
        dot.className = "status-dot offline";
        text.textContent = "Ollama Disconnected";
      }
    } else {
      dot.className = "status-dot offline";
      text.textContent = "API Degraded";
    }
  } catch (err) {
    dot.className = "status-dot offline";
    text.textContent = "Offline (Local)";
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

  document.getElementById("productName").value = data.product;
  document.getElementById("categoryInput").value = data.category;
  document.getElementById("priceInput").value = data.price;
  document.getElementById("specsInput").value = data.specs;

  updateInputCounters();
}

async function handleGenerate(e, autoExport = false) {
  if (e) e.preventDefault();

  const generateBtn = document.getElementById("generateBtn");
  const btnText = generateBtn.querySelector(".btn-text");
  const spinner = generateBtn.querySelector(".btn-spinner");

  const marketplace = document.getElementById("marketplaceSelect").value;
  const product = document.getElementById("productName").value.trim();
  const category = document.getElementById("categoryInput").value.trim();
  const price = document.getElementById("priceInput").value.trim();
  const specs = document.getElementById("specsInput").value.trim();

  if (!product || !specs) {
    showToast("Please fill in the product name and specifications.");
    return null;
  }

  // Set loading state
  generateBtn.disabled = true;
  btnText.textContent = "Writing Listing with Local LLM...";
  if (spinner) spinner.classList.remove("hidden");

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
    generateBtn.disabled = false;
    btnText.textContent = "Generate Listing with Local LLM";
    if (spinner) spinner.classList.add("hidden");
  }
}

function renderListing(data) {
  const emptyState = document.getElementById("emptyState");
  if (emptyState) emptyState.classList.add("hidden");

  const container = document.getElementById("resultsContainer");
  if (container) container.classList.remove("hidden");

  const copyAllBtn = document.getElementById("btnCopyAll");
  if (copyAllBtn) copyAllBtn.disabled = false;

  const exportBtn = document.getElementById("btnExport");
  if (exportBtn) exportBtn.disabled = false;

  // Badge
  const info = MARKETPLACE_INFO[data.marketplace.toLowerCase()] || { label: `${data.marketplace} Ready`, limit: data.char_limit };
  const badge = document.getElementById("resultMarketplaceBadge");
  if (badge) {
    badge.textContent = info.label;
  }

  // Title
  const titleEl = document.getElementById("listingTitle");
  if (titleEl) titleEl.textContent = data.title;

  const countEl = document.getElementById("titleCharCount");
  if (countEl) {
    countEl.textContent = `${data.char_count} / ${data.char_limit} chars`;
    if (data.char_count <= data.char_limit) {
      countEl.style.color = "#10b981";
    } else {
      countEl.style.color = "#f43f5e";
    }
  }

  // Progress Bar
  const progressBar = document.getElementById("titleProgressBar");
  if (progressBar) {
    const pct = Math.min(100, Math.round((data.char_count / data.char_limit) * 100));
    progressBar.style.width = `${pct}%`;
    progressBar.style.backgroundColor = data.char_count <= data.char_limit ? "#10b981" : "#f43f5e";
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
        const rest = bullet.substring(endBracket + 1);
        content.innerHTML = `<strong class="bullet-header">${escapeHtml(header)}</strong>${escapeHtml(rest)}`;
      } else if (colonIdx > 0 && colonIdx < 40) {
        const header = bullet.substring(0, colonIdx + 1);
        const rest = bullet.substring(colonIdx + 1);
        content.innerHTML = `<strong class="bullet-header">${escapeHtml(header)}</strong>${escapeHtml(rest)}`;
      } else {
        content.textContent = bullet;
      }

      const copyBtn = document.createElement("button");
      copyBtn.className = "bullet-copy-mini";
      copyBtn.title = "Copy this bullet";
      copyBtn.textContent = "📋";
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

function copyElementText(id) {
  let text = "";
  if (id === "bulletsList") {
    if (!currentListing || !currentListing.bullets) return;
    text = currentListing.bullets.map(b => `• ${b}`).join("\n");
  } else {
    const el = document.getElementById(id);
    if (!el) return;
    text = el.innerText || el.textContent;
  }
  navigator.clipboard.writeText(text);
  showToast("Copied to clipboard!");
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
