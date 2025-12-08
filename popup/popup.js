 document.addEventListener('DOMContentLoaded', function() {

// --- STATE ---
let images = [];
let saved = [];
let hidden = []; // Track permanently hidden images
let currentIndex = 0;
let currentView = "home";
let selectedImage = null;
let imageCache = new Set();
let isLoading = false;
let PEXELS_API_KEY = null;

// --- DOM ELEMENTS ---
const menuBtn = document.getElementById("menuBtn");
const backBtn = document.getElementById("backBtn");
const closeBtn = document.getElementById("closeBtn");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const imageContainer = document.getElementById("imageContainer");
const saveBtn = document.getElementById("saveBtn");
const nextBtn = document.getElementById("nextBtn");
const navItems = document.querySelectorAll(".nav-item");

const homeView = document.getElementById("homeView");
const savedView = document.getElementById("savedView");
const detailView = document.getElementById("detailView");
const aboutView = document.getElementById("aboutView");
const savedGrid = document.getElementById("savedGrid");

// --- API QUERIES ---
const queries = [
  "cute animals", "cute cats", "cute dogs", "puppies", "kittens",
  "fox", "otter", "hedgehog", "hamster", "bunny", "turtle", "raccoon",
  "panda", "duckling", "wildlife baby animals", "red panda", "koala",
  "guinea pig", "deer fawn", "squirrel",
  "penguin", "chipmunk", "ferret"
];

function getRandomQueries(count = 4) {
  const shuffled = [...queries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// --- LOAD SAVED AND HIDDEN IMAGES ---
chrome.storage.local.get(["savedAnimals", "hiddenAnimals"], (data) => {
  saved = data.savedAnimals || [];
  hidden = data.hiddenAnimals || [];
});

// --- CHECK FOR API KEY ON STARTUP ---
chrome.storage.local.get(['pexelsApiKey'], (result) => {
  if (result.pexelsApiKey) {
    PEXELS_API_KEY = result.pexelsApiKey;
    setupEventListeners();
    init();
  } else {
    showApiKeySetup();
  }
});

function showApiKeySetup() {
  imageContainer.innerHTML = `
    <div class="setup-screen">
      <div class="setup-content">
        <i class="fas fa-key" style="font-size: 48px; color: #ff6b9d; margin-bottom: 20px;"></i>
        <h2>Welcome to Paws!</h2>
        <p>To get started, you need a free Pexels API key:</p>
        <ol style="text-align: left; max-width: 400px; margin: 20px auto;">
          <li>Visit <a href="https://www.pexels.com/api/" target="_blank" style="color: #ff6b9d;">Pexels API</a></li>
          <li>Sign up for free by clicking "Your API Key"</li>
          <li>Get your API key</li>
          <li>Enter it below:</li>
        </ol>
        <input type="text" id="apiKeyInput" placeholder="Paste your Pexels API Key here" style="width: 100%; max-width: 400px; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; margin: 10px 0;">
        <button id="saveKeyBtn" style="background: #ff6b9d; color: white; border: none; padding: 12px 30px; border-radius: 8px; font-size: 16px; cursor: pointer; margin-top: 10px;">
          <i class="fas fa-check"></i> Save & Start
        </button>
        <p style="font-size: 12px; color: #999; margin-top: 20px;">
          <i class="fas fa-lock"></i> Your key is stored locally and never shared
        </p>
      </div>
    </div>
  `;
  
  // Hide controls during setup
  saveBtn.style.display = 'none';
  nextBtn.style.display = 'none';
  
  document.getElementById('saveKeyBtn').addEventListener('click', saveApiKey);
  document.getElementById('apiKeyInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveApiKey();
  });
}

function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (key) {
    chrome.storage.local.set({ pexelsApiKey: key }, () => {
      PEXELS_API_KEY = key;
      saveBtn.style.display = '';
      nextBtn.style.display = '';
      setupEventListeners();
      init();
    });
  } else {
    alert('Please enter a valid API key');
  }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  menuBtn.addEventListener("click", toggleSidebar);
  closeBtn.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);
  saveBtn.addEventListener("click", saveCurrentImage);
  nextBtn.addEventListener("click", nextImage);
  backBtn.addEventListener("click", () => switchView("saved"));

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const view = item.dataset.view;
      switchView(view);
      closeSidebar();
    });
  });
}

// --- VIEW FUNCTIONS ---
function toggleSidebar() {
  sidebar.classList.toggle("open");
  overlay.classList.toggle("show");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
}

