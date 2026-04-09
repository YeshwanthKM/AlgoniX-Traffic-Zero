class Vehicle {
    constructor(lane, isEmergency = false) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.lane = lane; // 'N', 'S', 'E', 'W'
        this.isEmergency = isEmergency;
        
        // Dimensions
        this.width = 24;
        this.length = 45;
        
        // Physical properties
        this.maxSpeed = isEmergency ? 4 : 2;
        this.speed = this.maxSpeed;
        this.acceleration = 0.08; // slightly faster acceleration
        this.deceleration = 0.15; // significantly stronger braking
        
        // State
        this.waitingTime = 0;
        this.hasPassed = false;
        
        // Colors
        if (isEmergency) {
            this.color = '#ef4444'; // Red
            this.lightColor = '#3b82f6'; // Flashing blue/red handled in draw
        } else {
            // Random distinct colors for normal cars (avoiding red/green which are lights)
            const colors = ['#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9', '#d946ef', '#ffffff'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        // Initialize position based on lane
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
    }

    initPosition(canvasWidth, canvasHeight, laneWidth) {
        const cx = canvasWidth / 2;
        const cy = canvasHeight / 2;
        
        // Offset from center to right side of the road
        const offset = laneWidth / 2;
        this.laneWidth = laneWidth;

        // Spawn just outside the current screen bounds
        const spawnDistance = Math.max(canvasWidth, canvasHeight) / 2 + 50;

        switch (this.lane) {
            case 'N': // Coming from North, moving South
                this.x = cx - offset; // Left lane
                this.y = cy - spawnDistance;
                this.vy = this.speed;
                break;
            case 'S': // Coming from South, moving North
                this.x = cx + offset; // Right lane
                this.y = cy + spawnDistance;
                this.vy = -this.speed;
                break;
            case 'E': // Coming from East, moving West
                this.x = cx + spawnDistance;
                this.y = cy - offset; // Top lane
                this.vx = -this.speed;
                break;
            case 'W': // Coming from West, moving East
                this.x = cx - spawnDistance;
                this.y = cy + offset; // Bottom lane
                this.vx = this.speed;
                break;
        }
    }

    update(deltaTime, distanceToObstacle) {
        // If distanceToObstacle is small, we must stop
        // distanceToObstacle is distance to the car ahead or the red light stop line
        
        const stopDistance = 15; // increased from 10
        const slowDownDistance = 100; // significantly increased from 60 for better smoothing
        
        let targetSpeed = this.maxSpeed;

        if (distanceToObstacle < stopDistance) {
            targetSpeed = 0;
        } else if (distanceToObstacle < slowDownDistance) {
            targetSpeed = this.maxSpeed * (distanceToObstacle / slowDownDistance);
        }

        // Apply acceleration/deceleration
        if (this.speed < targetSpeed) {
            this.speed += this.acceleration;
            if (this.speed > targetSpeed) this.speed = targetSpeed;
        } else if (this.speed > targetSpeed) {
            this.speed -= this.deceleration;
            if (this.speed < targetSpeed) this.speed = targetSpeed;
        }

        // Update velocity based on direction
        switch (this.lane) {
            case 'N': this.vy = this.speed; break;
            case 'S': this.vy = -this.speed; break;
            case 'E': this.vx = -this.speed; break;
            case 'W': this.vx = this.speed; break;
        }

        // Update position
        // deltaTime is normalized (usually 1 for 60fps)
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Track waiting time (if speed is very low and before intersection)
        if (this.speed < 0.1 && !this.hasPassed) {
            this.waitingTime += (deltaTime / 60); // Roughly in seconds
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Rotate based on direction
        if (this.lane === 'E' || this.lane === 'W') {
            ctx.rotate(Math.PI / 2); // Rotate 90 degrees
        }
        // Vehicles are drawn facing "South" or "East" (default depends on rotation)
        // Since we draw them around origin, rotation makes it consistent

        // Neon Glow
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 0;

        // Main Body (Neon Outline)
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(5, 5, 16, 0.8)'; // dark empty body
        ctx.beginPath();
        // Fallback to standard rect if roundRect is missing
        if (ctx.roundRect) {
            ctx.roundRect(-this.width/2, -this.length/2, this.width, this.length, 3);
        } else {
            ctx.rect(-this.width/2, -this.length/2, this.width, this.length);
        }
        ctx.fill();
        ctx.stroke();

        // Glowing Windshield highlights
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(-this.width/2 + 2, -this.length/4, this.width - 4, this.length/4);
        ctx.globalAlpha = 1.0;

        // Emergency Lights
        if (this.isEmergency) {
            const flash = Math.floor(Date.now() / 150) % 2 === 0;
            ctx.fillStyle = flash ? '#ef4444' : '#3b82f6';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 10;
            ctx.fillRect(-this.width/2 + 2, -this.length/2 + 2, this.width/2 - 2, 4);
            
            ctx.fillStyle = flash ? '#3b82f6' : '#ef4444';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 10;
            ctx.fillRect(0, -this.length/2 + 2, this.width/2 - 2, 4);
        }

        ctx.restore();
    }
}
