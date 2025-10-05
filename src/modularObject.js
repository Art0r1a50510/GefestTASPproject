// modularObject.js
import * as THREE from 'three';

export class ModularObject {
    constructor(scene, objectManager) {
        this.scene = scene;
        this.objectManager = objectManager;
        this.mesh = null;
        this.dimensions = { x: 1, y: 1, z: 1 };
        this.basePosition = new THREE.Vector3();
        this.id = `modular_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.objectType = 'cube';
        this.materialType = 'aluminum';
        this.unitSize = 2.0; // Размер единичного модуля в метрах
        
        // Плотности материалов (кг/м³)
        this.materialDensities = {
            'aluminum': 2700,
            'steel': 7850,
            'titanium': 4500,
            'composite': 1600,
            'plastic': 950
        };
    }

    // Создаем базовый модуль
    createBaseModule(position = { x: 0, y: 0, z: 0 }, objectType = 'cube') {
        this.basePosition.set(position.x, position.y, position.z);
        this.objectType = objectType;
        
        this.rebuildObject();
        return this.mesh;
    }

    // Перестраиваем объект согласно текущим размерам
    rebuildObject() {
        // Удаляем старый меш
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        
        // Создаем новый меш с правильными размерами
        this.mesh = this.createMesh();
        this.scene.add(this.mesh);
    }

    // Создаем меш с правильными размерами
    createMesh() {
        let geometry;
        const sizeX = this.dimensions.x * this.unitSize;
        const sizeY = this.dimensions.y * this.unitSize;
        const sizeZ = this.dimensions.z * this.unitSize;
        
        switch(this.objectType) {
            case 'cube':
                geometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
                break;
            case 'sphere':
                const radius = Math.max(sizeX, sizeY, sizeZ) / 2;
                geometry = new THREE.SphereGeometry(radius, 32, 32);
                break;
            case 'cylinder':
                const radiusCyl = Math.max(sizeX, sizeZ) / 2;
                const height = sizeY;
                geometry = new THREE.CylinderGeometry(radiusCyl, radiusCyl, height, 32);
                break;
            default:
                geometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
        }
        
        const material = new THREE.MeshStandardMaterial({ 
            color: this.getObjectColor(),
            metalness: 0.7,
            roughness: 0.3
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Позиционируем меш
        if (this.objectType === 'cube') {
            mesh.position.set(
                this.basePosition.x + sizeX / 2,
                this.basePosition.y + sizeY / 2,
                this.basePosition.z + sizeZ / 2
            );
        } else if (this.objectType === 'sphere') {
            mesh.position.set(
                this.basePosition.x,
                this.basePosition.y + sizeY / 2,
                this.basePosition.z
            );
        } else if (this.objectType === 'cylinder') {
            mesh.position.set(
                this.basePosition.x,
                this.basePosition.y + sizeY / 2,
                this.basePosition.z
            );
        }
        
        // Добавляем пользовательские данные
        mesh.userData.isModularObject = true;
        mesh.userData.objectType = this.objectType;
        mesh.userData.modularId = this.id;
        mesh.userData.dimensions = { ...this.dimensions };
        mesh.userData.unitSize = this.unitSize;
        
        mesh.userData.originalMaterial = material.clone();
        
        return mesh;
    }

    // Получаем цвет объекта
    getObjectColor() {
        const baseColors = {
            'cube': 0xc7c7c7,
            'sphere': 0xc7c7c7,
            'cylinder': 0xc7c7c7
        };
        
        return baseColors[this.objectType] || 0x888888;
    }

    // Обновляем размеры
    updateDimensions(newDimensions) {
        this.dimensions.x = Math.max(1, Math.min(100, newDimensions.x));
        this.dimensions.y = Math.max(1, Math.min(100, newDimensions.y));
        this.dimensions.z = Math.max(1, Math.min(100, newDimensions.z));
        
        this.rebuildObject();
    }

    // Получаем физические свойства
    getPhysicalProperties() {
        const sizeX = this.dimensions.x * this.unitSize;
        const sizeY = this.dimensions.y * this.unitSize;
        const sizeZ = this.dimensions.z * this.unitSize;
        
        let volume, surfaceArea, boundingBox;
        
        switch(this.objectType) {
            case 'cube':
                volume = sizeX * sizeY * sizeZ;
                surfaceArea = 2 * (sizeX * sizeY + sizeX * sizeZ + sizeY * sizeZ);
                boundingBox = {
                    x: sizeX,
                    y: sizeY,
                    z: sizeZ
                };
                break;
                
            case 'sphere':
                const radius = Math.max(sizeX, sizeY, sizeZ) / 2;
                volume = (4/3) * Math.PI * Math.pow(radius, 3);
                surfaceArea = 4 * Math.PI * Math.pow(radius, 2);
                boundingBox = {
                    x: radius * 2,
                    y: radius * 2,
                    z: radius * 2
                };
                break;
                
            case 'cylinder':
                const cylRadius = Math.max(sizeX, sizeZ) / 2;
                const cylHeight = sizeY;
                volume = Math.PI * Math.pow(cylRadius, 2) * cylHeight;
                surfaceArea = 2 * Math.PI * cylRadius * (cylRadius + cylHeight);
                boundingBox = {
                    x: cylRadius * 2,
                    y: cylHeight,
                    z: cylRadius * 2
                };
                break;
                
            default:
                volume = 0;
                surfaceArea = 0;
                boundingBox = { x: 0, y: 0, z: 0 };
        }
        
        const density = this.materialDensities[this.materialType] || 1000;
        const mass = volume * density;
        
        const centerOfMass = {
            x: this.basePosition.x + (boundingBox.x / 2),
            y: this.basePosition.y + (boundingBox.y / 2),
            z: this.basePosition.z + (boundingBox.z / 2)
        };
        
        // Упрощенный расчет момента инерции для куба
        const momentOfInertia = (1/12) * mass * (
            Math.pow(boundingBox.y, 2) + Math.pow(boundingBox.z, 2)
        );
        
        return {
            volume,
            surfaceArea,
            mass,
            boundingBox,
            centerOfMass,
            momentOfInertia,
            material: this.materialType
        };
    }

    setPosition(x, y, z) {
        this.basePosition.set(x, y, z);
        this.rebuildObject();
    }

    setMaterial(materialType) {
        this.materialType = materialType;
        if (this.mesh) {
            this.mesh.material.color.set(this.getObjectColor());
        }
    }

    clear() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        this.mesh = null;
    }

    getId() {
        return this.id;
    }

    getDimensions() {
        return { ...this.dimensions };
    }

    getPosition() {
        return this.basePosition.clone();
    }

    getMesh() {
        return this.mesh;
    }
}
