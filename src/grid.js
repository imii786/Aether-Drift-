export class Grid {
    constructor(game) {
        this.game = game;
        this.rows = 8;
        this.cols = 8;
        this.tileSize = 60;
        this.padding = 10;
        this.gridWidth = 0;
        this.gridHeight = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        
        this.tiles = [];
        this.particles = [];
        this.ripples = [];
        this.tileTypes = ['blue', 'white', 'cerulean', 'teal', 'indigo'];
        this.images = {};
        
        this.isAnimating = false;
        this.needsMatchCheck = false;
        this.isVortexing = false;
        
        this.loadAssets();
        this.resize(window.innerWidth, window.innerHeight);
        this.initGrid();
    }

    loadAssets() {
        const assets = {
            'blue': 'assets/blue.png',
            'white': 'assets/white.png',
            'cerulean': 'assets/cerulean.png',
            'teal': 'assets/teal.png'
        };

        for (const [key, path] of Object.entries(assets)) {
            const img = new Image();
            img.src = path;
            img.onload = () => {
                this.images[key] = img;
            };
        }
    }

    resize(width, height) {
        const minDim = Math.min(width, height);
        this.tileSize = Math.floor((minDim * 0.8) / this.cols);
        this.gridWidth = this.cols * this.tileSize;
        this.gridHeight = this.rows * this.tileSize;
        this.offsetX = (width - this.gridWidth) / 2;
        this.offsetY = (height - this.gridHeight) / 2;
    }

    initGrid() {
        this.tiles = [];
        for (let r = 0; r < this.rows; r++) {
            this.tiles[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.tiles[r][c] = this.createTile(r, c);
            }
        }
        
        // Ensure no initial matches
        this.resolveInitialMatches();
        
        // Ensure at least 5 valid moves
        if (!this.hasValidMoves(5)) {
            this.initGrid();
        }
    }

    createTile(r, c, type = null) {
        if (!type) {
            type = this.tileTypes[Math.floor(Math.random() * this.tileTypes.length)];
        }
        return {
            r, c,
            x: c * this.tileSize,
            y: r * this.tileSize,
            targetX: c * this.tileSize,
            targetY: r * this.tileSize,
            type,
            special: null, // 'pulse', 'star'
            frost: this.game.level >= 10 && Math.random() < 0.1 ? 2 : 0,
            isRemoving: false,
            scale: 1,
            alpha: 1,
            dragOffset: { x: 0, y: 0 }
        };
    }

    resolveInitialMatches() {
        let hasMatch = true;
        while (hasMatch) {
            hasMatch = false;
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    const match = this.getMatchAt(r, c);
                    if (match.length >= 3) {
                        hasMatch = true;
                        this.tiles[r][c].type = this.tileTypes[(this.tileTypes.indexOf(this.tiles[r][c].type) + 1) % this.tileTypes.length];
                    }
                }
            }
        }
    }

    getMatchAt(r, c) {
        const type = this.tiles[r][c].type;
        const horizontal = this.checkDirection(r, c, 0, 1).concat(this.checkDirection(r, c, 0, -1));
        const vertical = this.checkDirection(r, c, 1, 0).concat(this.checkDirection(r, c, -1, 0));
        
        const hMatch = horizontal.length >= 2 ? [this.tiles[r][c], ...horizontal] : [];
        const vMatch = vertical.length >= 2 ? [this.tiles[r][c], ...vertical] : [];
        
        return [...new Set([...hMatch, ...vMatch])];
    }

    checkDirection(r, c, dr, dc) {
        const type = this.tiles[r][c].type;
        const matched = [];
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.tiles[nr][nc] && this.tiles[nr][nc].type === type && !this.tiles[nr][nc].isRemoving) {
            matched.push(this.tiles[nr][nc]);
            nr += dr;
            nc += dc;
        }
        return matched;
    }

    hasValidMoves(minMoves = 1) {
        // Simple check for potential matches by swapping adjacent tiles
        let moves = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                // Check right
                if (c < this.cols - 1) {
                    if (this.testSwap(r, c, r, c + 1)) moves++;
                }
                // Check down
                if (r < this.rows - 1) {
                    if (this.testSwap(r, c, r + 1, c)) moves++;
                }
                if (moves >= minMoves) return true;
            }
        }
        return moves >= minMoves;
    }

    testSwap(r1, c1, r2, c2) {
        const type1 = this.tiles[r1][c1].type;
        const type2 = this.tiles[r2][c2].type;
        
        this.tiles[r1][c1].type = type2;
        this.tiles[r2][c2].type = type1;
        
        const m1 = this.getMatchAt(r1, c1).length >= 3;
        const m2 = this.getMatchAt(r2, c2).length >= 3;
        
        this.tiles[r1][c1].type = type1;
        this.tiles[r2][c2].type = type2;
        
        return m1 || m2;
    }

    update() {
        this.isAnimating = false;
        const lerpSpeed = 0.15;
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const t = this.tiles[r][c];
                if (!t) continue;
                
                // Animate position
                const dx = t.targetX - t.x;
                const dy = t.targetY - t.y;
                
                if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                    t.x += dx * lerpSpeed;
                    t.y += dy * lerpSpeed;
                    this.isAnimating = true;
                    t.isBouncing = true;
                } else {
                    if (t.isBouncing) {
                        // Small bounce effect when landing
                        t.scale = 1.1;
                        t.isBouncing = false;
                    }
                    t.x = t.targetX;
                    t.y = t.targetY;
                    t.scale += (1 - t.scale) * 0.2;
                }
                
                // Vortex effect
                if (this.isVortexing && t.isVortexing) {
                    const centerX = this.gridWidth / 2;
                    const centerY = this.gridHeight / 2;
                    const dxC = centerX - t.x;
                    const dyC = centerY - t.y;
                    const dist = Math.sqrt(dxC*dxC + dyC*dyC);
                    if (dist > 5) {
                        t.x += dxC * 0.1;
                        t.y += dyC * 0.1;
                        t.scale *= 0.95;
                        t.alpha *= 0.95;
                    }
                }
                
                // Animate removal
                if (t.isRemoving) {
                    t.scale -= 0.1;
                    t.alpha -= 0.1;
                    if (t.scale <= 0) {
                        this.tiles[r][c] = null;
                    }
                    this.isAnimating = true;
                }
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.life -= 0.02;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            } else {
                this.isAnimating = true;
            }
        }

        // Update ripples
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += 10;
            r.alpha -= 0.02;
            if (r.alpha <= 0) {
                this.ripples.splice(i, 1);
            } else {
                this.isAnimating = true;
            }
        }
        
        if (!this.isAnimating && this.needsMatchCheck) {
            this.checkAllMatches();
        }
        
        if (!this.isAnimating && this.hasEmptySpaces()) {
            this.applyGravity();
        }
    }

    hasEmptySpaces() {
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                if (!this.tiles[r][c]) return true;
            }
        }
        return false;
    }

    applyGravity() {
        for (let c = 0; c < this.cols; c++) {
            let emptyCount = 0;
            for (let r = this.rows - 1; r >= 0; r--) {
                if (!this.tiles[r][c]) {
                    emptyCount++;
                } else if (emptyCount > 0) {
                    const t = this.tiles[r][c];
                    this.tiles[r + emptyCount][c] = t;
                    this.tiles[r][c] = null;
                    t.r = r + emptyCount;
                    t.targetY = t.r * this.tileSize;
                }
            }
            
            // Fill new tiles
            for (let i = 0; i < emptyCount; i++) {
                const r = emptyCount - 1 - i;
                const t = this.createTile(r, c);
                t.y = -(i + 1) * this.tileSize; // Start above screen
                this.tiles[r][c] = t;
                this.isAnimating = true;
            }
        }
        this.needsMatchCheck = true;
    }

    checkAllMatches() {
        this.needsMatchCheck = false;
        let matchedSomething = false;
        const toRemove = new Set();
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.tiles[r][c] && !this.tiles[r][c].isRemoving) {
                    const matches = this.getMatchAt(r, c);
                    if (matches.length >= 3) {
                        matches.forEach(m => toRemove.add(m));
                        matchedSomething = true;
                        
                        // Special triggers (to be implemented)
                        if (matches.length === 4) {
                            // Lumina Pulse
                        } else if (matches.length >= 5) {
                            // Aether Comet
                        }
                    }
                }
            }
        }
        
        if (matchedSomething) {
            let multiplier = 1;
            const specialsToTrigger = [];

            toRemove.forEach(t => {
                if (t.frost > 0) {
                    t.frost--;
                    return;
                }
                if (t.special) {
                    specialsToTrigger.push(t);
                }
                t.isRemoving = true;
                this.createParticles(t.x + this.tileSize/2, t.y + this.tileSize/2, t.type);
            });
            
            this.game.audio.playChime();

            // Trigger special effects
            specialsToTrigger.forEach(s => {
                if (s.special === 'pulse') {
                    multiplier *= 2;
                    this.triggerRipple(s.r, s.c);
                } else if (s.special === 'star') {
                    this.triggerCrossClear(s.r, s.c, toRemove);
                }
            });

            // If a match of 4 or 5 was made, create a special tile at one of the match positions
            // For simplicity, we'll pick the first tile in the set that isn't already special
            const matchGroups = this.findMatchGroups();
            matchGroups.forEach(group => {
                if (group.length === 4) {
                    const t = group[0];
                    t.special = 'pulse';
                    t.isRemoving = false; // Don't remove it, transform it
                    t.alpha = 1;
                    t.scale = 1;
                } else if (group.length >= 5) {
                    const t = group[0];
                    t.special = 'star';
                    t.type = 'star'; // Special type for star image
                    t.isRemoving = false;
                    t.alpha = 1;
                    t.scale = 1;
                }
            });

            this.game.addScore(toRemove.size * 10 * multiplier);
            this.isAnimating = true;
        } else {
            // Check if level complete
            if (this.game.score >= this.game.targetScore) {
                this.game.showResults(true);
            } else if (!this.hasValidMoves()) {
                this.vortexReshuffle();
            }
        }
    }

    findMatchGroups() {
        const groups = [];
        const checked = new Set();

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (checked.has(this.tiles[r][c])) continue;
                const match = this.getMatchAt(r, c);
                if (match.length >= 3) {
                    groups.push(match);
                    match.forEach(m => checked.add(m));
                }
            }
        }
        return groups;
    }

    triggerRipple(r, c) {
        this.ripples.push({
            x: c * this.tileSize + this.tileSize / 2,
            y: r * this.tileSize + this.tileSize / 2,
            radius: 0,
            alpha: 1.0
        });
        console.log("Ripple Wave triggered!");
    }

    triggerCrossClear(r, c, toRemove) {
        console.log("Aether Comet triggered!");
        for (let i = 0; i < this.cols; i++) {
            if (this.tiles[r][i]) toRemove.add(this.tiles[r][i]);
        }
        for (let i = 0; i < this.rows; i++) {
            if (this.tiles[i][c]) toRemove.add(this.tiles[i][c]);
        }
    }

    vortexReshuffle() {
        console.log("No moves! Vortex Reshuffle...");
        this.isAnimating = true;
        this.isVortexing = true;
        this.vortexTimer = 0;
        
        // Whirl tiles toward center
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const t = this.tiles[r][c];
                if (t) {
                    t.isVortexing = true;
                }
            }
        }

        setTimeout(() => {
            this.initGrid();
            this.isVortexing = false;
        }, 1000);
    }

    createParticles(x, y, type) {
        const colors = {
            'blue': '#0ea5e9',
            'white': '#ffffff',
            'cerulean': '#38bdf8',
            'teal': '#2dd4bf',
            'indigo': '#6366f1'
        };
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color: colors[type] || '#ffffff'
            });
        }
    }

    reset() {
        this.initGrid();
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        
        // Draw particles
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Draw ripples
        this.ripples.forEach(r => {
            ctx.save();
            ctx.strokeStyle = `rgba(14, 165, 233, ${r.alpha})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });

        // Draw grid background (optional)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.roundRect(-10, -10, this.gridWidth + 20, this.gridHeight + 20, 20);
        ctx.fill();

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const t = this.tiles[r][c];
                if (!t) continue;
                
                ctx.save();
                ctx.translate(t.x + t.dragOffset.x + this.tileSize/2, t.y + t.dragOffset.y + this.tileSize/2);
                ctx.scale(t.scale, t.scale);
                ctx.globalAlpha = t.alpha;
                
                // Draw Sphere
                this.drawSphere(ctx, t);
                
                // Draw Frost
                if (t.frost > 0) {
                    this.drawFrost(ctx, t);
                }
                
                ctx.restore();
            }
        }
        ctx.restore();
    }

    drawSphere(ctx, t) {
        if (t.special === 'pulse') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#0ea5e9';
        } else if (t.special === 'star') {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ffffff';
        }

        if (this.images[t.type]) {
            const size = this.tileSize - this.padding;
            ctx.drawImage(this.images[t.type], -size/2, -size/2, size, size);
            ctx.shadowBlur = 0; // Reset
            return;
        }

        if (t.type === 'star') {
            this.drawStar(ctx);
            ctx.shadowBlur = 0;
            return;
        }

        const colors = {
            'blue': '#0ea5e9',
            'white': '#f8fafc',
            'cerulean': '#38bdf8',
            'teal': '#2dd4bf',
            'indigo': '#6366f1'
        };
        
        const size = (this.tileSize - this.padding) / 2;
        
        // Background Glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        gradient.addColorStop(0, colors[t.type]);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Main Body
        ctx.fillStyle = colors[t.type];
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-size/3, -size/3, size/2, size/4, -Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner Glow
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawStar(ctx) {
        const size = (this.tileSize - this.padding) / 2;
        const spikes = 5;
        const outerRadius = size;
        const innerRadius = size / 2;
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI * i) / spikes;
            ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
        ctx.fill();
    }

    drawFrost(ctx, t) {
        const size = (this.tileSize - this.padding) / 2;
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-size, -size);
        ctx.lineTo(size, size);
        ctx.moveTo(size, -size);
        ctx.lineTo(-size, size);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(186, 230, 253, 0.3)';
        ctx.fillRect(-size, -size, size * 2, size * 2);
    }
}
