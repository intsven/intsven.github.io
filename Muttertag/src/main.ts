import './style.css'
import { SceneManager } from './SceneManager'
import { EvolutionManager } from './EvolutionManager'
import { GalleryManager } from './GalleryManager'
import { HistoryManager } from './HistoryManager'
import type { FlowerParams } from './FlowerGenerator'

const canvasContainer = document.getElementById('canvas-container')!;
const mainPlaceholder = document.getElementById('main-canvas-container')!;
const evolutionGrid = document.getElementById('evolution-grid')!;
const favoritesGrid = document.getElementById('favorites-grid')!;
const historyGrid = document.getElementById('history-grid')!;
const favEmptyMsg = document.getElementById('fav-empty-msg')!;
const historyEmptyMsg = document.getElementById('history-empty-msg')!;
const btnReset = document.getElementById('btn-reset-evolution')!;
const btnFavMain = document.getElementById('btn-fav-main')!;
const btnNextGen = document.getElementById('btn-next-gen') as HTMLButtonElement;
const inputGridCount = document.getElementById('input-grid-count') as HTMLInputElement;
const btnHelp = document.getElementById('btn-help')!;
const helpModal = document.getElementById('help-modal')!;
const btnCloseModal = document.getElementById('btn-close-modal')!;

const sceneManager = new SceneManager(canvasContainer, mainPlaceholder);

// Modal Logic
function showModal() { helpModal.style.display = 'flex'; }
function hideModal() { helpModal.style.display = 'none'; }

btnHelp.onclick = showModal;
btnCloseModal.onclick = hideModal;

// Show on first visit
if (!localStorage.getItem('muttertag_visited')) {
    showModal();
    localStorage.setItem('muttertag_visited', 'true');
}

let favorites: FlowerParams[] = loadFavorites();
let history: FlowerParams[] = loadHistory();

const galleryManager = new GalleryManager(
    sceneManager.getRenderer(),
    (params) => { currentParams = JSON.parse(JSON.stringify(params)); update(); },
    (idx) => { favorites.splice(idx, 1); saveFavorites(); updateGallery(); }
);

const historyManager = new HistoryManager(
    sceneManager.getRenderer(),
    (params) => { currentParams = JSON.parse(JSON.stringify(params)); update(true, false); }
);

const evolutionManager = new EvolutionManager(
    sceneManager.getRenderer(),
    (favParams) => { addFavorite(favParams); },
    (selectedCount) => {
        btnNextGen.disabled = selectedCount === 0;
        btnNextGen.textContent = selectedCount > 1 ? `Nächste Generation (${selectedCount} Eltern)` : `Nächste Generation`;
    }
);

let globalRotationY = 0, globalRotationX = 0, isDragging = false, previousX = 0, previousY = 0;

const inputs: any = {
  centerColor: document.getElementById('centerColor'),
  visualStyle: document.getElementById('visualStyle'),
  stemLength: document.getElementById('stemLength'),
};

function createRandomFlower(): FlowerParams {
    const numLayers = 3 + Math.floor(Math.random() * 5);
    const styles: any[] = ['smooth', 'low-poly', 'wireframe'];
    const randomHex = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    
    return {
        centerColor: randomHex(),
        visualStyle: styles[Math.floor(Math.random() * styles.length)],
        stemLength: 1 + Math.random() * 3,
        petalSteps: numLayers,
        layers: Array.from({length: numLayers}, (_, i) => ({
            petalCount: 5 + Math.floor(Math.random() * 25),
            petalLength: 1 + Math.random() * 2,
            petalWidth: 0.2 + Math.random() * 0.8,
            cupStrength: Math.random() * 2,
            petalColor: randomHex(),
            petalColor2: randomHex(),
            opacity: 0.5 + Math.random() * 0.5,
            elevation: i * 0.15,
            midWidthPos: 0.2 + Math.random() * 0.6,
            midWidthScale: 0.5 + Math.random() * 1.5,
            tipPointiness: Math.random(),
            bendStrength: (Math.random() - 0.5) * 4,
            bendMidPos: 0.2 + Math.random() * 0.6,
            bendEndAngle: (Math.random() - 0.5) * 3
        }))
    };
}

let currentParams: FlowerParams = createRandomFlower();

function saveCurrentBase(params: FlowerParams) { localStorage.setItem('muttertag_flower_base_v7', JSON.stringify(params)); }
function loadCurrentBase(): FlowerParams | null { const data = localStorage.getItem('muttertag_flower_base_v7'); return data ? JSON.parse(data) : null; }
function saveFavorites() { localStorage.setItem('muttertag_favorites_v7', JSON.stringify(favorites)); }
function loadFavorites(): FlowerParams[] { const data = localStorage.getItem('muttertag_favorites_v7'); return data ? JSON.parse(data) : []; }
function saveHistory() { localStorage.setItem('muttertag_history_v7', JSON.stringify(history)); }
function loadHistory(): FlowerParams[] { const data = localStorage.getItem('muttertag_history_v7'); return data ? JSON.parse(data) : []; }

