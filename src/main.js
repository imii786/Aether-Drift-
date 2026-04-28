import { Grid } from './grid.js';
import { Interaction } from './interaction.js';
import { AudioManager } from './audio.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.pixelRatio = window.devicePixelRatio || 1;

        this.state = 'login'; // login, playing, paused, results
        this.level = 1;
        this.score = 0;
        this.moves = 25;
        this.targetScore = 100;

        this.audio = new AudioManager();
        this.grid = null;
        this.interaction = null;
        
        this.maxLevel = 1;
        this.highScore = 0;
        this.username = 'Explorer';

        this.loadGame();
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // UI Elements
        this.loginPortal = document.getElementById('login-portal');
        this.gameHud = document.getElementById('game-hud');
        this.settingsMenu = document.getElementById('settings-menu');
        this.resultCard = document.getElementById('result-card');

        document.getElementById('start-game').addEventListener('click', () => this.startGame());
        
        const usernameInput = document.getElementById('username');
        usernameInput.value = this.username;
        usernameInput.addEventListener('change', () => {
            this.username = usernameInput.value;
            this.saveGame();
        });

        document.getElementById('settings-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('home-btn').addEventListener('click', () => this.goHome());
        document.getElementById('next-level-btn').addEventListener('click', () => this.nextLevel());
        document.getElementById('retry-btn').addEventListener('click', () => this.restartLevel());

        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth * this.pixelRatio;
        this.canvas.height = window.innerHeight * this.pixelRatio;
        this.ctx.scale(this.pixelRatio, this.pixelRatio);

        if (this.grid) {
            this.grid.resize(window.innerWidth, window.innerHeight);
        }
    }

    startGame() {
        const username = document.getElementById('username').value || 'Explorer';
        console.log(`Starting game for ${username}`);

        this.state = 'playing';
        this.loginPortal.classList.add('hidden');
        this.gameHud.classList.remove('hidden');

        this.score = 0;
        this.level = 1;
        this.setupLevel();

        this.grid = new Grid(this);
        this.interaction = new Interaction(this, this.grid);
        this.audio.init();
    }

    setupLevel() {
        this.moves = Math.max(15, 25 - Math.floor(this.level / 5));
        this.targetScore = 10 * Math.pow(1.5, this.level - 1);
        this.targetScore = Math.floor(this.targetScore / 10) * 10;

        document.getElementById('level-text').innerText = `Level ${this.level}`;
        document.getElementById('target-text').innerText = `Target: ${this.targetScore}`;
        this.updateHUD();
    }

    updateHUD() {
        document.getElementById('score-text').innerText = Math.floor(this.score);
        document.getElementById('moves-text').innerText = this.moves;

        const progress = Math.min(100, (this.score / this.targetScore) * 100);
        document.getElementById('score-progress').style.width = `${progress}%`;
    }

    addScore(points) {
        this.score += points;
        this.updateHUD();

        if (this.score >= this.targetScore) {
            // Level Complete check will happen after animations
        }
    }

    useMove() {
        this.moves--;
        this.updateHUD();
        if (this.moves <= 0 && this.score < this.targetScore) {
            this.showResults(false);
        }
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.settingsMenu.classList.remove('hidden');
        } else if (this.state === 'paused') {
            this.state = 'playing';
            this.settingsMenu.classList.add('hidden');
        }
    }

    goHome() {
        this.state = 'login';
        this.loginPortal.classList.remove('hidden');
        this.gameHud.classList.add('hidden');
        this.settingsMenu.classList.add('hidden');
        this.resultCard.classList.remove('active');
    }

    showResults(success) {
        this.state = 'results';
        this.resultCard.classList.remove('hidden');
        setTimeout(() => this.resultCard.classList.add('active'), 10);

        const title = document.getElementById('result-title');
        const scoreText = document.getElementById('result-score');
        const nextBtn = document.getElementById('next-level-btn');
        const retryBtn = document.getElementById('retry-btn');
        const stars = document.getElementById('star-rating');

        scoreText.innerText = `Score: ${Math.floor(this.score)}`;

        if (success) {
            title.innerText = 'Level Complete!';
            nextBtn.classList.remove('hidden');
            retryBtn.classList.add('hidden');

            // Calculate stars
            const ratio = this.score / this.targetScore;
            let starCount = 1;
            if (ratio >= 2) starCount = 3;
            else if (ratio >= 1.5) starCount = 2;

            stars.innerHTML = '<span>★</span>'.repeat(starCount) + '<span style="opacity:0.2">★</span>'.repeat(3 - starCount);
            
            if (this.level >= this.maxLevel) {
                this.maxLevel = this.level + 1;
            }
            if (this.score > this.highScore) {
                this.highScore = this.score;
            }
            this.saveGame();
        } else {
            title.innerText = 'Out of Moves';
            nextBtn.classList.add('hidden');
            retryBtn.classList.remove('hidden');
            stars.innerHTML = '<span style="opacity:0.2">★★★</span>';
        }
    }

    nextLevel() {
        this.level++;
        this.resultCard.classList.remove('active');
        setTimeout(() => {
            this.resultCard.classList.add('hidden');
            this.setupLevel();
            this.grid.reset();
            this.state = 'playing';
        }, 600);
    }

    restartLevel() {
        this.resultCard.classList.remove('active');
        setTimeout(() => {
            this.resultCard.classList.add('hidden');
            this.setupLevel();
            this.grid.reset();
            this.state = 'playing';
        }, 600);
    }

    saveGame() {
        const data = {
            username: this.username,
            maxLevel: this.maxLevel,
            highScore: this.highScore
        };
        localStorage.setItem('aetherDrift_save', JSON.stringify(data));
    }

    loadGame() {
        const saved = localStorage.getItem('aetherDrift_save');
        if (saved) {
            const data = JSON.parse(saved);
            this.username = data.username || 'Explorer';
            this.maxLevel = data.maxLevel || 1;
            this.highScore = data.highScore || 0;
            this.level = this.maxLevel;
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        if (this.grid) {
            this.grid.update();
            this.grid.draw(this.ctx);
        }

        requestAnimationFrame(() => this.animate());
    }
}

new Game();
