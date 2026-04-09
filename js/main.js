document.addEventListener('DOMContentLoaded', () => {
    
    // UI Elements
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnReset = document.getElementById('btn-reset');
    const btnExit = document.getElementById('btn-exit');
    const systemStatus = document.querySelector('.system-status');

    // Init Manual Simulation
    const manualElements = {
        passed: document.getElementById('manual-passed'),
        wait: document.getElementById('manual-wait'),
        logsList: document.getElementById('manual-logs')
    };
    const manualSim = new Simulation('canvas-manual', false, manualElements);

    // Init AI Simulation
    const aiElements = {
        passed: document.getElementById('ai-passed'),
        wait: document.getElementById('ai-wait'),
        logsList: document.getElementById('ai-logs')
    };
    const aiSim = new Simulation('canvas-ai', true, aiElements);

    // Main Game Loop Variables
    let lastTime = performance.now();
    let animationFrameId = null;
    let isRunning = false;
    
    // Shared Spawner for Synchronization
    let sharedSpawnTimer = 0;
    let baseSpawnRate = 1.5; // Starting rate
    let sharedSpawnRate = baseSpawnRate;
    let startTime = 0;

    function gameLoop(currentTime) {
        if (!isRunning) return;

        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        // Cap deltaTime to prevent huge jumps if tab was inactive
        const dt = Math.min(deltaTime, 50);

        manualSim.update(dt);
        aiSim.update(dt);

        // SYNCED SPAWNING
        sharedSpawnTimer += (dt / 1000);
        if (sharedSpawnTimer >= sharedSpawnRate) {
            sharedSpawnTimer = 0;
            
            const lanes = ['N', 'S', 'E', 'W'];
            const randomLane = lanes[Math.floor(Math.random() * lanes.length)];
            const isEmergency = Math.random() < 0.05;

            // Spawn in BOTH simulations at once
            manualSim.forceSpawn(randomLane, isEmergency);
            aiSim.forceSpawn(randomLane, isEmergency);

            // STRESS TEST SCALING: Gradually decrease the interval
            // Every vehicle spawned makes the next one arrive slightly faster
            const elapsedTime = (currentTime - startTime) / 1000;
            const difficultyScale = Math.max(0.4, baseSpawnRate - (elapsedTime / 60)); // Min 0.4s interval
            sharedSpawnRate = (0.5 * difficultyScale) + (Math.random() * difficultyScale);
        }

        manualSim.draw();
        aiSim.draw();

        updateComparisonUI();
        checkFailureState();

        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function checkFailureState() {
        const manualMetrics = manualSim.intersection.getMetrics();
        const aiMetrics = aiSim.intersection.getMetrics();

        if (manualMetrics.isGridlocked || aiMetrics.isGridlocked) {
            isRunning = false;
            cancelAnimationFrame(animationFrameId);
            showResults(manualMetrics.isGridlocked ? 'MANUAL' : 'AI');
        }
    }

    function showResults(failedSystem) {
        const resultsOverlay = document.getElementById('results-overlay');
        const resultsTitle = document.getElementById('results-title');
        const resultsDetails = document.getElementById('results-details');

        if (resultsOverlay) {
            resultsOverlay.style.display = 'flex';
            setTimeout(() => resultsOverlay.style.opacity = '1', 10);
            
            const m = manualSim.intersection.getMetrics();
            const a = aiSim.intersection.getMetrics();
            const efficiency = (parseFloat(m.avgWaitTime) / Math.max(0.1, parseFloat(a.avgWaitTime))).toFixed(1);

            resultsTitle.textContent = failedSystem === 'MANUAL' ? 'MANUAL SYSTEM GRIDLOCK' : 'AI SYSTEM GRIDLOCK';
            resultsDetails.innerHTML = `
                <p>TOTAL VOLUME PROCESSED: ${m.passed + a.passed}</p>
                <p>AI EFFICIENCY GAP: <strong>${efficiency}x BETTER</strong></p>
                <p>FINAL AI WAIT: ${a.avgWaitTime}s | MANUAL WAIT: ${m.avgWaitTime}s</p>
            `;
        }
    }

    function updateComparisonUI() {
        const manualMetrics = manualSim.intersection.getMetrics();
        const aiMetrics = aiSim.intersection.getMetrics();
        
        const manualWait = parseFloat(manualMetrics.avgWaitTime);
        const aiWait = parseFloat(aiMetrics.avgWaitTime);
        const deltaEl = document.getElementById('efficiency-delta');
        
        if (deltaEl) {
            if (manualWait === 0) {
                deltaEl.textContent = "AI SYSTEM SYNCED";
                deltaEl.classList.remove('better');
            } else {
                const improvement = ((manualWait - aiWait) / manualWait * 100).toFixed(0);
                if (improvement > 0) {
                    deltaEl.textContent = `AI SYSTEM EFFICIENCY: +${improvement}%`;
                    deltaEl.classList.add('better');
                } else {
                    deltaEl.textContent = `AI SYSTEM SYNCED`;
                    deltaEl.classList.remove('better');
                }
            }
        }
    }

    // Controls
    const btnHomeStart = document.getElementById('btn-home-start');
    const homeScreen = document.getElementById('home-screen');
    const btnManualSwitch = document.getElementById('btn-manual-switch');
    
    btnManualSwitch.addEventListener('click', () => {
        if (isRunning && manualSim.controller && typeof manualSim.controller.switchSignal === 'function') {
            manualSim.controller.switchSignal();
        }
    });
    
    btnHomeStart.addEventListener('click', () => {
        if (systemStatus) {
            systemStatus.textContent = 'SYSTEM ONLINE - PROTOCOL INITIATED';
            systemStatus.style.color = 'var(--primary)';
        }
        
        setTimeout(() => {
            homeScreen.style.opacity = '0';
            setTimeout(() => {
                homeScreen.style.display = 'none';
                btnStart.click(); // Automatically trigger start
            }, 500);
        }, 600);
    });

    btnExit.addEventListener('click', () => {
        // Reset Simulation
        btnReset.click();
        
        // Show Home Screen
        homeScreen.style.display = 'flex';
        // Delay needed for opacity transition
        setTimeout(() => {
            homeScreen.style.opacity = '1';
        }, 10);
        
        // Reset status
        if (systemStatus) {
            systemStatus.textContent = 'SYSTEM OFFLINE';
            systemStatus.style.color = 'var(--danger)';
        }
    });

    btnStart.addEventListener('click', () => {
        if (!isRunning) {
            isRunning = true;
            lastTime = performance.now();
            startTime = lastTime; // Set start time for scaling
            manualSim.start();
            aiSim.start();
            
            // Hide results if visible
            const resultsOverlay = document.getElementById('results-overlay');
            if (resultsOverlay) {
                resultsOverlay.style.opacity = '0';
                setTimeout(() => resultsOverlay.style.display = 'none', 500);
            }
            
            // Initial Draw to make sure it looks good before first update
            manualSim.draw();
            aiSim.draw();

            gameLoop(lastTime);
        }
    });

    btnPause.addEventListener('click', () => {
        if (isRunning) {
            isRunning = false;
            manualSim.pause();
            aiSim.pause();
            cancelAnimationFrame(animationFrameId);
        }
    });

    btnReset.addEventListener('click', () => {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
        
        manualSim.reset();
        aiSim.reset();
        
        // Redraw initial state
        manualSim.draw();
        aiSim.draw();
    });

    // Initial draw
    manualSim.draw();
    aiSim.draw();
});
