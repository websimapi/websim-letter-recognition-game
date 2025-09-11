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

function createFallingGem() {
    const gem = document.createElement('div');
    gem.classList.add('falling-gem');
    gem.textContent = '💎';
    animationContainer.appendChild(gem);

    const charRect = characterDisplay.getBoundingClientRect();
    const containerRect = animationContainer.getBoundingClientRect();
    const barRect = progressBarWrapper.getBoundingClientRect();

    const startX = charRect.left + (charRect.width / 2) - containerRect.left;
    const startY = charRect.top + (charRect.height / 2) - containerRect.top;
    
    // End position should be above the progress bar
    const endY = barRect.top - containerRect.top;

    gem.style.left = `${startX}px`;
    gem.style.top = `${startY}px`;

    // Trigger the animation
    requestAnimationFrame(() => {
        gem.style.transform = `translate(-50%, ${endY - startY}px) scale(0.5)`;
        gem.style.opacity = '0';
    });
    
    return gem;
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
    
    const gem = createFallingGem();

    gem.addEventListener('transitionend', () => {
        gem.remove();
        currentExp += expGained;
        statusDisplay.textContent = `Correct! +${expGained}💎`;
        
        updateProgressUI();
        
        if (currentExp >= expToNextLevel) {
            levelUp();
        }
    }, { once: true });
    

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