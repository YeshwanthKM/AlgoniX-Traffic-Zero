export class ManualController {
    constructor() {
        // 0: North/South Green, 1: East/West Green
        // We will simplify: State 0 = N/S Green, State 1 = N/S Yellow, State 2 = E/W Green, State 3 = E/W Yellow
        this.state = 0; 
        this.timer = 0;
        
        this.greenDuration = 5; // seconds
        this.yellowDuration = 2; // seconds
    }

    update(deltaTime, simulation) {
        this.timer += deltaTime;
        
        let currentDuration = (this.state === 0 || this.state === 2) ? this.greenDuration : this.yellowDuration;
        
        if (this.timer >= currentDuration) {
            this.timer = 0;
            this.state = (this.state + 1) % 4;
        }
    }

    getLightState(lane) {
        // lane 0: N, 1: E, 2: S, 3: W
        if (lane === 0 || lane === 2) {
            if (this.state === 0) return 'Green';
            if (this.state === 1) return 'Yellow';
            return 'Red';
        } else {
            if (this.state === 2) return 'Green';
            if (this.state === 3) return 'Yellow';
            return 'Red';
        }
    }
}

export class AIController {
    constructor() {
        this.state = 0;
        this.timer = 0;
        this.minGreenDuration = 3;
        this.yellowDuration = 2;
        this.explanation = "Starting AI analysis...";
    }

    update(deltaTime, simulation) {
        this.timer += deltaTime;
        
        // If in yellow state, must complete yellow light before switching
        if (this.state === 1 || this.state === 3) {
            if (this.timer >= this.yellowDuration) {
                this.timer = 0;
                this.state = (this.state === 1) ? 2 : 0;
                this.explanation = "Switched to Green based on priority.";
            }
            return;
        }

        // We are in a green state (0 or 2). We evaluate if we should switch.
        if (this.timer >= this.minGreenDuration) {
            // Assess traffic
            let nsScore = this.calculateScore(simulation, [0, 2]);
            let ewScore = this.calculateScore(simulation, [1, 3]);
            
            // Check for emergency vehicles
            let nsEmergency = this.hasEmergency(simulation, [0, 2]);
            let ewEmergency = this.hasEmergency(simulation, [1, 3]);

            if (nsEmergency && this.state !== 0) {
                this.explanation = "Emergency vehicle detected! Forcing N/S Green.";
                this.timer = 0;
                this.state = 3; // Switch to E/W Yellow then N/S Green
                return;
            } else if (ewEmergency && this.state !== 2) {
                this.explanation = "Emergency vehicle detected! Forcing E/W Green.";
                this.timer = 0;
                this.state = 1; // Switch to N/S Yellow then E/W Green
                return;
            }

            if (this.state === 0 && ewScore > nsScore * 1.5) {
                // E/W has much higher priority, switch
                this.explanation = `High congestion E/W. Score: ${Math.round(ewScore)}. Switching light.`;
                this.timer = 0;
                this.state = 1;
            } else if (this.state === 2 && nsScore > ewScore * 1.5) {
                // N/S has much higher priority, switch
                this.explanation = `High congestion N/S. Score: ${Math.round(nsScore)}. Switching light.`;
                this.timer = 0;
                this.state = 3;
            } else if (this.timer >= 10) {
                // Max green time reached, force switch if there is any traffic waiting
                if (this.state === 0 && ewScore > 0) {
                    this.explanation = "Max green duration reached. Switching to E/W to clear queue.";
                    this.timer = 0;
                    this.state = 1;
                } else if (this.state === 2 && nsScore > 0) {
                    this.explanation = "Max green duration reached. Switching to N/S to clear queue.";
                    this.timer = 0;
                    this.state = 3;
                } else {
                    this.explanation = "Maintaining green, low traffic detected.";
                }
            }
        }
    }

    calculateScore(simulation, lanes) {
        let score = 0;
        lanes.forEach(lane => {
            const cars = simulation.cars.filter(c => c.lane === lane && !c.hasPassed);
            score += cars.length * 10; // 10 points per car
            cars.forEach(c => {
                score += c.waitingTime; // 1 point per second waited
            });
        });
        return score;
    }

    hasEmergency(simulation, lanes) {
        return simulation.cars.some(c => lanes.includes(c.lane) && c.isEmergency && !c.hasPassed);
    }

    getLightState(lane) {
        if (lane === 0 || lane === 2) {
            if (this.state === 0) return 'Green';
            if (this.state === 1) return 'Yellow';
            return 'Red';
        } else {
            if (this.state === 2) return 'Green';
            if (this.state === 3) return 'Yellow';
            return 'Red';
        }
    }
}
