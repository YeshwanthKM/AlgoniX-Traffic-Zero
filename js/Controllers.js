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
        this.minGreenTime = 0.5; // Grandmaster level: nearly zero latency
        this.maxGreenTime = 12; 
        this.evaluationInterval = 0.05; // 20 times per second
        
        this.greenTimer = 0;
        this.evalTimer = 0;
    }

    calculateClusterPriority(clusterLines) {
        let count = 0;
        let waitTimeScore = 0;
        let approachingCount = 0;
        let hasEmergency = false;
        
        const detectionRange = 350; // See further ahead for better clustering
        const { cx, cy } = this.intersection;

        clusterLines.forEach(lane => {
            const vehicles = this.intersection.lanes[lane];
            vehicles.forEach(v => {
                if (v.hasPassed) return;

                // Check distance to intersection center
                let distToCenter = Infinity;
                if (lane === 'N') distToCenter = cy - v.y;
                if (lane === 'S') distToCenter = v.y - cy;
                if (lane === 'E') distToCenter = v.x - cx;
                if (lane === 'W') distToCenter = cx - v.x;

                // If within detection range AND moving towards center
                if (distToCenter > 0 && distToCenter < detectionRange) {
                    count++;
                    if (v.speed < 0.5) {
                        // Exponential weight for wait time to prevent starvation
                        waitTimeScore += Math.pow(v.waitingTime + 1, 1.5);
                    } else {
                        approachingCount++;
                    }
                    if (v.isEmergency) hasEmergency = true;
                }
            });
        });

        // Priority formula: waitTime + current volume + bonus for moving clusters
        let priority = count + waitTimeScore + (approachingCount * 0.5);
        
        if (hasEmergency) {
            priority += 10000;
        }

        return { priority, count, approachingCount, hasEmergency };
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
            const currentApproaching = currentAxis === 'NS' ? nsStats.approachingCount : ewStats.approachingCount;
            const oppositePriority = currentAxis === 'NS' ? ewStats.priority : nsStats.priority;

            // STRATEGY 1: Empty Lane Early Switch
            // If current green has no approaching traffic and opposite has waiting traffic, switch immediately
            if (currentApproaching === 0 && oppositePriority > 1 && this.greenTimer > 0.5) {
                this.switchSignal(currentAxis === 'NS' ? 'EW' : 'NS');
                return;
            }

            // Enforce minimum green time for stability unless lane is empty
            if (this.greenTimer < this.minGreenTime) return;

            // STRATEGY 2: Throughput Optimization
            // If opposite priority is higher, switch to clear the backlog
            if (this.greenTimer >= this.maxGreenTime || oppositePriority > currentPriority * 1.05) {
                if (oppositePriority > 0) {
                    this.switchSignal(currentAxis === 'NS' ? 'EW' : 'NS');
                }
            }
        }
    }

    switchSignal(newSignal) {
        this.intersection.activeSignal = newSignal;
        this.greenTimer = 0;
    }
}
