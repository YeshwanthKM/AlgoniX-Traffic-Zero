document.addEventListener('DOMContentLoaded', () => {
    
    // UI Elements
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnReset = document.getElementById('btn-reset');

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

    function gameLoop(currentTime) {
        if (!isRunning) return;

        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        // Cap deltaTime to prevent huge jumps if tab was inactive
        const dt = Math.min(deltaTime, 50);

        manualSim.update(dt);
        aiSim.update(dt);

        manualSim.draw();
        aiSim.draw();

        animationFrameId = requestAnimationFrame(gameLoop);
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
        homeScreen.style.opacity = '0';
        setTimeout(() => {
            homeScreen.style.display = 'none';
            btnStart.click(); // Automatically trigger start
        }, 500);
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
