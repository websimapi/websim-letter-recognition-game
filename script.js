const characterDisplay = document.getElementById('character');
const statusDisplay = document.getElementById('status');
const startBtn = document.getElementById('start-btn');
const transcriptDisplay = document.getElementById('transcript-display');
const body = document.body;
const levelDisplay = document.getElementById('level');
const expCounterDisplay = document.getElementById('exp-counter');
const progressBar = document.getElementById('progress-bar');
const animationContainer = document.getElementById('animation-container');
const progressBarWrapper = document.getElementById('progress-bar-wrapper');

const characters = ['B', 'b', 'D', 'd', 'S', 's', 'Z', 'z', '2', '3', 'P', 'p', 'q'];
const correctAnswers = {
    'B': ['uppercase b', 'upper case b', 'capital b'],
    'b': ['lowercase b', 'lower case b'],
    'D': ['uppercase d', 'upper case d', 'capital d'],
    'd': ['lowercase d', 'lower case d'],
    'S': ['uppercase s', 'upper case s', 'capital s'],
    's': ['lowercase s', 'lower case s'],
    'Z': ['uppercase z', 'upper case z', 'capital z', 'uppercase c', 'upper case c', 'capital c'],
    'z': ['lowercase z', 'lower case z', 'lowercase c', 'lower case c'],
    '2': ['two', '2'],
    '3': ['three', '3'],
    'P': ['uppercase p', 'upper case p', 'capital p'],
    'p': ['lowercase p', 'lower case p'],
    'q': ['lowercase q', 'lower case q', 'q'],
};

// Physics engine
let engine;
let world;
const gemBodies = [];
const gemElements = [];
let ground;

function setupPhysics() {
    engine = Matter.Engine.create({
        gravity: { y: 0.6 } // A bit lighter gravity
    });
    world = engine.world;

    const gameContainerRect = document.getElementById('game-container').getBoundingClientRect();
    const progressContainerRect = document.getElementById('progress-container').getBoundingClientRect();
    const groundY = progressContainerRect.top;

    // Walls
    const wallOptions = { isStatic: true, render: { visible: false } };
    ground = Matter.Bodies.rectangle(window.innerWidth / 2, groundY, window.innerWidth, 20, wallOptions);
    const wallLeft = Matter.Bodies.rectangle(0, window.innerHeight / 2, 20, window.innerHeight, wallOptions);
    const wallRight = Matter.Bodies.rectangle(window.innerWidth, window.innerHeight / 2, 20, window.innerHeight, wallOptions);
    const ceiling = Matter.Bodies.rectangle(window.innerWidth / 2, 0, window.innerWidth, 20, wallOptions);
    Matter.World.add(world, [ground, wallLeft, wallRight, ceiling]);

    // Run the engine
    Matter.Engine.run(engine);

    // Collision detection
    Matter.Events.on(engine, 'collisionStart', (event) => {
        const pairs = event.pairs;
        pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;
            let gemBody = null;
            if (bodyA === ground && bodyB.label === 'gem') {
                gemBody = bodyB;
            } else if (bodyB === ground && bodyA.label === 'gem') {
                gemBody = bodyA;
            }

            if (gemBody) {
                // Find the gem and its element
                const index = gemBodies.indexOf(gemBody);
                if (index !== -1) {
                    const element = gemElements[index];

                    // Remove from physics world
                    Matter.World.remove(world, gemBody);

                    // Remove from our tracking arrays
                    gemBodies.splice(index, 1);
                    gemElements.splice(index, 1);

                    // Animate and remove element
                    element.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                    element.style.opacity = '0';
                    element.style.transform += ' scale(0.5)';
                    setTimeout(() => element.remove(), 300);

                    // Add experience and update UI for this one gem
                    currentExp += 1;
                    updateProgressUI();
                    if (currentExp >= expToNextLevel) {
                        levelUp();
                    }
                }
            }
        });
    });

    // Start render loop
    (function render() {
        gemBodies.forEach((body, index) => {
            const element = gemElements[index];
            element.style.transform = `translate(${body.position.x}px, ${body.position.y}px) rotate(${body.angle}rad)`;
        });
        requestAnimationFrame(render);
    })();
}

let currentCharacter = '';
let gameRunning = false;
let isCelebrating = false;
let audioContext;
let successSoundBuffer;