function switchView(view) {
  currentView = view;
  homeView.classList.add("hidden");
  savedView.classList.add("hidden");
  detailView.classList.add("hidden");
  aboutView.classList.add("hidden");

  if (view === "home") {
    homeView.classList.remove("hidden");
    menuBtn.classList.remove("hidden");
    backBtn.classList.add("hidden");
  } else if (view === "saved") {
    savedView.classList.remove("hidden");
    renderSavedGrid();
    menuBtn.classList.remove("hidden");
    backBtn.classList.add("hidden");
  } else if (view === "detail") {
    detailView.classList.remove("hidden");
    menuBtn.classList.add("hidden");
    backBtn.classList.remove("hidden");
  } else if (view === "about") {
    aboutView.classList.remove("hidden");
    menuBtn.classList.remove("hidden");
    backBtn.classList.add("hidden");
  }

  navItems.forEach(item => {
    item.classList.toggle("active", item.dataset.view === view);
  });
}

// --- IMAGE BUFFER SETUP ---
let imageBuffer = [];
let bufferIndex = 0;
const BUFFER_SIZE = 20;
const PREFETCH_THRESHOLD = 5;

// --- INITIALIZE ---
async function init() {
  await prefillBuffer();
  displayCurrentImage();
}

// --- DISPLAY IMAGE WITH HIDE AND FULLSCREEN BUTTONS ---
function displayCurrentImage() {
  if (imageBuffer.length === 0) {
    imageContainer.innerHTML = '<div class="loading">Loading images...</div>';
    return;
  }

  const image = imageBuffer[bufferIndex];
  const isSaved = saved.some(img => img.id === image.id);

  imageContainer.innerHTML = `
    <div class="image-wrapper">
      <img src="${image.url}" alt="${image.alt || 'Cute animal'}" class="main-image" id="mainImage">
      <button class="hide-btn" id="hideBtn" title="Hide forever">
        <i class="fas fa-eye-slash"></i>
      </button>
      <button class="fullscreen-btn" id="fullscreenBtn" title="Fullscreen">
        <i class="fas fa-expand"></i>
      </button>
    </div>
  `;

  const hideBtn = document.getElementById('hideBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const mainImage = document.getElementById('mainImage');
  
  if (hideBtn) hideBtn.addEventListener('click', hideCurrentImage);
  if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => openFullscreen(image));
  if (mainImage) mainImage.addEventListener('dblclick', () => openFullscreen(image));

  saveBtn.innerHTML = isSaved ? '<i class="fas fa-heart"></i> ' : '<i class="far fa-heart"></i>';
  saveBtn.classList.toggle("saved", isSaved);
  saveBtn.disabled = isSaved;

  preloadNextImage();
}

// --- PRELOAD NEXT IMAGE ---
function preloadNextImage() {
  if (imageBuffer.length > bufferIndex + 1) {
    const nextImg = new Image();
    nextImg.src = imageBuffer[bufferIndex + 1].url;
  }
}

// --- HIDE CURRENT IMAGE ---
function hideCurrentImage() {
  if (!imageBuffer.length) return;

  const image = imageBuffer[bufferIndex];

  if (!hidden.includes(image.id)) {
    hidden.push(image.id);
    chrome.storage.local.set({ hiddenAnimals: hidden });
  }

  imageBuffer.splice(bufferIndex, 1);
  if (bufferIndex >= imageBuffer.length) bufferIndex = 0;

  if (imageBuffer.length < 5) fetchMoreImages();
  else displayCurrentImage();
}

// --- NEXT IMAGE ---
async function nextImage() {
  bufferIndex = (bufferIndex + 1) % imageBuffer.length;
  if (bufferIndex >= imageBuffer.length - PREFETCH_THRESHOLD) await fetchMoreImages();
  displayCurrentImage();
}

// --- PREFILL BUFFER ---
async function prefillBuffer() {
  const newImages = await fetchImagesBatch(BUFFER_SIZE);
  imageBuffer = newImages;
  bufferIndex = 0;
}

// --- FETCH MORE IMAGES ---
async function fetchMoreImages() {
  const newImages = await fetchImagesBatch(10);
  const uniqueNewImages = newImages.filter(img => 
    !imageBuffer.some(existing => existing.id === img.id) &&
    !hidden.includes(img.id)
  );

  imageBuffer = imageBuffer.concat(uniqueNewImages);

  if (imageBuffer.length > 50) {
    imageBuffer = imageBuffer.slice(bufferIndex);
    bufferIndex = 0;
  }
}

