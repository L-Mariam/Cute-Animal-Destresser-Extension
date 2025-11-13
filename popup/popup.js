    // State
    let images = [];
    let saved = JSON.parse(chrome.storage.getItem('savedAnimals') || '[]');
    let currentIndex = 0;
    let currentView = 'home';
    let selectedImage = null;

    // DOM Elements
    const menuBtn = document.getElementById('menuBtn');
    const backBtn = document.getElementById('backBtn');
    const closeBtn = document.getElementById('closeBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const imageContainer = document.getElementById('imageContainer');
    const saveBtn = document.getElementById('saveBtn');
    const nextBtn = document.getElementById('nextBtn');
    const navItems = document.querySelectorAll('.nav-item');

    const homeView = document.getElementById('homeView');
    const savedView = document.getElementById('savedView');
    const detailView = document.getElementById('detailView');
    const aboutView = document.getElementById('aboutView');
    const savedGrid = document.getElementById('savedGrid');

    // API Configuration
    const API_ENDPOINT = 'https://backend-proxy.com/api/animals';

    // Initialize
    fetchImages();

    // Event Listeners
    menuBtn.addEventListener('click', toggleSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
    saveBtn.addEventListener('click', saveCurrentImage);
    nextBtn.addEventListener('click', nextImage);
    backBtn.addEventListener('click', () => switchView('saved'));

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        switchView(view);
        closeSidebar();
      });
    });

    // Functions
    function toggleSidebar() {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('show');
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    }

    function switchView(view) {
      currentView = view;

      // Hide all views
      homeView.classList.add('hidden');
      savedView.classList.add('hidden');
      detailView.classList.add('hidden');
      aboutView.classList.add('hidden');

      // Show current view
      if (view === 'home') {
        homeView.classList.remove('hidden');
        menuBtn.classList.remove('hidden');
        backBtn.classList.add('hidden');
      } else if (view === 'saved') {
        savedView.classList.remove('hidden');
        renderSavedGrid();
        menuBtn.classList.remove('hidden');
        backBtn.classList.add('hidden');
      } else if (view === 'detail') {
        detailView.classList.remove('hidden');
        menuBtn.classList.add('hidden');
        backBtn.classList.remove('hidden');
      } else if (view === 'about') {
        aboutView.classList.remove('hidden');
        menuBtn.classList.remove('hidden');
        backBtn.classList.add('hidden');
      }

      // Update nav active state
      navItems.forEach(item => {
        if (item.dataset.view === view) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }

    async function fetchImages() {
      try {
        const randomPage = Math.floor(Math.random() * 100) + 1;
        const res = await fetch(
          `https://api.pexels.com/v1/search?query=cute+animals&per_page=15&page=${randomPage}`,
          {
            headers: {
              Authorization: API_KEY,
            },
          }
        );

        if (!res.ok) throw new Error('Failed to fetch');

        const data = await res.json();
        images = data.photos;
        currentIndex = 0;
        displayCurrentImage();
      } catch (err) {
        imageContainer.innerHTML = '<div class="loading">Failed to load. Check API key.</div>';
        console.error(err);
      }
    }

    function displayCurrentImage() {
      if (images.length === 0) return;

      const image = images[currentIndex];
      const isSaved = saved.some(img => img.id === image.id);

      imageContainer.innerHTML = `<img src="${image.src.large}" alt="${image.alt || 'Cute animal'}">`;
      
      if (isSaved) {
        saveBtn.classList.add('saved');
        saveBtn.disabled = true;
      } else {
        saveBtn.classList.remove('saved');
        saveBtn.disabled = false;
      }
    }

    function saveCurrentImage() {
      const image = images[currentIndex];
      if (!saved.some(img => img.id === image.id)) {
        saved.push(image);
        chrome.storage.setItem('savedAnimals', JSON.stringify(saved));
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
          </div>
        `;
        return;
      }

      savedGrid.innerHTML = saved.map(image => `
        <div class="saved-item" data-id="${image.id}">
          <img src="${image.src.medium}" alt="${image.alt || 'Cute animal'}">
          <button class="delete-btn" data-id="${image.id}">✕</button>
        </div>
      `).join('');

      // Add event listeners
      document.querySelectorAll('.saved-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (!e.target.classList.contains('delete-btn')) {
            const id = parseInt(item.dataset.id);
            selectedImage = saved.find(img => img.id === id);
            showDetail();
          }
        });
      });

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.id);
          removeFromSaved(id);
        });
      });
    }

    function showDetail() {
      if (!selectedImage) return;
      
      document.getElementById('detailImage').innerHTML = 
        `<img src="${selectedImage.src.large}" alt="${selectedImage.alt || 'Cute animal'}">`;
      document.getElementById('detailInfo').textContent = 
        `Photo by ${selectedImage.photographer}`;
      
      document.getElementById('removeBtn').onclick = () => {
        removeFromSaved(selectedImage.id);
        switchView('saved');
      };

      switchView('detail');
    }

    function removeFromSaved(id) {
      saved = saved.filter(img => img.id !== id);
      chrome.storage.setItem('savedAnimals', JSON.stringify(saved));
      renderSavedGrid();
      displayCurrentImage();
    }
