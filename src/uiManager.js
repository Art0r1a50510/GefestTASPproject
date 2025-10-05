export class UIManager {
    constructor() {
        this.selectionManager = null;
        this.isDragging = false;
        this.dragTarget = null;
        this.dragStartValue = 0;
        this.dragStartX = 0;
        this.isEditing = false;
        this.objectManager = null;
    }

    setupToolbar(objectManager, selectionManager, sceneManager, gizmoManager) {
        this.selectionManager = selectionManager;
        this.objectManager = objectManager;

        const toolbar = document.getElementById('toolbar');
        toolbar.style.display = 'block';

        document.getElementById('modulesBtn').addEventListener('click', () => {
            this.toggleModulesLibrary();
        });

        this.setupModulesLibrary();
        this.setupPropertiesPanel(selectionManager);
        this.setupCADPropertiesPanel();
        this.updateSelectionInfo();
    }

    // Настраиваем CAD панель свойств
    setupCADPropertiesPanel() {
        const cadPanel = document.getElementById('cadPropertiesPanel');
        

        document.getElementById('closeCadPanel').addEventListener('click', () => {
        this.hideCADPropertiesPanel();
        });

        // Обработчики для размеров
        this.setupDimensionInputs();
        
        console.log('CAD Properties panel setup complete');
    }
    

    setupDimensionInputs() {
        const dimensionInputs = ['dimensionX', 'dimensionY', 'dimensionZ'];
        
        dimensionInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (!input) return;

            input.addEventListener('change', () => {
                this.applyDimensionChanges();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.applyDimensionChanges();
                    input.blur();
                }
            });
        });
    }

    applyDimensionChanges() {
        const dimX = parseInt(document.getElementById('dimensionX').value) || 1;
        const dimY = parseInt(document.getElementById('dimensionY').value) || 1;
        const dimZ = parseInt(document.getElementById('dimensionZ').value) || 1;

        const selectedObjects = this.selectionManager.getSelectedObjects();
        if (selectedObjects.length === 0) return;

        const modularObject = selectedObjects.find(obj => 
            obj.userData && obj.userData.modularId
        );

        if (modularObject && modularObject.userData.modularId) {
            const success = this.objectManager.updateObjectDimensions(
                modularObject.userData.modularId,
                { x: dimX, y: dimY, z: dimZ }
            );

            if (success) {
                this.updateCADProperties(selectedObjects);
                this.updatePropertiesPanel(selectedObjects);
            }
        }
    }

    applyMaterialChange(materialType) {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        if (selectedObjects.length === 0) return;

        const modularObject = selectedObjects.find(obj => 
            obj.userData && obj.userData.modularId
        );

        if (modularObject && modularObject.userData.modularId) {
            this.objectManager.updateObjectMaterial(
                modularObject.userData.modularId,
                materialType
            );
            this.updateCADProperties(selectedObjects);
        }
    }

    // Обновляем CAD свойства
    updateCADProperties(selectedObjects) {
        if (!selectedObjects || selectedObjects.length === 0) {
            this.hideCADPropertiesPanel();
            return;
        }

        const modularObject = selectedObjects.find(obj => 
            obj.userData && obj.userData.modularId
        );

        if (modularObject && modularObject.userData.modularId) {
            const properties = this.objectManager.getObjectProperties(
                modularObject.userData.modularId
            );

            if (properties) {
                // Обновляем физические свойства
                document.getElementById('volumeValue').textContent = properties.volume.toFixed(2);
                document.getElementById('surfaceAreaValue').textContent = properties.surfaceArea.toFixed(2);
                document.getElementById('boundingBoxValue').textContent = 
                    `${properties.boundingBox.x.toFixed(2)}×${properties.boundingBox.y.toFixed(2)}×${properties.boundingBox.z.toFixed(2)}`;


                // Обновляем размерности в CAD панели
                document.getElementById('dimensionX').value = properties.boundingBox.x / 2;
                document.getElementById('dimensionY').value = properties.boundingBox.y / 2;
                document.getElementById('dimensionZ').value = properties.boundingBox.z / 2;

                // Показываем панель
                document.getElementById('cadPropertiesPanel').style.display = 'block';
            }
        }
    }

    showCADPropertiesPanel(selectedObjects) {
    if (!selectedObjects || selectedObjects.length === 0) {
        this.hideCADPropertiesPanel();
        return;
    }

    const cadPanel = document.getElementById('cadPropertiesPanel');
    if (!cadPanel) return;

    this.updateCADProperties(selectedObjects);
    cadPanel.style.display = 'block'; // Явно показываем панель
    }

    hideCADPropertiesPanel() {
        const cadPanel = document.getElementById('cadPropertiesPanel');
        if (cadPanel) {
            cadPanel.style.display = 'none';
        }
    }

    setupPropertiesPanel(selectionManager) {
        this.selectionManager = selectionManager;
        
        const panel = document.getElementById('propertiesPanel');
        panel.style.display = 'none';

        document.getElementById('closePanel').addEventListener('click', () => {
            this.hidePropertiesPanel();
            selectionManager.deselectAllObjects();
        });

        this.setupInputHandlers();
        console.log('Properties panel setup complete - HIDDEN by default');
    }

    // Обновляем обычную панель свойств
    showPropertiesPanel(selectedObjects) {
        if (!selectedObjects || selectedObjects.length === 0) {
            this.hidePropertiesPanel();
            this.hideCADPropertiesPanel();
            return;
        }

        // Обновляем трансформации
        const properties = this.selectionManager.getObjectProperties();
        if (properties) {
            const panel = document.getElementById('propertiesPanel');
            const panelHeader = document.querySelector('#propertiesPanel .panel-header h4');
            
            if (!panel || !panelHeader) return;

            if (properties.count > 1) {
                panelHeader.textContent = `Transform (${properties.count} selected)`;
            } else {
                panelHeader.textContent = 'Transform';
            }

            document.getElementById('posX').value = properties.position.x.toFixed(2);
            document.getElementById('posY').value = properties.position.y.toFixed(2);
            document.getElementById('posZ').value = properties.position.z.toFixed(2);

            document.getElementById('rotXInput').value = Math.round(properties.rotation.x);
            document.getElementById('rotYInput').value = Math.round(properties.rotation.y);
            document.getElementById('rotZInput').value = Math.round(properties.rotation.z);

            // Обновляем размерности вместо scale
            this.updateDimensionProperties(selectedObjects);
        }

        // Показываем CAD панель для параметрических объектов и модулей космической станции
        const hasCADProperties = selectedObjects.some(obj => {
            if (!obj.userData) return false;
            
            // Исключаем определенные типы модулей
            const excludedTypes = ['SunPanels', 'A1Preset', 'A2Preset', 'A3Preset', 'BUMRoof', 'BigUniversalV1'];
            const moduleName = obj.userData.moduleName;
            
            if (moduleName && excludedTypes.includes(moduleName)) {
                return false;
            }
            
            // Показываем CAD properties для:
            return obj.userData.modularId || // параметрические объекты
                (obj.userData.objectType === 'spaceStationModule' && 
                    !excludedTypes.includes(moduleName)); // модули космической станции (кроме исключенных)
        });

        if (hasCADProperties) {
            this.showCADPropertiesPanel(selectedObjects);
        } else {
            this.hideCADPropertiesPanel();
        }

        document.getElementById('propertiesPanel').style.display = 'block';
        this.updateSelectionInfo();
    }

    // Обновим метод updateCADProperties для поддержки модулей космической станции
    updateCADProperties(selectedObjects) {
        if (!selectedObjects || selectedObjects.length === 0) {
            this.hideCADPropertiesPanel();
            return;
        }

        const selectedObject = selectedObjects[0]; // Берем первый выбранный объект
        
        let properties = null;
        let dimensions = { x: 1, y: 1, z: 1 };

        // Получаем свойства в зависимости от типа объекта
        if (selectedObject.userData && selectedObject.userData.modularId) {
            // Параметрические объекты
            properties = this.objectManager.getObjectProperties(selectedObject.userData.modularId);
            const modularObject = this.objectManager.getModularObjectBySegment(selectedObject);
            if (modularObject) {
                dimensions = modularObject.getDimensions();
            }
        } else if (selectedObject.userData && selectedObject.userData.objectType === 'spaceStationModule') {
            // Модули космической станции
            properties = this.objectManager.getGLTFPhysicalProperties(selectedObject);
            dimensions = {
                x: properties.boundingBox.x,
                y: properties.boundingBox.y, 
                z: properties.boundingBox.z
            };
        }

        if (properties) {
            // Обновляем физические свойства
            document.getElementById('volumeValue').textContent = properties.volume.toFixed(2);
            document.getElementById('surfaceAreaValue').textContent = properties.surfaceArea.toFixed(2);
            document.getElementById('boundingBoxValue').textContent = 
                `${properties.boundingBox.x.toFixed(2)}×${properties.boundingBox.y.toFixed(2)}×${properties.boundingBox.z.toFixed(2)}`;

            // Обновляем размерности в CAD панели
            document.getElementById('dimensionX').value = Math.round(dimensions.x * 10) / 10;
            document.getElementById('dimensionY').value = Math.round(dimensions.y * 10) / 10;
            document.getElementById('dimensionZ').value = Math.round(dimensions.z * 10) / 10;

            // Обновляем информацию о материале если есть
            if (properties.material) {
                const materialSelect = document.getElementById('materialSelect');
                if (materialSelect) {
                    materialSelect.value = properties.material;
                }
            }

            // Показываем панель
            document.getElementById('cadPropertiesPanel').style.display = 'block';
        }
    }

    // Обновим метод applyDimensionChanges для поддержки модулей космической станции
    applyDimensionChanges() {
        const dimX = parseFloat(document.getElementById('dimensionX').value) || 1;
        const dimY = parseFloat(document.getElementById('dimensionY').value) || 1;
        const dimZ = parseFloat(document.getElementById('dimensionZ').value) || 1;

        const selectedObjects = this.selectionManager.getSelectedObjects();
        if (selectedObjects.length === 0) return;

        const selectedObject = selectedObjects[0];

        // Для параметрических объектов
        if (selectedObject.userData && selectedObject.userData.modularId) {
            const success = this.objectManager.updateObjectDimensions(
                selectedObject.userData.modularId,
                { x: dimX, y: dimY, z: dimZ }
            );

            if (success) {
                this.updateCADProperties(selectedObjects);
                this.updatePropertiesPanel(selectedObjects);
            }
        }
        // Для модулей космической станции - масштабируем объект
        else if (selectedObject.userData && selectedObject.userData.objectType === 'spaceStationModule') {
            const originalScale = selectedObject.userData.originalScale || 1;
            const currentBoundingBox = this.objectManager.getGLTFPhysicalProperties(selectedObject).boundingBox;
            
            // Рассчитываем новый масштаб на основе измененных размеров
            const scaleX = dimX / currentBoundingBox.x;
            const scaleY = dimY / currentBoundingBox.y;
            const scaleZ = dimZ / currentBoundingBox.z;
            
            // Применяем масштабирование
            selectedObject.scale.set(scaleX, scaleY, scaleZ);
            
            // Обновляем свойства
            this.updateCADProperties(selectedObjects);
            this.updatePropertiesPanel(selectedObjects);
            
            console.log(`Scaled module to: ${scaleX.toFixed(2)}, ${scaleY.toFixed(2)}, ${scaleZ.toFixed(2)}`);
        }
    }

    // Добавим метод для обновления размерностей в обычной панели свойств
    updateDimensionProperties(selectedObjects) {
        if (!selectedObjects || selectedObjects.length === 0) return;

        const selectedObject = selectedObjects[0];
        let dimensions = { x: 1, y: 1, z: 1 };

        if (selectedObject.userData && selectedObject.userData.modularId) {
            // Параметрические объекты
            const obj = this.objectManager.getModularObjectBySegment(selectedObject);
            if (obj) {
                dimensions = obj.getDimensions();
            }
        } else if (selectedObject.userData && selectedObject.userData.objectType === 'spaceStationModule') {
            // Модули космической станции
            const properties = this.objectManager.getGLTFPhysicalProperties(selectedObject);
            dimensions = {
                x: Math.round(properties.boundingBox.x * 10) / 10,
                y: Math.round(properties.boundingBox.y * 10) / 10,
                z: Math.round(properties.boundingBox.z * 10) / 10
            };
        } else {
            // Для обычных объектов используем scale как размерность
            const properties = this.selectionManager.getObjectProperties();
            if (properties) {
                dimensions = {
                    x: Math.round(properties.scale.x),
                    y: Math.round(properties.scale.y),
                    z: Math.round(properties.scale.z)
                };
            }
        }

        document.getElementById('dimXInput').value = dimensions.x;
        document.getElementById('dimYInput').value = dimensions.y;
        document.getElementById('dimZInput').value = dimensions.z;
    }

    updateDimensionProperties(selectedObjects) {
        const modularObject = selectedObjects.find(obj => 
            obj.userData && obj.userData.modularId
        );

        if (modularObject && modularObject.userData.modularId) {
            const obj = this.objectManager.getModularObjectBySegment(modularObject);
            if (obj) {
                const dimensions = obj.getDimensions();
                document.getElementById('dimXInput').value = dimensions.x;
                document.getElementById('dimYInput').value = dimensions.y;
                document.getElementById('dimZInput').value = dimensions.z;
            }
        } else {
            // Для обычных объектов используем scale как размерность
            const properties = this.selectionManager.getObjectProperties();
            if (properties) {
                document.getElementById('dimXInput').value = Math.round(properties.scale.x);
                document.getElementById('dimYInput').value = Math.round(properties.scale.y);
                document.getElementById('dimZInput').value = Math.round(properties.scale.z);
            }
        }
    }

    setupModulesLibrary() {
        const library = document.getElementById('modulesLibrary');
        const closeBtn = document.getElementById('closeLibrary');
        const modulesBtn = document.getElementById('modulesBtn');
        
        closeBtn.addEventListener('click', () => {
            this.hideModulesLibrary();
        });
        
        // Обработчики для модулей космической станции
        document.querySelectorAll('.module-item[data-module-type]').forEach(item => {
            item.addEventListener('click', () => {
                const moduleType = item.getAttribute('data-module-type');
                if (!item.classList.contains('coming-soon')) {
                    this.loadSpaceStationModule(moduleType);
                    this.hideModulesLibrary();
                }
            });
        });
        
        this.setupPrimitiveButtons();
        
        console.log('Modules library setup complete');
    }

    loadSpaceStationModule(moduleType) {
        const position = { 
            x: 0, 
            y: 0, 
            z: 0
        };
        
        this.objectManager.loadSpaceStationModule(moduleType, position)
            .then(module => {
                console.log(`Space station module ${moduleType} loaded:`, module);
            })
            .catch(error => {
                console.error(`Failed to load module ${moduleType}:`, error);
            });
    }

    setupPrimitiveButtons() {
        document.getElementById('addCubeBtn').addEventListener('click', () => {
            const cube = this.objectManager.addCube();
            this.hideModulesLibrary();
            console.log('Cube added from library:', cube);
        });

        document.getElementById('addSphereBtn').addEventListener('click', () => {
            const sphere = this.objectManager.addSphere();
            this.hideModulesLibrary();
            console.log('Sphere added from library:', sphere);
        });

        document.getElementById('addCylinderBtn').addEventListener('click', () => {
            const cylinder = this.objectManager.addCylinder();
            this.hideModulesLibrary();
            console.log('Cylinder added from library:', cylinder);
        });
    
    }

    toggleModulesLibrary() {
        const library = document.getElementById('modulesLibrary');
        const modulesBtn = document.getElementById('modulesBtn');
        
        if (library.style.display === 'block') {
            this.hideModulesLibrary();
        } else {
            this.showModulesLibrary();
        }
    }

    showModulesLibrary() {
        const library = document.getElementById('modulesLibrary');
        const modulesBtn = document.getElementById('modulesBtn');
        
        modulesBtn.style.display = 'none';
        library.style.display = 'block';
        console.log('Modules library opened');
    }

    hideModulesLibrary() {
        const library = document.getElementById('modulesLibrary');
        const modulesBtn = document.getElementById('modulesBtn');
        
        library.style.display = 'none';
        modulesBtn.style.display = 'block';
        console.log('Modules library closed');
    }
    
    setupInputHandlers() {
        const inputs = [
            'posX', 'posY', 'posZ',
            'rotXInput', 'rotYInput', 'rotZInput', 
            'dimXInput', 'dimYInput', 'dimZInput'
        ];

        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (!input) return;

            input.addEventListener('mousedown', (e) => {
                if (e.button === 0 && !this.isEditing) {
                    this.startSimpleDrag(e, input);
                }
            });

            input.addEventListener('dblclick', (e) => {
                this.enterEditMode(input);
                e.preventDefault();
            });

            input.addEventListener('focus', () => {
                if (!this.isDragging && !this.isEditing) {
                    this.enterEditMode(input);
                }
            });

            input.addEventListener('blur', () => {
                this.exitEditMode(input);
            });

            input.addEventListener('input', () => {
                if (this.isEditing) {
                    this.applyChangesFromInput(input);
                }
            });

            input.addEventListener('change', () => {
                if (this.isEditing) {
                    this.applyChangesFromInput(input);
                    this.exitEditMode(input);
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && this.isEditing) {
                    input.blur();
                }
            });
        });

        this.setupGlobalDragHandlers();
    }

    setupGlobalDragHandlers() {
        document.addEventListener('mousemove', (e) => this.onSimpleDrag(e));
        document.addEventListener('mouseup', () => this.stopSimpleDrag());
    }

    enterEditMode(input) {
        if (this.isDragging) return;
        
        this.isEditing = true;
        input.classList.add('editing');
        input.removeAttribute('readonly');
        input.select();
        input.style.cursor = 'text';
        
        console.log('Entered edit mode for:', input.id);
    }

    exitEditMode(input) {
        this.isEditing = false;
        input.classList.remove('editing');
        input.setAttribute('readonly', 'true');
        input.style.cursor = 'ew-resize';
        
        this.applyChangesFromInput(input);
        
        console.log('Exited edit mode for:', input.id);
    }

    startSimpleDrag(e, input) {
        if (this.isEditing) return;

        this.isDragging = true;
        this.dragTarget = input;
        this.dragStartValue = parseFloat(input.value) || 0;
        this.dragStartX = e.clientX;
        
        input.classList.add('dragging');
        
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        
        e.preventDefault();
    }

    onSimpleDrag(e) {
        if (!this.isDragging || !this.dragTarget || this.isEditing) return;

        const deltaX = e.clientX - this.dragStartX;
        let newValue = this.dragStartValue;

        if (this.dragTarget.id.includes('pos')) {
            newValue += deltaX * 0.02;
        } else if (this.dragTarget.id.includes('rot')) {
            newValue += deltaX * 0.2;
        } else if (this.dragTarget.id.includes('dim')) {
            newValue += deltaX * 0.01;
            newValue = Math.max(1, Math.min(100, Math.round(newValue)));
        }

        this.dragTarget.value = this.formatValue(newValue, this.dragTarget);
        
        this.applyChangesFromInput(this.dragTarget);
    }

    stopSimpleDrag() {
        if (this.isDragging && this.dragTarget) {
            this.dragTarget.classList.remove('dragging');
            
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
        }
        this.isDragging = false;
        this.dragTarget = null;
    }

    formatValue(value, input) {
        if (input.id.includes('pos')) {
            return Math.round(value * 100) / 100;
        } else if (input.id.includes('rot')) {
            return Math.round(value);
        } else if (input.id.includes('dim')) {
            return Math.round(value);
        }
        return value;
    }

    applyChangesFromInput(input) {
        if (!this.selectionManager || this.selectionManager.getSelectedCount() === 0) return;

        const id = input.id;
        
        if (id.includes('pos')) {
            this.applySinglePosition(id);
        } else if (id.includes('rot')) {
            this.applyRotation(id.replace('Input', ''));
        } else if (id.includes('dim')) {
            this.applyDimension(id.replace('Input', ''));
        }
    }

    applySinglePosition(axisId) {
        const currentX = parseFloat(document.getElementById('posX').value) || 0;
        const currentY = parseFloat(document.getElementById('posY').value) || 0;
        const currentZ = parseFloat(document.getElementById('posZ').value) || 0;
        
        let x = currentX;
        let y = currentY;
        let z = currentZ;
        
        if (axisId === 'posX') {
            x = parseFloat(document.getElementById('posX').value) || 0;
        } else if (axisId === 'posY') {
            y = parseFloat(document.getElementById('posY').value) || 0;
        } else if (axisId === 'posZ') {
            z = parseFloat(document.getElementById('posZ').value) || 0;
        }
        
        this.selectionManager.applyPosition(x, y, z);
        this.animateValueChange(document.getElementById(axisId));
    }

    applyRotation(axis) {
        const input = document.getElementById(axis + 'Input');
        const value = parseFloat(input.value) || 0;
        
        this.selectionManager.applyRotation(axis, value);
        this.animateValueChange(input);
    }

    applyDimension(axis) {
        const input = document.getElementById(axis + 'Input');
        const value = parseInt(input.value) || 1;
        
        // Для размерности применяем изменения через CAD систему
        const dimX = parseInt(document.getElementById('dimXInput').value) || 1;
        const dimY = parseInt(document.getElementById('dimYInput').value) || 1;
        const dimZ = parseInt(document.getElementById('dimZInput').value) || 1;

        const selectedObjects = this.selectionManager.getSelectedObjects();
        if (selectedObjects.length === 0) return;

        const modularObject = selectedObjects.find(obj => 
            obj.userData && obj.userData.modularId
        );

        if (modularObject && modularObject.userData.modularId) {
            this.objectManager.updateObjectDimensions(
                modularObject.userData.modularId,
                { x: dimX, y: dimY, z: dimZ }
            );
            this.updateCADProperties(selectedObjects);
        }
        
        this.animateValueChange(input);
    }

    animateValueChange(input) {
        if (!input) return;
        
        input.classList.add('value-changed');
        setTimeout(() => {
            input.classList.remove('value-changed');
        }, 400);
    }

    hidePropertiesPanel() {
        const panel = document.getElementById('propertiesPanel');
        if (panel) {
            panel.style.display = 'none';
        }
        this.updateSelectionInfo();
    }

    updateSelectionInfo() {
        const count = this.selectionManager ? this.selectionManager.getSelectedCount() : 0;
        const infoElement = document.getElementById('selectionInfo');
        if (infoElement) {
            infoElement.textContent = `Selected: ${count}`;
        }
    }
}