// --- FETCH IMAGES FROM PEXELS ---
async function fetchImagesBatch(count = 10) {
  if (!PEXELS_API_KEY) {
    console.error('No API key available');
    return [];
  }

  try {
    const selectedQueries = getRandomQueries(4);
    const requests = selectedQueries.map(q => {
      const randomPage = Math.floor(Math.random() * 10) + 1;
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${Math.ceil(count / selectedQueries.length)}&page=${randomPage}`;
      return fetch(url, { headers: { Authorization: PEXELS_API_KEY } }).then(res => res.json());
    });

    const results = await Promise.all(requests);

    let interleaved = [];
    const maxLength = Math.max(...results.map(r => r.photos.length));
    for (let i = 0; i < maxLength; i++) {
      for (const r of results) {
        if (r.photos[i]) interleaved.push({
          id: r.photos[i].id,
          url: r.photos[i].src.medium,
          alt: r.photos[i].alt
        });
      }
    }

    // Deduplicate and remove hidden
    const uniqueImages = [];
    const seenIds = new Set();
    for (const img of interleaved) {
      if (!seenIds.has(img.id) && !hidden.includes(img.id)) {
        uniqueImages.push(img);
        seenIds.add(img.id);
      }
    }

    uniqueImages.sort(() => Math.random() - 0.5);
    return uniqueImages;

  } catch (err) {
    console.error("Failed to fetch images:", err);
    return [];
  }
}

// --- SAVE IMAGE ---
function saveCurrentImage() {
  if (!imageBuffer.length) return;

  const image = imageBuffer[bufferIndex];
  if (!saved.some(img => img.id === image.id)) {
    saved.push(image);
    chrome.storage.local.set({ savedAnimals: saved });
    displayCurrentImage();
  }
}

// --- SAVED GRID ---
function renderSavedGrid() {
  if (!saved.length) {
    savedGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fas fa-heart" style="font-size: 48px; color: #ff6b9d;"></i></div>
        <p>No saved animals yet!</p>
        <p style="font-size: 14px; color: #999;">Save some cute animals from home</p>
      </div>`;
    return;
  }

  savedGrid.innerHTML = saved.map(image => `
    <div class="saved-item" data-id="${image.id}">
      <img src="${image.url}" alt="${image.alt || 'Cute animal'}">
      <div class="saved-item-overlay">
        <button class="saved-fullscreen-btn" data-id="${image.id}" title="Fullscreen">
          <i class="fas fa-expand"></i>
        </button>
      </div>
      <button class="delete-btn" data-id="${image.id}">
        <i class="fas fa-times"></i>
      </button>
    </div>`).join("");

  document.querySelectorAll(".saved-item").forEach(item => {
    item.addEventListener("click", e => {
      if (!e.target.classList.contains("delete-btn") && !e.target.closest(".saved-fullscreen-btn")) {
        const id = item.dataset.id;
        selectedImage = saved.find(img => img.id == id);
        showDetail();
      }
    });
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      removeFromSaved(btn.dataset.id);
    });
  });
  
  document.querySelectorAll(".saved-fullscreen-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const image = saved.find(img => img.id == id);
      if (image) openFullscreen(image);
    });
  });
}

// --- IMAGE DETAIL ---
let currentSavedIndex = 0;