function addFavorite(params: FlowerParams) {
    favorites.unshift(JSON.parse(JSON.stringify(params)));
    if (favorites.length > 30) favorites.pop();
    saveFavorites(); updateGallery();
}

function addHistory(params: FlowerParams) {
    history.unshift(JSON.parse(JSON.stringify(params)));
    if (history.length > 30) history.pop();
    saveHistory(); updateHistoryUI();
}

function updateGallery() {
    galleryManager.updateGrid(favorites, favoritesGrid);
    favEmptyMsg.style.display = favorites.length === 0 ? 'block' : 'none';
}

function updateHistoryUI() {
    historyManager.updateGrid(history, historyGrid);
    historyEmptyMsg.style.display = history.length === 0 ? 'block' : 'none';
}

function updateUI() {
    inputs.centerColor.value = currentParams.centerColor;
    inputs.visualStyle.value = currentParams.visualStyle;
    inputs.stemLength.value = currentParams.stemLength.toString();
    Object.keys(inputs).forEach(key => {
        const valSpan = document.getElementById(`val-${key}`);
        if (valSpan) valSpan.textContent = inputs[key].value;
    });
}

function update(save = true, addToHistory = false) {
  currentParams.centerColor = inputs.centerColor.value;
  currentParams.visualStyle = inputs.visualStyle.value;
  currentParams.stemLength = parseFloat(inputs.stemLength.value);
  updateUI();
  if (save) saveCurrentBase(currentParams);
  if (addToHistory) addHistory(currentParams);
  sceneManager.updateFlower(currentParams);
  evolutionManager.updateGrid(currentParams, evolutionGrid, parseInt(inputGridCount.value) || 9);
  btnNextGen.disabled = true;
}

inputGridCount.addEventListener('change', () => update(false, false));

btnNextGen.onclick = () => {
    const selected = evolutionManager.getSelectedParams();
    if (selected.length > 0) {
        selected.forEach(parent => addHistory(JSON.parse(JSON.stringify(parent))));
        currentParams = JSON.parse(JSON.stringify(selected[0]));
        updateUI();
        saveCurrentBase(currentParams);
        sceneManager.updateFlower(currentParams);
        evolutionManager.breed(selected, evolutionGrid, parseInt(inputGridCount.value) || 9);
        btnNextGen.disabled = true;
    }
};

function onPointerDown(e: MouseEvent | TouchEvent) {
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const target = e.target as HTMLElement;
    if (target.closest('#main-canvas-container') || target.closest('.evolution-item') || target.closest('.fav-item') || target.closest('.history-item')) {
        isDragging = true; previousX = x; previousY = y;
    }
}
function onPointerMove(e: MouseEvent | TouchEvent) {
    if (!isDragging) return;
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dX = x - previousX, dY = y - previousY;
    globalRotationY += dX * 0.01; globalRotationX += dY * 0.01;
    globalRotationX = Math.max(-Math.PI * 0.4, Math.min(Math.PI * 0.4, globalRotationX));
    previousX = x; previousY = y;
}
function onPointerUp() { isDragging = false; }

window.addEventListener('mousedown', onPointerDown);
window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);
window.addEventListener('touchstart', onPointerDown, { passive: false });
window.addEventListener('touchmove', onPointerMove, { passive: false });
window.addEventListener('touchend', onPointerUp);

Object.values(inputs).forEach((input: any) => { if (input) input.addEventListener('input', () => update()); });

btnFavMain.onclick = () => addFavorite(currentParams);

btnReset.onclick = () => { 
    currentParams = createRandomFlower();
    saveCurrentBase(currentParams);
    update(true, false);
};

const savedBase = loadCurrentBase();
if (savedBase) currentParams = savedBase;
update(false, false);
updateGallery();
updateHistoryUI();

let lastTime = 0;
function animate(time: number) {
  const deltaTime = (time - lastTime) / 1000; lastTime = time;
  requestAnimationFrame(animate);
  if (!isDragging) globalRotationY += deltaTime * 0.3;
  const renderer = sceneManager.getRenderer();
  renderer.setScissorTest(false); renderer.clear();
  sceneManager.setRotation(globalRotationX, globalRotationY);
  sceneManager.render();
  evolutionManager.update(globalRotationX, globalRotationY);
  evolutionManager.render();
  galleryManager.update(globalRotationX, globalRotationY);
  galleryManager.render();
  historyManager.update(globalRotationX, globalRotationY);
  historyManager.render();
}
requestAnimationFrame(animate);