// Game state
let level = 1;
let currentExp = 0;
let expToNextLevel = 81;
let answerStartTime = 0;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        if (!gameRunning || isCelebrating) return;
        
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.trim().toLowerCase();
        transcriptDisplay.textContent = `You said: "${transcript}"`;
        checkAnswer(transcript);
    };

    recognition.onerror = (event) => {
        statusDisplay.textContent = `Speech recognition error: ${event.error}. Try again.`;
    };

    recognition.onend = () => {
        if (gameRunning) {
            recognition.start(); // Keep listening if the game is supposed to be running
        }
    };
} else {
    statusDisplay.textContent = "Sorry, your browser doesn't support Speech Recognition.";
    startBtn.disabled = true;
}

async function setupAudio() {
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const response = await fetch('party-noise.mp3');
        const arrayBuffer = await response.arrayBuffer();
        successSoundBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.error("Failed to load or decode audio file.", e);
    }
}

function playSuccessSound() {
    if (!audioContext || !successSoundBuffer) return;
    const source = audioContext.createBufferSource();
    source.buffer = successSoundBuffer;
    source.connect(audioContext.destination);
    source.start(0);
}

function showNextCharacter() {
    body.classList.remove('correct-answer');
    
    const randomIndex = Math.floor(Math.random() * characters.length);
    currentCharacter = characters[randomIndex];
    characterDisplay.textContent = currentCharacter;
    statusDisplay.textContent = "Say what you see...";
    transcriptDisplay.textContent = "";
    answerStartTime = Date.now();
}

function checkAnswer(transcript) {
    const possibleAnswers = correctAnswers[currentCharacter] || [];
    if (possibleAnswers.some(answer => transcript.includes(answer))) {
        handleCorrectAnswer();
    }
}

function createFallingGems(count) {
    const charRect = characterDisplay.getBoundingClientRect();
    const startX = charRect.left + charRect.width / 2;
    const startY = charRect.top + charRect.height / 2;

    for (let i = 0; i < count; i++) {
        const gem = document.createElement('div');
        gem.classList.add('falling-gem');
        gem.textContent = '💎';
        document.body.appendChild(gem); // Append to body to be above all other elements

        const angle = Math.random() * Math.PI * 2;
        const force = 0.02 + Math.random() * 0.02; // Increased force for more dynamic burst

        const gemBody = Matter.Bodies.circle(startX, startY, 20, {
            restitution: 0.7, // Bounciness
            friction: 0.1,
            frictionAir: 0.01,
            label: 'gem',
        });

        // Apply a random upward-ish force
        Matter.Body.applyForce(gemBody, gemBody.position, {
            x: Math.cos(angle) * force,
            y: (Math.sin(angle) * force) - 0.03 // Bias upwards
        });

        gemElements.push(gem);
        gemBodies.push(gemBody);
        Matter.World.add(world, gemBody);
    }
}

function handleCorrectAnswer() {
    isCelebrating = true;

    const timeTaken = (Date.now() - answerStartTime) / 1000; // in seconds
    let expGained = 0;
    if (timeTaken < 1) {
        expGained = 5;
    } else if (timeTaken <= 3) {
        expGained = 3;
    } else {
        expGained = 2;
    }
    
    createFallingGems(expGained);
    statusDisplay.textContent = `Correct! +${expGained}💎`;

    body.classList.add('correct-answer');
    playSuccessSound();

    setTimeout(() => {
        isCelebrating = false;
        showNextCharacter();
    }, 3000);
}

function levelUp() {
    level++;
    currentExp -= expToNextLevel; // Carry over extra exp
    expToNextLevel = Math.floor(expToNextLevel * 1.5); // Increase exp for next level
    updateProgressUI();
}

function updateProgressUI() {
    levelDisplay.textContent = level;
    expCounterDisplay.textContent = `${currentExp} / ${expToNextLevel}`;
    const progressPercent = Math.min((currentExp / expToNextLevel) * 100, 100);
    progressBar.style.width = `${progressPercent}%`;
}

startBtn.addEventListener('click', () => {
    if (!gameRunning) {
        setupAudio();
        // Resume audio context on user gesture
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        if (!engine) {
            setupPhysics();
        }
        
        gameRunning = true;
        startBtn.style.display = 'none';
        transcriptDisplay.style.display = 'block';
        showNextCharacter();
        try {
            recognition.start();
        } catch(e) {
            console.error("Recognition already started.", e);
        }
    }
});