// objectManager.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ModularObject } from './modularObject.js';

export class ObjectManager {
    constructor(scene) {
        this.scene = scene;
        this.loader = new GLTFLoader();
        this.modularObjects = new Map();
        this.loadedModules = new Map();
        this.moduleCache = new Map(); // Кэш для повторного использования моделей
    }

    // Создаем параметрический объект
    addParametricObject(objectType = 'cube', position = { x: 0, y: 0, z: 0 }) {
        const modularObject = new ModularObject(this.scene, this);
        const baseSegment = modularObject.createBaseModule(position, objectType);
        
        this.modularObjects.set(modularObject.id, modularObject);
        
        console.log(`Added parametric ${objectType}:`, modularObject.id);
        return baseSegment;
    }

    // Обновляем размеры объекта
    updateObjectDimensions(objectId, newDimensions) {
        const modularObject = this.modularObjects.get(objectId);
        if (modularObject) {
            modularObject.updateDimensions(newDimensions);
            console.log(`Updated dimensions for ${objectId}:`, newDimensions);
            return true;
        }
        return false;
    }

    // Получаем физические свойства объекта
    getObjectProperties(objectId) {
        const modularObject = this.modularObjects.get(objectId);
        if (modularObject) {
            return modularObject.getPhysicalProperties();
        }
        return null;
    }

    // Обновляем материал объекта
    updateObjectMaterial(objectId, materialType) {
        const modularObject = this.modularObjects.get(objectId);
        if (modularObject) {
            modularObject.setMaterial(materialType);
            return true;
        }
        return false;
    }

    // Получаем объект по сегменту
    getModularObjectBySegment(segment) {
        if (segment.userData && segment.userData.modularId) {
            return this.modularObjects.get(segment.userData.modularId);
        }
        return null;
    }

    // Удаляем объект
    removeModularObject(objectId) {
        const modularObject = this.modularObjects.get(objectId);
        if (modularObject) {
            modularObject.clearSegments();
            this.modularObjects.delete(objectId);
            console.log('Removed modular object:', objectId);
            return true;
        }
        return false;
    }

    // === МЕТОДЫ ДЛЯ ЗАГРУЗКИ МОДУЛЕЙ КОСМИЧЕСКОЙ СТАНЦИИ ===

    // Загружаем A1 Preset
    loadA1Preset(position = { x: 0, y: 0, z: 0 }) {
        return this.loadModule('A1Preset', '/models/A1Preset.glb', position, 7);
    }

    // Загружаем A2 Preset
    loadA2Preset(position = { x: 0, y: 0, z: 0 }) {
        return this.loadModule('A2Preset', '/models/A2Preset.glb', position, 7);
    }

    // Загружаем A3 Preset
    loadA3Preset(position = { x: 0, y: 0, z: 0 }) {
        return this.loadModule('A3Preset', '/models/A3Preset.glb', position, 7);
    }

    // Загружаем A1 Light Block
    loadA1LightBlock(position = { x: 0, y: 0, z: 0 }) {
        return this.loadModule('A1LightBlock', '/models/SS_A1Light_Block.glb', position, 4);
    }

    // Загружаем A2 Long Block
    loadA2LongBlock(position = { x: 0, y: 0, z: 0 }) {
        return this.loadModule('A2LongBlock', '/models/SS_A2Long_Block.glb', position, 13);
    }

    // Загружаем A4 Medium Block
    loadA4MediumBlock(position = { x: 0, y: 0, z: 0 }) {
        return this.loadModule('A4MediumBlock', '/models/SS_A4Medium_Block.glb', position, 14);
    }

    // Загружаем Big Universal Modular v1
    loadBigUniversalV1(position = { x: 0, y: 0, z: 0 }) {
        return this.loadModule('BigUniversalV1', '/models/SS_BigUniversalModular_v1.glb', position, 22);
    }

    // Загружаем BUM Roof
    loadBUMRoof(position = { x: 0, y: 0, z: 0 }) {
        return this.loadModule('BUMRoof', '/models/SS_BUM_Roof.glb', position, 19.5);
    }

    // Загружаем Sun Panels
    loadSunPanels(position = { x: 0, y: 0, z: 0 }) {
        return this.loadModule('SunPanels', '/models/SS_SunPanels.glb', position, 15);
    }


