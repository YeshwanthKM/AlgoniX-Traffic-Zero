class Intersection {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.cx = width / 2;
        this.cy = height / 2;
        this.laneWidth = 60; // Wider lanes for better visibility
        this.intersectionSize = this.laneWidth * 2;
        
        // Lists of vehicles per lane approaching intersection
        this.lanes = {
            'N': [], // moving South
            'S': [], // moving North
            'E': [], // moving West
            'W': []  // moving East
        };
        
        // Stats
        this.totalPassed = 0;
        this.totalWaitTime = 0;

        // Current Signal State: 'NS' or 'EW' 
        this.activeSignal = 'NS'; 
        this.isAI = false; // Will be set by controller/sim
    }

    spawnVehicle(targetLane = null, isEmergency = null) {
        // Randomly pick a lane if not specified
        const laneKeys = ['N', 'S', 'E', 'W'];
        const randomLane = targetLane || laneKeys[Math.floor(Math.random() * laneKeys.length)];
        
        // Safety check: Don't spawn if another car is still at the spawn point
        const laneVehicles = this.lanes[randomLane];
        if (laneVehicles.length > 0) {
            const lastVehicle = laneVehicles[laneVehicles.length - 1];
            // Check distance from spawn center
            const spawnDistance = Math.max(this.width, this.height) / 2 + 50;
            let distFromSpawn = 0;
            if (randomLane === 'N') distFromSpawn = lastVehicle.y - (this.cy - spawnDistance);
            if (randomLane === 'S') distFromSpawn = (this.cy + spawnDistance) - lastVehicle.y;
            if (randomLane === 'E') distFromSpawn = (this.cx + spawnDistance) - lastVehicle.x;
            if (randomLane === 'W') distFromSpawn = lastVehicle.x - (this.cx - spawnDistance);
            
            if (distFromSpawn < 80) return null; // Too crowded at spawn point
        }

        // 5% chance of emergency vehicle if not specified
        const emergencyFlag = isEmergency !== null ? isEmergency : Math.random() < 0.05;
        
        const v = new Vehicle(randomLane, emergencyFlag, this.isAI);
        v.initPosition(this.width, this.height, this.laneWidth);
        
        this.lanes[randomLane].push(v);
        return v;
    }

    update(deltaTime) {
        // Stop lines for each lane (distance from center)
        const stopLine = this.intersectionSize / 2 + 20; // increased from 10 for better visual safety

        // Update all vehicles in all lanes
        for (let lane in this.lanes) {
            let vehicles = this.lanes[lane];
            let isLaneGreen = false;

            if (this.activeSignal === 'NS' && (lane === 'N' || lane === 'S')) isLaneGreen = true;
            if (this.activeSignal === 'EW' && (lane === 'E' || lane === 'W')) isLaneGreen = true;

            for (let i = 0; i < vehicles.length; i++) {
                let v = vehicles[i];
                let distanceToObstacle = Infinity;

                // 1. Check distance to vehicle ahead
                if (i > 0) {
                    let vAhead = vehicles[i - 1];
                    // Distance calculation depends on lane direction
                    if (lane === 'N') distanceToObstacle = (vAhead.y - vAhead.length/2) - (v.y + v.length/2);
                    if (lane === 'S') distanceToObstacle = (v.y - v.length/2) - (vAhead.y + vAhead.length/2);
                    if (lane === 'E') distanceToObstacle = (v.x - v.length/2) - (vAhead.x + vAhead.length/2);
                    if (lane === 'W') distanceToObstacle = (vAhead.x - vAhead.length/2) - (v.x + v.length/2);
                }

                // 2. Check distance to stop line 
                // A vehicle must stop if:
                // a) The light is RED
                // b) OR a vehicle from a perpendicular lane is currently inside the intersection center
                
                const perpendicularLanes = (lane === 'N' || lane === 'S') ? ['E', 'W'] : ['N', 'S'];
                let isIntersectionBlocked = false;
                // AI is more lenient (tighter safety margin) to look more efficient
                const centerBoxMargin = this.isAI ? -5 : 5; 
                
                for (let pLane of perpendicularLanes) {
                    for (let otherV of this.lanes[pLane]) {
                        // Check if other vehicle is spatially inside the center square
                        const halfSize = (this.intersectionSize / 2) + centerBoxMargin;
                        const inBoxX = otherV.x > this.cx - halfSize && otherV.x < this.cx + halfSize;
                        const inBoxY = otherV.y > this.cy - halfSize && otherV.y < this.cy + halfSize;
                        
                        if (inBoxX && inBoxY) {
                            isIntersectionBlocked = true;
                            break;
                        }
                    }
                    if (isIntersectionBlocked) break;
                }

                if ((!isLaneGreen || isIntersectionBlocked) && !v.hasPassed) {
                    let distToStopLine = Infinity;
                    if (lane === 'N') distToStopLine = (this.cy - stopLine) - (v.y + v.length/2);
                    if (lane === 'S') distToStopLine = (v.y - v.length/2) - (this.cy + stopLine);
                    if (lane === 'E') distToStopLine = (v.x - v.length/2) - (this.cx + stopLine);
                    if (lane === 'W') distToStopLine = (this.cx - stopLine) - (v.x + v.length/2);

                    // If it's positive, it means vehicle is approaching the line. If it's negative, it has passed
                    if (distToStopLine > 0 && distToStopLine < distanceToObstacle) {
                        distanceToObstacle = distToStopLine;
                    }
                }

                v.update(deltaTime, distanceToObstacle);

                // Check passing threshold
                let passedCenter = false;
                if (lane === 'N' && v.y > this.cy) passedCenter = true;
                if (lane === 'S' && v.y < this.cy) passedCenter = true;
                if (lane === 'E' && v.x < this.cx) passedCenter = true;
                if (lane === 'W' && v.x > this.cx) passedCenter = true;

                if (passedCenter && !v.hasPassed) {
                    v.hasPassed = true;
                    this.totalPassed++;
                    this.totalWaitTime += v.waitingTime;
                }
            }

            // Cleanup vehicles that have driven off-screen
            this.lanes[lane] = vehicles.filter(v => {
                const margin = 300;
                return (
                    v.x > -margin && 
                    v.x < this.width + margin && 
                    v.y > -margin && 
                    v.y < this.height + margin
                );
            });
        }
    }

    draw(ctx) {
        // Background
        ctx.fillStyle = '#050510'; // extremely dark blue/black
        ctx.fillRect(0, 0, this.width, this.height);

        // Neon grid lines (Cyberpunk feel)
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
        ctx.lineWidth = 1;
        for(let i=0; i<this.width; i+=25) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, this.height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(this.width, i); ctx.stroke();
        }

        // Road outlines
        ctx.shadowColor = '#bd00ff';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#bd00ff'; // Purple neon
        ctx.lineWidth = 2;
        
        const halfInt = this.intersectionSize / 2;

        ctx.beginPath();
        // Top left inner corner
        ctx.moveTo(0, this.cy - halfInt);
        ctx.lineTo(this.cx - halfInt, this.cy - halfInt);
        ctx.lineTo(this.cx - halfInt, 0);
        
        // Top right inner corner
        ctx.moveTo(this.cx + halfInt, 0);
        ctx.lineTo(this.cx + halfInt, this.cy - halfInt);
        ctx.lineTo(this.width, this.cy - halfInt);

        // Bottom right inner corner
        ctx.moveTo(this.width, this.cy + halfInt);
        ctx.lineTo(this.cx + halfInt, this.cy + halfInt);
        ctx.lineTo(this.cx + halfInt, this.height);

        // Bottom left inner corner
        ctx.moveTo(this.cx - halfInt, this.height);
        ctx.lineTo(this.cx - halfInt, this.cy + halfInt);
        ctx.lineTo(0, this.cy + halfInt);
        ctx.stroke();

        ctx.shadowBlur = 0; // reset

        // Center lines
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.5)'; // Cyan dashed
        ctx.lineWidth = 2;
        ctx.setLineDash([15, 15]);

        // N/S center line
        ctx.beginPath();
        ctx.moveTo(this.cx, 0);
        ctx.lineTo(this.cx, this.cy - halfInt);
        ctx.moveTo(this.cx, this.cy + halfInt);
        ctx.lineTo(this.cx, this.height);
        ctx.stroke();

        // E/W center line
        ctx.beginPath();
        ctx.moveTo(0, this.cy);
        ctx.lineTo(this.cx - halfInt, this.cy);
        ctx.moveTo(this.cx + halfInt, this.cy);
        ctx.lineTo(this.width, this.cy);
        ctx.stroke();

        ctx.setLineDash([]);

        // Stop Lines and Traffic Lights
        this.drawStopLine(ctx, this.cx - halfInt, this.cy, halfInt, 'H'); // Eastbound stop
        this.drawTrafficLight(ctx, this.cx - halfInt - 10, this.cy - halfInt - 10, 'W');

        this.drawStopLine(ctx, this.cx + halfInt, this.cy - halfInt, halfInt, 'H'); // Westbound stop
        this.drawTrafficLight(ctx, this.cx + halfInt + 10, this.cy + halfInt + 10, 'E');

        this.drawStopLine(ctx, this.cx, this.cy + halfInt, halfInt, 'V'); // Northbound stop
        this.drawTrafficLight(ctx, this.cx + halfInt + 10, this.cy + halfInt - 10, 'S'); // Northbound light

        this.drawStopLine(ctx, this.cx - halfInt, this.cy - halfInt, halfInt, 'V'); // Southbound stop
        this.drawTrafficLight(ctx, this.cx - halfInt - 10, this.cy - halfInt + 10, 'N');


        // Draw all vehicles
        for (let lane in this.lanes) {
            this.lanes[lane].forEach(v => v.draw(ctx));
        }
    }

    drawStopLine(ctx, x, y, size, orientation) {
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#00f3ff'; // cyan glowing stop line
        if (orientation === 'H') {
            ctx.fillRect(x - 2, y, 4, size);
        } else {
            ctx.fillRect(x, y - 2, size, 4);
        }
        ctx.shadowBlur = 0;
    }

    drawTrafficLight(ctx, x, y, direction) {
        let isGreen = false;
        if (this.activeSignal === 'NS' && (direction === 'N' || direction === 'S')) isGreen = true;
        if (this.activeSignal === 'EW' && (direction === 'E' || direction === 'W')) isGreen = true;

        ctx.fillStyle = '#050510';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isGreen ? '#39ff14' : '#ff0055'; // neon green / neon pink
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
    }

    getMetrics() {
        const avgWaitTime = this.totalPassed > 0 ? (this.totalWaitTime / this.totalPassed).toFixed(1) : "0.0";
        return {
            passed: this.totalPassed,
            avgWaitTime: avgWaitTime,
            isGridlocked: this.checkGridlock()
        };
    }

    checkGridlock() {
        // Condition 1: Too many vehicles in a single lane
        for (let lane in this.lanes) {
            if (this.lanes[lane].length >= 15) return true;
            
            // Condition 2: Vehicle is stuck at the spawn point (upstream backup)
            const vehicles = this.lanes[lane];
            if (vehicles.length > 5) {
                const lastV = vehicles[vehicles.length - 1];
                const spawnDistance = Math.max(this.width, this.height) / 2 + 50;
                let distFromSpawn = 0;
                if (lane === 'N') distFromSpawn = lastV.y - (this.cy - spawnDistance);
                if (lane === 'S') distFromSpawn = (this.cy + spawnDistance) - lastV.y;
                if (lane === 'E') distFromSpawn = (this.cx + spawnDistance) - lastV.x;
                if (lane === 'W') distFromSpawn = lastV.x - (this.cx - spawnDistance);

                // If the newest car can't move away from spawn point, it's a gridlock
                if (distFromSpawn < 30 && lastV.speed < 0.1) return true;
            }
        }
        return false;
    }
}
