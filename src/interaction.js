export class Interaction {
    constructor(game, grid) {
        this.game = game;
        this.grid = grid;
        this.canvas = game.canvas;
        
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragCurrent = { x: 0, y: 0 };
        this.dragTile = null;
        this.adjacentTile = null;
        this.dragDirection = null; // 'h' or 'v'
        
        this.init();
    }

    init() {
        this.canvas.addEventListener('mousedown', (e) => this.onStart(e.clientX, e.clientY));
        this.canvas.addEventListener('mousemove', (e) => this.onMove(e.clientX, e.clientY));
        this.canvas.addEventListener('mouseup', () => this.onEnd());
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.onStart(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.onMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });
        this.canvas.addEventListener('touchend', () => this.onEnd());
    }

    onStart(x, y) {
        if (this.game.state !== 'playing' || this.grid.isAnimating) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = x - rect.left - this.grid.offsetX;
        const mouseY = y - rect.top - this.grid.offsetY;
        
        const c = Math.floor(mouseX / this.grid.tileSize);
        const r = Math.floor(mouseY / this.grid.tileSize);
        
        if (r >= 0 && r < this.grid.rows && c >= 0 && c < this.grid.cols) {
            this.isDragging = true;
            this.dragStart = { x, y };
            this.dragTile = this.grid.tiles[r][c];
            this.dragDirection = null;
        }
    }

    onMove(x, y) {
        if (!this.isDragging || !this.dragTile) return;
        
        const dx = x - this.dragStart.x;
        const dy = y - this.dragStart.y;
        const threshold = 10;
        
        if (!this.dragDirection) {
            if (Math.abs(dx) > threshold) {
                this.dragDirection = 'h';
                this.game.audio.playWhoosh();
            } else if (Math.abs(dy) > threshold) {
                this.dragDirection = 'v';
                this.game.audio.playWhoosh();
            }
            return;
        }
        
        // Reset offsets
        if (this.adjacentTile) {
            this.adjacentTile.dragOffset = { x: 0, y: 0 };
        }
        
        const limit = this.grid.tileSize;
        let offset = 0;
        let adjR = this.dragTile.r;
        let adjC = this.dragTile.c;
        
        if (this.dragDirection === 'h') {
            offset = Math.max(-limit, Math.min(limit, dx));
            this.dragTile.dragOffset = { x: offset, y: 0 };
            adjC += offset > 0 ? 1 : -1;
        } else {
            offset = Math.max(-limit, Math.min(limit, dy));
            this.dragTile.dragOffset = { x: 0, y: offset };
            adjR += offset > 0 ? 1 : -1;
        }
        
        // Check bounds and get adjacent tile
        if (adjR >= 0 && adjR < this.grid.rows && adjC >= 0 && adjC < this.grid.cols) {
            this.adjacentTile = this.grid.tiles[adjR][adjC];
            if (this.adjacentTile) {
                // "Magnetic" effect: adjacent tile moves in opposite direction
                if (this.dragDirection === 'h') {
                    this.adjacentTile.dragOffset = { x: -offset, y: 0 };
                } else {
                    this.adjacentTile.dragOffset = { x: 0, y: -offset };
                }
            }
        } else {
            this.adjacentTile = null;
        }
    }

    onEnd() {
        if (!this.isDragging || !this.dragTile) return;
        
        const dx = this.dragTile.dragOffset.x;
        const dy = this.dragTile.dragOffset.y;
        const threshold = this.grid.tileSize * 0.4;
        
        if (this.adjacentTile && (Math.abs(dx) > threshold || Math.abs(dy) > threshold)) {
            this.swapTiles(this.dragTile, this.adjacentTile);
        } else {
            // Snap back
            this.dragTile.dragOffset = { x: 0, y: 0 };
            if (this.adjacentTile) this.adjacentTile.dragOffset = { x: 0, y: 0 };
        }
        
        this.isDragging = false;
        this.dragTile = null;
        this.adjacentTile = null;
    }

    swapTiles(t1, t2) {
        const r1 = t1.r, c1 = t1.c;
        const r2 = t2.r, c2 = t2.c;
        
        // Swap in grid array
        this.grid.tiles[r1][c1] = t2;
        this.grid.tiles[r2][c2] = t1;
        
        // Update properties
        t1.r = r2; t1.c = c2;
        t2.r = r1; t2.c = c1;
        
        t1.targetX = t1.c * this.grid.tileSize;
        t1.targetY = t1.r * this.grid.tileSize;
        t2.targetX = t2.c * this.grid.tileSize;
        t2.targetY = t2.r * this.grid.tileSize;
        
        t1.dragOffset = { x: 0, y: 0 };
        t2.dragOffset = { x: 0, y: 0 };
        
        this.grid.isAnimating = true;
        
        // Check for matches
        setTimeout(() => {
            const m1 = this.grid.getMatchAt(r1, c1);
            const m2 = this.grid.getMatchAt(r2, c2);
            
            if (m1.length >= 3 || m2.length >= 3) {
                this.grid.needsMatchCheck = true;
                this.game.useMove();
            } else {
                // Swap back if no match
                this.swapTilesBack(t1, t2);
            }
        }, 100);
    }

    swapTilesBack(t1, t2) {
        const r1 = t1.r, c1 = t1.c;
        const r2 = t2.r, c2 = t2.c;
        
        this.grid.tiles[r1][c1] = t2;
        this.grid.tiles[r2][c2] = t1;
        
        t1.r = r2; t1.c = c2;
        t2.r = r1; t2.c = c1;
        
        t1.targetX = t1.c * this.grid.tileSize;
        t1.targetY = t1.r * this.grid.tileSize;
        t2.targetX = t2.c * this.grid.tileSize;
        t2.targetY = t2.r * this.grid.tileSize;
    }
}