    // Универсальный метод загрузки модуля
    loadModule(moduleName, path, position, targetSize = 5) {
        // Проверяем кэш
        if (this.moduleCache.has(moduleName)) {
            const cachedModel = this.moduleCache.get(moduleName).clone();
            cachedModel.position.set(position.x, position.y, position.z);
            cachedModel.visible = true;
            this.scene.add(cachedModel);
            
            // Обновляем userData для нового экземпляра
            cachedModel.userData.instanceId = `instance_${Date.now()}`;
            
            console.log(`Loaded ${moduleName} from cache`);
            return Promise.resolve(cachedModel);
        }

        return new Promise((resolve, reject) => {
            this.loader.load(
                path,
                (gltf) => {
                    const model = gltf.scene;
                    model.position.set(position.x, position.y, position.z);
                    
                    // Автоматическое масштабирование
                    const box = new THREE.Box3().setFromObject(model);
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const scale = targetSize / maxDim;
                    
                    model.scale.setScalar(scale);
                    
                    // Добавляем пользовательские данные
                    model.userData.isModularObject = false;
                    model.userData.objectType = 'spaceStationModule';
                    model.userData.moduleName = moduleName;
                    model.userData.originalScale = scale;
                    model.userData.instanceId = `instance_${Date.now()}`;
                    model.userData.physicalProperties = this.calculateModuleProperties(model, moduleName);
                    
                    // Добавляем в сцену
                    this.scene.add(model);
                    
                    // Сохраняем в кэш (оригинал без позиции)
                    const modelForCache = model.clone();
                    modelForCache.position.set(0, 0, 0);
                    this.moduleCache.set(moduleName, modelForCache);
                    
                    console.log(`Module ${moduleName} loaded:`, model);
                    
                    resolve(model);
                },
                (progress) => {
                    console.log(`Loading ${moduleName}: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
                },
                (error) => {
                    console.error(`Error loading ${moduleName}:`, error);
                    reject(error);
                }
            );
        });
    }

    // Рассчитываем физические свойства модуля
    calculateModuleProperties(model, moduleName) {
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        
        // Базовые расчеты объема и площади
        const volume = size.x * size.y * size.z;
        const surfaceArea = 2 * (size.x * size.y + size.x * size.z + size.y * size.z);
        
        // Плотности материалов для разных типов модулей
        const densities = {
            'A1LightBlock': 800,
            'A2LongBlock': 1200,
            'A4MediumBlock': 1000,
            'BigUniversalV1': 1500,
            'BUMRoof': 600,
            'SunPanels': 300,
            'MotherModule': 2000,
            'default': 1000
        };
        
        const density = densities[moduleName] || densities.default;
        const mass = volume * density;
        
        return {
            volume: volume,
            surfaceArea: surfaceArea,
            mass: mass,
            boundingBox: {
                x: size.x,
                y: size.y,
                z: size.z
            },
            centerOfMass: box.getCenter(new THREE.Vector3()),
            material: moduleName.toLowerCase().includes('light') ? 'aluminum' : 
                     moduleName.toLowerCase().includes('sun') ? 'composite' : 'steel'
        };
    }

    // Универсальный метод загрузки модуля космической станции
    loadSpaceStationModule(moduleType, position = { x: 0, y: 0, z: 0 }) {
        const moduleLoaders = {
            'a1preset': () => this.loadA1Preset(position),
            'a2preset': () => this.loadA2Preset(position),
            'a3preset': () => this.loadA3Preset(position),
            'a1light': () => this.loadA1LightBlock(position),
            'a2long': () => this.loadA2LongBlock(position),
            'a4medium': () => this.loadA4MediumBlock(position),
            'biguniversal_v1': () => this.loadBigUniversalV1(position),
            'bumroof': () => this.loadBUMRoof(position),
            'sunpanels': () => this.loadSunPanels(position),
            'mothermodule': () => this.loadMotherModule(position)
        };

        const loader = moduleLoaders[moduleType.toLowerCase()];
        if (loader) {
            return loader();
        } else {
            console.warn(`Unknown module type: ${moduleType}`);
            return Promise.reject(new Error(`Unknown module type: ${moduleType}`));
        }
    }

    // Получаем список всех доступных модулей
    getAvailableModules() {
        return [
            { id: 'a1preset', name: 'A1 Preset', type: 'basic', category: 'presets' },
            { id: 'a2preset', name: 'A2 Preset', type: 'basic', category: 'presets' },
            { id: 'a3preset', name: 'A3 Preset', type: 'basic', category: 'presets' },
            { id: 'a1light', name: 'A1 Light Block', type: 'structural', category: 'blocks' },
            { id: 'a2long', name: 'A2 Long Block', type: 'structural', category: 'blocks' },
            { id: 'a4medium', name: 'A4 Medium Block', type: 'structural', category: 'blocks' },
            { id: 'biguniversal_v1', name: 'Big Universal V1', type: 'habitat', category: 'modules' },
            { id: 'bumroof', name: 'BUM Roof', type: 'structural', category: 'modules' },
            { id: 'sunpanels', name: 'Solar Panels', type: 'utility', category: 'energy' },
            { id: 'mothermodule', name: 'Mother Module', type: 'core', category: 'modules' }
        ];
    }

    // Старые методы для обратной совместимости
    addCube(position = { x: 0, y: 1, z: 0 }) {
        return this.addParametricObject('cube', position);
    }

    addSphere(position = { x: 0, y: 1, z: 0 }) {
        return this.addParametricObject('sphere', position);
    }

    addCylinder(position = { x: 0, y: 1, z: 0 }) {
        return this.addParametricObject('cylinder', position);
    }

    removeObject(object) {
        if (!object) return false;

        if (object.userData && object.userData.modularId) {
            return this.removeModularObject(object.userData.modularId);
        }

        if (object && this.scene.getObjectById(object.id)) {
            this.scene.remove(object);
            console.log('Removed object:', object);
            return true;
        }
        
        return false;
    }

    getObjects() {
        const objects = [];
        this.scene.traverse((child) => {
            if (child instanceof THREE.Mesh && 
                !(child instanceof THREE.GridHelper) && 
                !(child instanceof THREE.AxesHelper)) {
                objects.push(child);
            }
        });
        return objects;
    }

    // Получаем физические свойства GLTF модели
    getGLTFPhysicalProperties(object) {
        if (!object) {
            return {
                volume: 0,
                surfaceArea: 0,
                mass: 0,
                boundingBox: { x: 0, y: 0, z: 0 }
            };
        }

        // Если у объекта уже есть рассчитанные свойства, используем их
        if (object.userData && object.userData.physicalProperties) {
            return object.userData.physicalProperties;
        }

        // Иначе рассчитываем базовые свойства
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        
        const volume = size.x * size.y * size.z;
        const surfaceArea = 2 * (size.x * size.y + size.x * size.z + size.y * size.z);
        const density = 1000;
        const mass = volume * density;

        return {
            volume,
            surfaceArea,
            mass,
            boundingBox: {
                x: size.x,
                y: size.y,
                z: size.z
            },
            centerOfMass: box.getCenter(new THREE.Vector3())
        };
    }
}
