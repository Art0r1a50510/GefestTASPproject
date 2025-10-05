import * as THREE from 'three';

export class SelectionManager {
    constructor() {
        this.selectedObjects = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.connectionMode = false;
        this.connectionStart = null;
    }

    setConnectionMode(enabled) {
        this.connectionMode = enabled;
        this.connectionStart = null;
        console.log('Connection mode:', enabled ? 'ON' : 'OFF');
    }

    handleCanvasClick(event, scene, camera, renderer, objectManager) {
        if (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT' || 
            event.target.classList.contains('slider-thumb') || 
            event.target.classList.contains('slider-track')) {
            return null;
        }

        const rect = renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, camera);

        if (this.connectionMode) {
            return this.handleConnectionClick(event, scene, camera, renderer, objectManager);
        } else {
            return this.handleSelectionClick(event, scene, camera, renderer);
        }
    }

    handleConnectionClick(event, scene, camera, renderer, objectManager) {
        const intersectableObjects = this.getIntersectableObjects(scene);
        const intersects = this.raycaster.intersectObjects(intersectableObjects, false);

        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            const worldPosition = intersects[0].point;

            if (!this.connectionStart) {
                const nearestConnector = objectManager.findNearestConnector(worldPosition);
                if (nearestConnector) {
                    this.connectionStart = {
                        object: clickedObject,
                        connector: nearestConnector,
                        worldPosition: worldPosition
                    };
                    console.log('Connection start:', this.connectionStart);
                    return [clickedObject];
                }
            } else {
                const nearestConnector = objectManager.findNearestConnector(worldPosition);
                if (nearestConnector && nearestConnector.object !== this.connectionStart.object) {
                    const connection = objectManager.connectObjects(
                        this.connectionStart.object,
                        this.connectionStart.connector,
                        nearestConnector.object,
                        nearestConnector
                    );

                    if (connection) {
                        console.log('Connection created successfully');
                    }

                    this.connectionStart = null;
                    this.setConnectionMode(false);
                    return [clickedObject];
                } else {
                    console.warn('Cannot connect to the same object or no connector found');
                }
            }
        } else {
            this.connectionStart = null;
            this.setConnectionMode(false);
        }

        return null;
    }

    handleSelectionClick(event, scene, camera, renderer) {
        const intersectableObjects = this.getIntersectableObjects(scene);
        const intersects = this.raycaster.intersectObjects(intersectableObjects, false);

        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            
            // Если кликнули на объединенную группу, выбираем всю группу
            let targetObject = clickedObject;
            if (clickedObject.userData && clickedObject.userData.isMergedObject) {
                targetObject = clickedObject;
            } else {
                // Ищем родительскую объединенную группу
                let parent = clickedObject.parent;
                while (parent && parent !== scene) {
                    if (parent.userData && parent.userData.isMergedObject) {
                        targetObject = parent;
                        break;
                    }
                    parent = parent.parent;
                }
            }
            
            if (event.ctrlKey || event.metaKey) {
                this.toggleObjectSelection(targetObject);
            } else {
                this.selectSingleObject(targetObject);
            }
            
            return this.selectedObjects;
        } else {
            if (!event.ctrlKey && !event.metaKey) {
                this.deselectAllObjects();
            }
            return null;
        }
    }

    disconnectSelectedObjects(objectManager) {
        if (this.selectedObjects.length === 0) return 0;

        let disconnectedCount = 0;

        this.selectedObjects.forEach(object => {
            const connections = objectManager.getObjectConnections(object);
            connections.forEach(connection => {
                if (objectManager.disconnectObjects(connection.id)) {
                    disconnectedCount++;
                }
            });
        });

        console.log(`Disconnected ${disconnectedCount} connections`);
        return disconnectedCount;
    }

    toggleObjectSelection(object) {
        const index = this.selectedObjects.findIndex(obj => obj.id === object.id);
        
        if (index > -1) {
            this.deselectObject(object);
            this.selectedObjects.splice(index, 1);
        } else {
            this.selectObject(object);
            this.selectedObjects.push(object);
        }
        
        console.log('Selected objects:', this.selectedObjects.length);
    }

    selectSingleObject(object) {
        this.deselectAllObjects();
        this.selectObject(object);
        this.selectedObjects = [object];
        console.log('Selected single object:', object);
    }

    selectObject(object) {
        if (object.isGroup && object.userData && object.userData.isMergedObject) {
            // Для объединенных групп применяем выделение ко всем дочерним объектам
            object.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material) {
                    child.userData.originalMaterial = child.material.clone();
                    child.material = child.material.clone();
                    child.material.color.set(0x93D3EB);
                    child.material.emissive = new THREE.Color(0x003300);
                }
            });
        } else if (object.material) {
            object.userData.originalMaterial = object.material.clone();
            object.material = object.material.clone();
            object.material.color.set(0x93D3EB);
            object.material.emissive = new THREE.Color(0x003300);
        }
    }

    deselectObject(object) {
        if (object.isGroup && object.userData && object.userData.isMergedObject) {
            // Для объединенных групп снимаем выделение со всех дочерних объектов
            object.traverse((child) => {
                if (child && child.userData && child.userData.originalMaterial) {
                    child.material = child.userData.originalMaterial;
                    child.userData.originalMaterial = null;
                }
            });
        } else if (object && object.userData && object.userData.originalMaterial) {
            object.material = object.userData.originalMaterial;
            object.userData.originalMaterial = null;
        }
    }

    deselectAllObjects() {
        this.selectedObjects.forEach(obj => this.deselectObject(obj));
        this.selectedObjects = [];
    }

    getIntersectableObjects(scene) {
        const objects = [];
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh && 
                !(child instanceof THREE.GridHelper) && 
                !(child instanceof THREE.AxesHelper) &&
                !(child instanceof THREE.Light)) {
                objects.push(child);
            }
        });
        return objects;
    }

    applyRotation(axis, value) {
        if (this.selectedObjects.length === 0) return;
        
        const radValue = THREE.MathUtils.degToRad(value);
        
        this.selectedObjects.forEach(object => {
            switch(axis) {
                case 'rotX':
                    object.rotation.x = radValue;
                    break;
                case 'rotY':
                    object.rotation.y = radValue;
                    break;
                case 'rotZ':
                    object.rotation.z = radValue;
                    break;
            }
        });
        
        console.log(`Applied rotation ${axis}: ${value}° to ${this.selectedObjects.length} objects`);
    }

    applyScale(axis, value) {
        if (this.selectedObjects.length === 0) return;
        
        this.selectedObjects.forEach(object => {
            switch(axis) {
                case 'scaleX':
                    object.scale.x = value;
                    break;
                case 'scaleY':
                    object.scale.y = value;
                    break;
                case 'scaleZ':
                    object.scale.z = value;
                    break;
            }
        });
        
        console.log(`Applied scale ${axis}: ${value} to ${this.selectedObjects.length} objects`);
    }

    applyPosition(x, y, z) {
        if (this.selectedObjects.length === 0) return;
        
        const posX = parseFloat(x) || 0;
        const posY = parseFloat(y) || 0;
        const posZ = parseFloat(z) || 0;
        
        this.selectedObjects.forEach(object => {
            object.position.set(posX, posY, posZ);
        });
        
        console.log(`Applied position: (${posX}, ${posY}, ${posZ}) to ${this.selectedObjects.length} objects`);
    }

    getObjectProperties() {
        if (this.selectedObjects.length === 0) return null;

        if (this.selectedObjects.length === 1) {
            const object = this.selectedObjects[0];
            return {
                position: {
                    x: object.position.x,
                    y: object.position.y,
                    z: object.position.z
                },
                rotation: {
                    x: THREE.MathUtils.radToDeg(object.rotation.x),
                    y: THREE.MathUtils.radToDeg(object.rotation.y),
                    z: THREE.MathUtils.radToDeg(object.rotation.z)
                },
                scale: {
                    x: object.scale.x,
                    y: object.scale.y,
                    z: object.scale.z
                },
                count: 1
            };
        } else {
            let totalPos = new THREE.Vector3();
            let totalRot = new THREE.Vector3();
            let totalScale = new THREE.Vector3();

            this.selectedObjects.forEach(object => {
                totalPos.add(object.position);
                totalRot.add(new THREE.Vector3(
                    THREE.MathUtils.radToDeg(object.rotation.x),
                    THREE.MathUtils.radToDeg(object.rotation.y),
                    THREE.MathUtils.radToDeg(object.rotation.z)
                ));
                totalScale.add(object.scale);
            });

            const count = this.selectedObjects.length;
            
            return {
                position: {
                    x: totalPos.x / count,
                    y: totalPos.y / count,
                    z: totalPos.z / count
                },
                rotation: {
                    x: totalRot.x / count,
                    y: totalRot.y / count,
                    z: totalRot.z / count
                },
                scale: {
                    x: totalScale.x / count,
                    y: totalScale.y / count,
                    z: totalScale.z / count
                },
                count: count
            };
        }
    }

    getSelectedObjects() {
        return this.selectedObjects;
    }

    getSelectedCount() {
        return this.selectedObjects.length;
    }

    // Метод для проверки возможности слияния объектов
    canMergeObjects() {
        return this.selectedObjects.length >= 2;
    }
}
