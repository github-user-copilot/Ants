class Ant {
    constructor(x, y, direction = 0) {
        this.x = x;
        this.y = y;
        this.direction = direction; // 0: up, 1: right, 2: down, 3: left
    }
}

class LangtonsAnt {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.baseCellSize = 4; // Base size of each cell in pixels
        this.cellSize = this.baseCellSize; // Current cell size (affected by zoom)
        this.zoomLevel = 1; // Current zoom level
        this.minZoom = 0.5; // Minimum zoom level
        this.maxZoom = 5; // Maximum zoom level
        this.grid = new Map(); // Using Map to store cell states
        this.ants = []; // Array to store multiple ants
        this.steps = 0;
        this.isRunning = false;
        this.animationId = null;
        this.offsetX = 0; // Camera offset X
        this.offsetY = 0; // Camera offset Y
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.speed = 1; // Steps per frame
        this.maxSpeed = 10;
        this.minSpeed = 0.1;
        this.speedStep = 0.1;

        // Create context menu
        this.createContextMenu();

        // Set canvas size to window size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Initialize controls and event listeners
        this.initializeControls();
        this.initializeEventListeners();
        
        // Add initial ant
        this.addAnt();
    }

    createContextMenu() {
        // Create context menu container
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'context-menu';
        this.contextMenu.style.display = 'none';
        document.body.appendChild(this.contextMenu);

        // Create speed control section
        const speedControl = document.createElement('div');
        speedControl.className = 'speed-control';
        
        // Speed label
        const speedLabel = document.createElement('div');
        speedLabel.className = 'speed-label';
        speedLabel.textContent = 'Speed: 1x';
        speedControl.appendChild(speedLabel);
        this.speedLabel = speedLabel;

        // Speed slider
        const speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.min = this.minSpeed;
        speedSlider.max = this.maxSpeed;
        speedSlider.step = this.speedStep;
        speedSlider.value = this.speed;
        speedSlider.className = 'speed-slider';
        speedControl.appendChild(speedSlider);

        // Speed buttons
        const speedButtons = document.createElement('div');
        speedButtons.className = 'speed-buttons';
        
        const speeds = [0.5, 1, 2, 5];
        speeds.forEach(speed => {
            const button = document.createElement('button');
            button.textContent = `${speed}x`;
            button.className = 'speed-button';
            button.addEventListener('click', () => {
                this.setSpeed(speed);
                speedSlider.value = speed;
                this.updateSpeedLabel();
            });
            speedButtons.appendChild(button);
        });
        
        speedControl.appendChild(speedButtons);
        this.contextMenu.appendChild(speedControl);

        // Add event listener for speed slider
        speedSlider.addEventListener('input', (e) => {
            this.setSpeed(parseFloat(e.target.value));
            this.updateSpeedLabel();
        });
    }

    setSpeed(newSpeed) {
        this.speed = Math.max(this.minSpeed, Math.min(this.maxSpeed, newSpeed));
        this.updateSpeedLabel();
    }

    updateSpeedLabel() {
        this.speedLabel.textContent = `Speed: ${this.speed.toFixed(1)}x`;
    }

    initializeControls() {
        const startBtn = document.getElementById('startBtn');
        const resetBtn = document.getElementById('resetBtn');
        const addAntBtn = document.getElementById('addAntBtn');
        const removeAntBtn = document.getElementById('removeAntBtn');

        startBtn.addEventListener('click', () => {
            if (this.isRunning) {
                this.stop();
                startBtn.textContent = 'Start';
            } else {
                this.start();
                startBtn.textContent = 'Stop';
            }
        });

        resetBtn.addEventListener('click', () => this.reset());
        addAntBtn.addEventListener('click', () => this.addAnt());
        removeAntBtn.addEventListener('click', () => this.removeAnt());
    }

    initializeEventListeners() {
        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out or in
            const newZoom = this.zoomLevel * delta;
            
            // Limit zoom level
            if (newZoom >= this.minZoom && newZoom <= this.maxZoom) {
                // Calculate mouse position in grid coordinates
                const mouseX = e.clientX;
                const mouseY = e.clientY;
                const gridX = (mouseX - this.offsetX) / this.cellSize;
                const gridY = (mouseY - this.offsetY) / this.cellSize;
                
                // Update zoom level
                this.zoomLevel = newZoom;
                this.cellSize = this.baseCellSize * this.zoomLevel;
                
                // Adjust offset to zoom towards mouse position
                this.offsetX = mouseX - gridX * this.cellSize;
                this.offsetY = mouseY - gridY * this.cellSize;
                
                this.draw();
            }
        });

        // Mouse drag for panning
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.lastMouseX;
                const deltaY = e.clientY - this.lastMouseY;
                this.offsetX += deltaX;
                this.offsetY += deltaY;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.draw();
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        // Context menu event listeners
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY);
        });

        // Hide context menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        // Hide context menu when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideContextMenu();
            }
        });
    }

    showContextMenu(x, y) {
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
    }

    hideContextMenu() {
        this.contextMenu.style.display = 'none';
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.draw(); // Redraw after resize
    }

    getCellKey(x, y) {
        return `${x},${y}`;
    }

    getCell(x, y) {
        return this.grid.get(this.getCellKey(x, y)) || false;
    }

    setCell(x, y, value) {
        this.grid.set(this.getCellKey(x, y), value);
    }

    addAnt() {
        // Calculate center position in grid coordinates
        const centerX = Math.floor((this.canvas.width / 2 - this.offsetX) / this.cellSize);
        const centerY = Math.floor((this.canvas.height / 2 - this.offsetY) / this.cellSize);
        const direction = Math.floor(Math.random() * 4);
        this.ants.push(new Ant(centerX, centerY, direction));
        this.updateAntCount();
    }

    removeAnt() {
        if (this.ants.length > 1) {
            this.ants.pop();
            this.updateAntCount();
        }
    }

    updateAntCount() {
        document.getElementById('antCount').textContent = `Ants: ${this.ants.length}`;
    }

    moveAnt(ant) {
        const currentCell = this.getCell(ant.x, ant.y);
        
        // Turn based on current cell color
        if (currentCell) {
            ant.direction = (ant.direction + 3) % 4; // Turn left
        } else {
            ant.direction = (ant.direction + 1) % 4; // Turn right
        }

        // Flip the color of the current cell
        this.setCell(ant.x, ant.y, !currentCell);

        // Move the ant
        switch (ant.direction) {
            case 0: ant.y--; break; // Up
            case 1: ant.x++; break; // Right
            case 2: ant.y++; break; // Down
            case 3: ant.x--; break; // Left
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate visible grid area
        const startX = Math.floor(-this.offsetX / this.cellSize);
        const startY = Math.floor(-this.offsetY / this.cellSize);
        const endX = Math.ceil((this.canvas.width - this.offsetX) / this.cellSize);
        const endY = Math.ceil((this.canvas.height - this.offsetY) / this.cellSize);
        
        // Draw grid cells
        this.grid.forEach((value, key) => {
            const [x, y] = key.split(',').map(Number);
            // Only draw cells that are visible
            if (x >= startX && x <= endX && y >= startY && y <= endY) {
                this.ctx.fillStyle = value ? '#ffffff' : '#000000';
                this.ctx.fillRect(
                    x * this.cellSize + this.offsetX,
                    y * this.cellSize + this.offsetY,
                    this.cellSize,
                    this.cellSize
                );
            }
        });

        // Draw ants with different colors
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        this.ants.forEach((ant, index) => {
            // Only draw ants that are visible
            if (ant.x >= startX && ant.x <= endX && ant.y >= startY && ant.y <= endY) {
                this.ctx.fillStyle = colors[index % colors.length];
                this.ctx.fillRect(
                    ant.x * this.cellSize + this.offsetX,
                    ant.y * this.cellSize + this.offsetY,
                    this.cellSize,
                    this.cellSize
                );
            }
        });
    }

    step() {
        // Perform multiple steps based on speed
        const stepsToTake = Math.floor(this.speed);
        const remainder = this.speed - stepsToTake;
        
        // Take full steps
        for (let i = 0; i < stepsToTake; i++) {
            this.ants.forEach(ant => this.moveAnt(ant));
            this.steps++;
        }
        
        // Take partial step based on remainder
        if (remainder > 0 && Math.random() < remainder) {
            this.ants.forEach(ant => this.moveAnt(ant));
            this.steps++;
        }

        document.getElementById('stepCount').textContent = `Steps: ${this.steps}`;
        this.draw();
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    animate() {
        if (!this.isRunning) return;
        
        this.step();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    reset() {
        this.stop();
        this.grid.clear();
        this.ants = [];
        this.zoomLevel = 1;
        this.cellSize = this.baseCellSize;
        this.offsetX = 0;
        this.offsetY = 0;
        this.speed = 1;
        this.updateSpeedLabel();
        this.addAnt();
        this.steps = 0;
        document.getElementById('stepCount').textContent = 'Steps: 0';
        document.getElementById('startBtn').textContent = 'Start';
        this.draw();
    }
}

// Initialize the simulation when the page loads
window.addEventListener('load', () => {
    const canvas = document.getElementById('antCanvas');
    const simulation = new LangtonsAnt(canvas);
});