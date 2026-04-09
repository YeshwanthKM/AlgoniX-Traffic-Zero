export default class Car {
    constructor(lane, isEmergency = false) {
        this.lane = lane; // 0: North, 1: East, 2: South, 3: West
        this.isEmergency = isEmergency;
        this.speed = 0;
        this.maxSpeed = isEmergency ? 4 : 2;
        this.acceleration = 0.1;
        this.deceleration = 0.2;
        
        this.length = 30;
        this.width = 16;
        
        this.position = -300; // Starts offscreen, intersection center is 0
        this.spawnTime = Date.now();
        this.waitingTime = 0;
        this.hasPassed = false;
        
        // Visual
        this.color = isEmergency ? '#ef4444' : this.getRandomColor();
    }

    getRandomColor() {
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#facc15', '#f8fafc'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update(deltaTime, stopped, distanceToObstacle) {
        if (!this.hasPassed && this.position > 20) {
            this.hasPassed = true;
        }

        if (this.speed < 0.2 && !this.hasPassed && this.position < 0) {
            this.waitingTime += deltaTime;
        }

        // Logic to stop or move
        // distanceToObstacle is distance to the car in front, or distance to stop line if red light
        
        let targetSpeed = this.maxSpeed;
        
        if (stopped && this.position < -40 && this.position > -300) {
            // Approaching a red light stop line (-40)
            const distToStop = -40 - this.position;
            if (distToStop < 100) {
                targetSpeed = 0;
            }
        }
        
        if (distanceToObstacle !== null && distanceToObstacle < 60) {
            targetSpeed = 0;
        }

        // Apply acceleration/deceleration
        if (this.speed < targetSpeed) {
            this.speed += this.acceleration;
            if (this.speed > targetSpeed) this.speed = targetSpeed;
        } else if (this.speed > targetSpeed) {
            this.speed -= this.deceleration;
            if (this.speed < 0) this.speed = 0;
        }

        this.position += this.speed;
    }
    
    draw(ctx, center) {
        ctx.save();
        ctx.translate(center.x, center.y);
        
        // Rotate based on lane
        // Lane 0: North -> South (moving down, pos Y)
        // Lane 1: East -> West (moving left, neg X)
        // Lane 2: South -> North (moving up, neg Y)
        // Lane 3: West -> East (moving right, pos X)
        
        if (this.lane === 0) {
            ctx.translate(-20, this.position);
        } else if (this.lane === 1) {
            ctx.rotate(Math.PI / 2);
            ctx.translate(-20, -this.position);
        } else if (this.lane === 2) {
            ctx.rotate(Math.PI);
            ctx.translate(-20, -this.position);
        } else if (this.lane === 3) {
            ctx.rotate(-Math.PI / 2);
            ctx.translate(-20, this.position);
        }

        // Draw car body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-this.width/2, -this.length/2, this.width, this.length, 4);
        ctx.fill();

        // Draw headlights/roof if emergency
        if (this.isEmergency) {
            ctx.fillStyle = (Date.now() % 500 < 250) ? '#3b82f6' : '#ef4444'; // Flashing lights
            ctx.fillRect(-6, -this.length/2 + 2, 12, 6);
        } else {
            // Windshield
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-this.width/2 + 2, -this.length/2 + 6, this.width - 4, 8);
        }

        ctx.restore();
    }
}
