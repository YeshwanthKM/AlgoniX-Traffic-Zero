class TrafficController {
    constructor(intersection, isAI = false) {
        this.intersection = intersection;
        this.isAI = isAI;
        this.timer = 0;
    }

    update(deltaTime) {
        // Base method to be overridden
    }
}

class UserManualController extends TrafficController {
    constructor(intersection) {
        super(intersection, false);
    }

    update(deltaTime) {
        // No automatic timer updates, user controls this via clicks
    }

    switchSignal() {
        // Toggle the signal manually
        const oldSignal = this.intersection.activeSignal;
        this.intersection.activeSignal = oldSignal === 'NS' ? 'EW' : 'NS';
    }
}

class AITrafficController extends TrafficController {
    constructor(intersection) {
        super(intersection, true);
        this.minGreenTime = 3;  // Minimum seconds a light stays green
        this.maxGreenTime = 15; // Max seconds a light stays green
        this.evaluationInterval = 1; // Evaluate every second
        
        this.greenTimer = 0;
        this.evalTimer = 0;
    }

    calculateClusterPriority(clusterLines) {
        let count = 0;
        let waitTime = 0;
        let hasEmergency = false;

        clusterLines.forEach(lane => {
            const vehicles = this.intersection.lanes[lane];
            vehicles.forEach(v => {
                if (!v.hasPassed) {
                    count++;
                    waitTime += v.waitingTime;
                    if (v.isEmergency) hasEmergency = true;
                }
            });
        });

        // Priority formula: waitTime holds more weight to avoid starvation
        let priority = count + (waitTime * 2);
        
        if (hasEmergency) {
            priority += 10000; // Immediate override
        }

        return { priority, count, hasEmergency };
    }

    update(deltaTime) {
        const dtSeconds = deltaTime / 60;
        this.greenTimer += dtSeconds;
        this.evalTimer += dtSeconds;

        // Only evaluate periodically instead of every frame
        if (this.evalTimer >= this.evaluationInterval) {
            this.evalTimer = 0;

            const nsStats = this.calculateClusterPriority(['N', 'S']);
            const ewStats = this.calculateClusterPriority(['E', 'W']);

            // Detect Emergency
            if (nsStats.hasEmergency && this.intersection.activeSignal !== 'NS') {
                this.switchSignal('NS');
                return;
            } else if (ewStats.hasEmergency && this.intersection.activeSignal !== 'EW') {
                this.switchSignal('EW');
                return;
            }

            // Enforce minimum green time
            if (this.greenTimer < this.minGreenTime) return;

            // Determine which axis needs green the most
            const currentAxis = this.intersection.activeSignal;
            const currentPriority = currentAxis === 'NS' ? nsStats.priority : ewStats.priority;
            const oppositePriority = currentAxis === 'NS' ? ewStats.priority : nsStats.priority;

            // If opposite priority is significantly higher, or we reached max green time
            if (this.greenTimer >= this.maxGreenTime) {
                const newAxis = currentAxis === 'NS' ? 'EW' : 'NS';
                this.switchSignal(newAxis);
            } 
            else if (oppositePriority > currentPriority * 1.5 && oppositePriority > 5) {
                // Heuristic: If opposite is 50% more crowded/waiting
                const newAxis = currentAxis === 'NS' ? 'EW' : 'NS';
                this.switchSignal(newAxis);
            }
        }
    }

    switchSignal(newSignal) {
        this.intersection.activeSignal = newSignal;
        this.greenTimer = 0;
    }
}
