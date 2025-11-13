// State
let images = [];
let saved = [];
let currentIndex = 0;
let currentView = "home";
let selectedImage = null;

// DOM Elements
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

// API endpoint (your backend)
const API_ENDPOINT =
  "https://cute-animal-destresser-extension.vercel.app/api/animals";

// Load saved images from Chrome storage
chrome.storage.local.get("savedAnimals", (data) => {
  saved = data.savedAnimals || [];
});

// Initialize
fetchImages();

// Event Listeners
menuBtn.addEventListener("click", toggleSidebar);
closeBtn.addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);
saveBtn.addEventListener("click", saveCurrentImage);
nextBtn.addEventListener("click", nextImage);
backBtn.addEventListener("click", () => switchView("saved"));

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const view = item.dataset.view;
    switchView(view);
    closeSidebar();
  });
});

// --- FUNCTIONS ---

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

  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });
}

async function fetchImages() {
  try {
    const res = await fetch(API_ENDPOINT);
    if (!res.ok) throw new Error("Failed to fetch backend API");

    images = await res.json();
    currentIndex = 0;
    displayCurrentImage();
  } catch (err) {
    imageContainer.innerHTML =
      '<div class="loading">Failed to load server API.</div>';
    console.error(err);
  }
}

function displayCurrentImage() {
  if (images.length === 0) return;

  const image = images[currentIndex];
  const isSaved = saved.some((img) => img.id === image.id);

  imageContainer.innerHTML = `<img src="${image.url}" alt="Cute animal">`;

  if (isSaved) {
    saveBtn.classList.add("saved");
    saveBtn.disabled = true;
  } else {
    saveBtn.classList.remove("saved");
    saveBtn.disabled = false;
  }
}

function saveCurrentImage() {
  const image = images[currentIndex];

  if (!saved.some((img) => img.id === image.id)) {
    saved.push(image);
    chrome.storage.local.set({ savedAnimals: saved });
    displayCurrentImage();
  }
}

function nextImage() {
  currentIndex = (currentIndex + 1) % images.length;
  displayCurrentImage();
}

function renderSavedGrid() {
  if (saved.length === 0) {
    savedGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❤️</div>
        <p>No saved animals yet!</p>
        <p style="font-size: 14px; color: #999;">Save some cute animals from home</p>
      </div>`;
    return;
  }

  savedGrid.innerHTML = saved
    .map(
      (image) => `
      <div class="saved-item" data-id="${image.id}">
        <img src="${image.url}" alt="Cute animal">
        <button class="delete-btn" data-id="${image.id}">✕</button>
      </div>`
    )
    .join("");

  document.querySelectorAll(".saved-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (!e.target.classList.contains("delete-btn")) {
        const id = item.dataset.id;
        selectedImage = saved.find((img) => img.id == id);
        showDetail();
      }
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      removeFromSaved(id);
    });
  });
}

function showDetail() {
  if (!selectedImage) return;

  document.getElementById("detailImage").innerHTML = `
    <img src="${selectedImage.url}" alt="Cute animal">
  `;

  document.getElementById("detailInfo").textContent = `Saved Image`;

  document.getElementById("removeBtn").onclick = () => {
    removeFromSaved(selectedImage.id);
    switchView("saved");
  };

  switchView("detail");
}

function removeFromSaved(id) {
  saved = saved.filter((img) => img.id != id);
  chrome.storage.local.set({ savedAnimals: saved });
  renderSavedGrid();
  displayCurrentImage();
}
