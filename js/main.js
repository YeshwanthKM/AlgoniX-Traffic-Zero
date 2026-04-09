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
    let sharedSpawnRate = 1.2;

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

            // Randomize next interval
            sharedSpawnRate = 0.5 + Math.random() * 1.5;
        }

        manualSim.draw();
        aiSim.draw();

        updateComparisonUI();

        animationFrameId = requestAnimationFrame(gameLoop);
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
            manualSim.start();
            aiSim.start();
            
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