function showDetail() {
  if (!selectedImage) return;
  
  currentSavedIndex = saved.findIndex(img => img.id === selectedImage.id);
  
  document.getElementById("detailImage").innerHTML = `
    <div class="detail-image-wrapper">
      <img src="${selectedImage.url}" alt="${selectedImage.alt || 'Cute animal'}" id="detailImg">
      <button class="fullscreen-btn" id="detailFullscreenBtn" title="Fullscreen">
        <i class="fas fa-expand"></i>
      </button>
    </div>
  `;
  
  const detailImg = document.getElementById('detailImg');
  const detailFullscreenBtn = document.getElementById('detailFullscreenBtn');
  
  if (detailFullscreenBtn) detailFullscreenBtn.addEventListener('click', () => openFullscreen(selectedImage));
  if (detailImg) detailImg.addEventListener('dblclick', () => openFullscreen(selectedImage));
  
  document.getElementById("detailInfo").innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
      <button id="prevSavedBtn" class="nav-saved-btn" ${currentSavedIndex === 0 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
      </button>
      <span>Image ${currentSavedIndex + 1} of ${saved.length}</span>
      <button id="nextSavedBtn" class="nav-saved-btn" ${currentSavedIndex === saved.length - 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;
  
  document.getElementById("removeBtn").onclick = () => {
    removeFromSaved(selectedImage.id);
    switchView("saved");
  };
  
  const prevBtn = document.getElementById('prevSavedBtn');
  const nextBtn = document.getElementById('nextSavedBtn');
  
  if (prevBtn) prevBtn.addEventListener('click', showPreviousSaved);
  if (nextBtn) nextBtn.addEventListener('click', showNextSaved);
  
  switchView("detail");
}

function showNextSaved() {
  if (currentSavedIndex < saved.length - 1) {
    currentSavedIndex++;
    selectedImage = saved[currentSavedIndex];
    showDetail();
  }
}

function showPreviousSaved() {
  if (currentSavedIndex > 0) {
    currentSavedIndex--;
    selectedImage = saved[currentSavedIndex];
    showDetail();
  }
}

// --- REMOVE SAVED IMAGE ---
function removeFromSaved(id) {
  saved = saved.filter(img => img.id != id);
  chrome.storage.local.set({ savedAnimals: saved });
  renderSavedGrid();
  displayCurrentImage();
}

// --- FULLSCREEN VIEWER ---
let fullscreenState = {
  isZoomed: false,
  scale: 1,
  translateX: 0,
  translateY: 0,
  startX: 0,
  startY: 0,
  isDragging: false
};

function openFullscreen(image) {
  const fullscreenOverlay = document.createElement('div');
  fullscreenOverlay.id = 'fullscreenOverlay';
  fullscreenOverlay.innerHTML = `
    <div class="fullscreen-content">
      <img src="${image.url}" alt="${image.alt || 'Cute animal'}" id="fullscreenImage">
      <button class="fullscreen-close" id="fullscreenClose">
        <i class="fas fa-times"></i>
      </button>
      <div class="fullscreen-hint">
        <i class="fas fa-search-plus"></i> Double-click to zoom • 
        <i class="fas fa-arrows-alt"></i> Drag to pan
      </div>
    </div>
  `;
  
  document.body.appendChild(fullscreenOverlay);
  
  const fsImage = document.getElementById('fullscreenImage');
  const fsClose = document.getElementById('fullscreenClose');
  
  // Reset state
  fullscreenState = { isZoomed: false, scale: 1, translateX: 0, translateY: 0, startX: 0, startY: 0, isDragging: false };
  
  // Close handlers
  fsClose.addEventListener('click', closeFullscreen);
  fullscreenOverlay.addEventListener('click', (e) => {
    if (e.target === fullscreenOverlay) closeFullscreen();
  });
  
  // Double-click zoom
  fsImage.addEventListener('dblclick', (e) => {
    if (!fullscreenState.isZoomed) {
      fullscreenState.isZoomed = true;
      fullscreenState.scale = 2;
      
      const rect = fsImage.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      fullscreenState.translateX = (rect.width / 2 - x) * fullscreenState.scale;
      fullscreenState.translateY = (rect.height / 2 - y) * fullscreenState.scale;
    } else {
      fullscreenState.isZoomed = false;
      fullscreenState.scale = 1;
      fullscreenState.translateX = 0;
      fullscreenState.translateY = 0;
    }
    updateTransform(fsImage);
  });
  
  // Pan handlers
  fsImage.addEventListener('mousedown', (e) => {
    if (!fullscreenState.isZoomed) return;
    fullscreenState.isDragging = true;
    fullscreenState.startX = e.clientX - fullscreenState.translateX;
    fullscreenState.startY = e.clientY - fullscreenState.translateY;
    fsImage.style.cursor = 'grabbing';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!fullscreenState.isDragging) return;
    fullscreenState.translateX = e.clientX - fullscreenState.startX;
    fullscreenState.translateY = e.clientY - fullscreenState.startY;
    updateTransform(fsImage);
  });
  
  document.addEventListener('mouseup', () => {
    if (fullscreenState.isDragging) {
      fullscreenState.isDragging = false;
      fsImage.style.cursor = fullscreenState.isZoomed ? 'grab' : 'zoom-in';
    }
  });
  
  // Keyboard ESC to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeFullscreen();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

function updateTransform(img) {
  img.style.transform = `scale(${fullscreenState.scale}) translate(${fullscreenState.translateX / fullscreenState.scale}px, ${fullscreenState.translateY / fullscreenState.scale}px)`;
  img.style.cursor = fullscreenState.isZoomed ? 'grab' : 'zoom-in';
}

function closeFullscreen() {
  const overlay = document.getElementById('fullscreenOverlay');
  if (overlay) overlay.remove();
}

});