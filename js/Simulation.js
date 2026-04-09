class Simulation {
    constructor(canvasId, isAI, domElements) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Setup internal resolution for massive play area
        this.width = 1000;
        this.height = 1000;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.isAI = isAI;
        this.intersection = new Intersection(this.width, this.height);
        
        if (this.isAI) {
            this.controller = new AITrafficController(this.intersection);
        } else {
            this.controller = new UserManualController(this.intersection);
        }

        // DOM elements for updating UI
        this.elements = domElements;
        
        // Logs removed as requested

        this.isRunning = false;
        this.spawnRate = 1.2; // seconds between spawns
        this.spawnTimer = this.spawnRate;
    }

    resize() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        
        // Scale drawing context so we can develop on a fixed internal coordinate system
        this.scaleX = (this.canvas.width / this.width) || 1;
        this.scaleY = (this.canvas.height / this.height) || 1;
    }

    start() {
        this.isRunning = true;
    }

    pause() {
        this.isRunning = false;
    }

    reset() {
        this.isRunning = false;
        this.intersection = new Intersection(this.width, this.height);
        
        if (this.isAI) {
            this.controller = new AITrafficController(this.intersection);
        } else {
            this.controller = new UserManualController(this.intersection);
        }

        // Log reset removed
        
        // Clear canvas
        this.draw(); 
        this.updateMetricsUI();
    }

    // Logging disabled

    updateMetricsUI() {
        const metrics = this.intersection.getMetrics();
        if (this.elements.passed) this.elements.passed.textContent = metrics.passed;
        if (this.elements.wait) this.elements.wait.textContent = metrics.avgWaitTime;
    }

    update(deltaTime) {
        if (!this.isRunning) return;

        // Ensure 1 is normal speed (60fps baseline -> ~16.6ms)
        const normalizedDelta = deltaTime / (1000 / 60);

        // Update controllers
        this.controller.update(normalizedDelta);
        
        // Update physics
        this.intersection.update(normalizedDelta);

        // Handle Spawning
        this.spawnTimer += (normalizedDelta / 60);
        if (this.spawnTimer >= this.spawnRate) {
            this.spawnTimer = 0;
            this.intersection.spawnVehicle();
            
            // Randomize spawn rate slightly for natural traffic
            this.spawnRate = 0.5 + Math.random() * 1.5;
        }

        // Periodically update UI so we don't kill performance 
        // deltaTime acts as a random frame tick, we can just do it every frame for a simple UI
        this.updateMetricsUI();
    }

    draw() {
        this.ctx.save();
        this.ctx.scale(this.scaleX, this.scaleY);
        
        // Clear
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw Intersection
        this.intersection.draw(this.ctx);

        this.ctx.restore();
    }
}
