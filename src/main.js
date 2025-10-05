// main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewportGizmo } from 'three-viewport-gizmo';
import { SceneManager } from './sceneManager.js';
import { ObjectManager } from './objectManager.js';
import { SelectionManager } from './selectionManager.js';
import { UIManager } from './uiManager.js';
import './style.css';

let scene, camera, renderer, controls, viewportGizmo;
let sceneManager, objectManager, selectionManager, uiManager;

async function init(){
    console.log('Initializing application...');
    
    // Инициализация базовых компонентов Three.js
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 10, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("container").appendChild(renderer.domElement);

    // Инициализация менеджеров
    sceneManager = new SceneManager(scene, camera, renderer);
    objectManager = new ObjectManager(scene);
    selectionManager = new SelectionManager();
    uiManager = new UIManager();

    // Настройка сцены
    sceneManager.setupScene();

    // Управление камерой
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Viewport Gizmo
    viewportGizmo = new ViewportGizmo(camera, renderer, {
        type: "rounded-cube",
        edges: {color: 0xffffff,opacity: 1,},
        background:{color: 0x353535,opacity: 1,hover:{color:0x353535},},
        size: 120,
        padding: 10
    });
    viewportGizmo.attachControls(controls);

    // Настройка UI
    console.log('Setting up UI...');
    uiManager.setupToolbar(objectManager, selectionManager, sceneManager);

    // Обработчик кликов для выбора объектов
    setupEventListeners();

    // Инициализация отслеживания мыши для виртуального курсора
    document.addEventListener('mousemove', (e) => {
        document.documentElement.style.setProperty('--mouse-x', e.clientX + 'px');
        document.documentElement.style.setProperty('--mouse-y', e.clientY + 'px');
    });

    window.addEventListener('resize', onWindowResize);
    
    // Глобальные переменные для консоли
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.THREE = THREE;
    window.objectManager = objectManager;
    window.selectionManager = selectionManager;
    window.sceneManager = sceneManager;

    console.log('Application initialized successfully');
    animate();
}

function setupEventListeners() {
    renderer.domElement.addEventListener('click', (event) => {
        const selectedObjects = selectionManager.handleCanvasClick(
            event, 
            scene, 
            camera, 
            renderer,
            objectManager
        );
        
        if (selectedObjects && selectedObjects.length > 0) {
            uiManager.showPropertiesPanel(selectedObjects);
        } else {
            uiManager.hidePropertiesPanel();
            uiManager.hideCADPropertiesPanel();
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    viewportGizmo.render();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    viewportGizmo.update();
}

// Запуск при загрузке страницы
window.addEventListener('DOMContentLoaded', init);
