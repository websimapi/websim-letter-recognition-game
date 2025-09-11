const characterDisplay = document.getElementById('character');
const statusDisplay = document.getElementById('status');
const startBtn = document.getElementById('start-btn');
const transcriptDisplay = document.getElementById('transcript-display');
const body = document.body;

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
let audioContext;
let successSoundBuffer;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        if (!gameRunning) return;
        
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
}

function checkAnswer(transcript) {
    const possibleAnswers = correctAnswers[currentCharacter] || [];
    if (possibleAnswers.some(answer => transcript.includes(answer))) {
        handleCorrectAnswer();
    }
}

function handleCorrectAnswer() {
    gameRunning = false; // Pause listening during animation
    statusDisplay.textContent = "Correct!";
    body.classList.add('correct-answer');
    playSuccessSound();

    setTimeout(() => {
        gameRunning = true;
        showNextCharacter();
    }, 3000);
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

