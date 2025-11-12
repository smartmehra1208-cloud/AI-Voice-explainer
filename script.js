// Groq API Configuration
const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// DOM Elements
const questionInput = document.getElementById('questionInput');
const getExplanationBtn = document.getElementById('getExplanationBtn');
const generateVoiceBtn = document.getElementById('generateVoiceBtn');
const speakBtn = document.getElementById('speakBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const explanationText = document.getElementById('explanationText');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const loadingIndicator = document.getElementById('loadingIndicator');
const voiceSelect = document.getElementById('voiceSelect');
const speedRange = document.getElementById('speedRange');
const pitchRange = document.getElementById('pitchRange');
const speedValue = document.getElementById('speedValue');
const pitchValue = document.getElementById('pitchValue');
const langButtons = document.querySelectorAll('.lang-btn');
const modelSelect = document.getElementById('modelSelect');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');
const uploadSection = document.getElementById('uploadSection');

// Speech Synthesis
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isSpeaking = false;
let isPaused = false;
let currentExplanation = '';
let currentLanguage = 'en';
let uploadedImage = null;

// Event Listeners
getExplanationBtn.addEventListener('click', getAIExplanation);
generateVoiceBtn.addEventListener('click', generateVoiceExplanation);
speakBtn.addEventListener('click', speakExplanation);
pauseBtn.addEventListener('click', togglePause);
stopBtn.addEventListener('click', stopSpeaking);
clearBtn.addEventListener('click', clearAll);

speedRange.addEventListener('input', updateSpeed);
pitchRange.addEventListener('input', updatePitch);

langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        langButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLanguage = btn.dataset.lang;
        updateUIForLanguage(currentLanguage);
    });
});

// Image Upload Handling
fileInput.addEventListener('change', handleImageUpload);
uploadSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.classList.add('dragover');
});
uploadSection.addEventListener('dragleave', () => {
    uploadSection.classList.remove('dragover');
});
uploadSection.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleImageUpload();
    }
});

// Question input enter key support (Ctrl+Enter)
questionInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        getAIExplanation();
    }
});

// Handle Image Upload
function handleImageUpload() {
    const file = fileInput.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            showError('Image size should be less than 5MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            uploadedImage = e.target.result;
            showSuccess('Image uploaded successfully! Now click "Get AI Explanation"');
        };
        reader.readAsDataURL(file);
    }
}

// Update UI based on selected language
function updateUIForLanguage(lang) {
    if (lang === 'hi') {
        getExplanationBtn.innerHTML = '<i class="fas fa-brain"></i> AI व्याख्या प्राप्त करें';
        clearBtn.innerHTML = '<i class="fas fa-broom"></i> सब साफ करें';
        explanationText.innerHTML = 'अपना प्रश्न ऊपर दर्ज करें या छवि अपलोड करें, फिर "AI व्याख्या प्राप्त करें" पर क्लिक करें';
        showSuccess('हिंदी भाषा चयनित! अब आप हिंदी में प्रश्न पूछ सकते हैं।');
    } else {
        getExplanationBtn.innerHTML = '<i class="fas fa-brain"></i> Get AI Explanation';
        clearBtn.innerHTML = '<i class="fas fa-broom"></i> Clear All';
        explanationText.innerHTML = 'Enter your question above or upload an image, then click "Get AI Explanation" to generate a detailed, easy-to-understand explanation in your chosen language.';
    }
}

// Clean text for speech synthesis - IMPROVED FOR HINDI
function cleanTextForSpeech(text) {
    return text
        // Remove all formatting characters
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#/g, '')
        .replace(/- /g, '')
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        // Remove emojis and special characters
        .replace(/[➡️🌟🚀🧠🎵🔊⏸️⏹️🎙️📊🎵🤖✅❌🔑⚡🇮🇳🇺🇸🇪🇸🇫🇷]/g, '')
        // Clean up multiple spaces and newlines
        .replace(/\n\s*\n/g, '. ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Groq AI API Functions
async function getAIExplanation() {
    let question = questionInput.value.trim();
    
    // If image is uploaded, add note about image
    if (uploadedImage) {
        question = `[Image uploaded] ${question}`;
    }
    
    if (!question && !uploadedImage) {
        showError(currentLanguage === 'hi' ? 'कृपया पहले एक प्रश्न दर्ज करें या छवि अपलोड करें।' : 'Please enter a question or upload an image first.');
        return;
    }

    showLoading(true);
    hideMessages();

    try {
        const explanation = await fetchGroqExplanation(question, currentLanguage, modelSelect.value);
        currentExplanation = explanation;
        
        // Apply Hindi font if language is Hindi
        if (currentLanguage === 'hi') {
            explanationText.innerHTML = explanation;
            explanationText.classList.add('hindi-text');
        } else {
            explanationText.textContent = explanation;
            explanationText.classList.remove('hindi-text');
        }
        
        showSuccess(currentLanguage === 'hi' ? '✅ AI व्याख्या सफलतापूर्वक जेनरेट हो गई!' : '✅ AI explanation generated successfully!');
        generateVoiceBtn.disabled = false;
        generateVoiceBtn.classList.add('btn-primary');
    } catch (error) {
        console.error('Groq API Error:', error);
        showError(`❌ Error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

async function fetchGroqExplanation(question, language = 'en', model = 'llama-3.1-8b-instant') {
    const languagePrompts = {
        'en': {
            system: `You are an expert teacher. Explain concepts in simple, clear language that a student can understand.
            Provide clean, well-structured explanations without using markdown formatting, asterisks, or special characters.
            Use plain text only for best voice synthesis compatibility.`,
            user: `Please explain the following in simple terms in English:
            
"${question}"

Provide a comprehensive but easy-to-understand explanation using only plain text without any formatting:`
        },
        'hi': {
            system: `आप एक विशेषज्ञ शिक्षक हैं। अवधारणाओं को सरल, स्पष्ट हिंदी भाषा में समझाएं जिसे एक छात्र समझ सकता है।
            साफ, सुव्यवस्थित व्याख्या प्रदान करें बिना किसी मार्कडाउन फॉर्मेटिंग, तारांकन, या विशेष वर्णों के।
            केवल सादा पाठ का उपयोग करें सर्वोत्तम आवाज संश्लेषण संगतता के लिए।`,
            user: `कृपया निम्नलिखित को सरल हिंदी में समझाएं:
            
"${question}"

एक व्यापक लेकिन आसानी से समझ में आने वाली व्याख्या प्रदान करें केवल सादे पाठ का उपयोग करके बिना किसी फॉर्मेटिंग के:`
        },
        'es': {
            system: `Eres un profesor experto. Explica conceptos en un lenguaje simple y claro que un estudiante pueda entender.`,
            user: `Por favor explica lo siguiente en términos simples en español: "${question}"`
        },
        'fr': {
            system: `Vous êtes un enseignant expert. Expliquez les concepts dans un langage simple et clair qu'un élève peut comprendre.`,
            user: `Veuillez expliquer ce qui suit en termes simples en français: "${question}"`
        }
    };

    const prompt = languagePrompts[language] || languagePrompts['en'];

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: 'system',
                    content: prompt.system
                },
                {
                    role: 'user',
                    content: prompt.user
                }
            ],
            max_tokens: 1500,
            temperature: 0.7,
            top_p: 0.9
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Voice Functions - IMPROVED FOR HINDI
function generateVoiceExplanation() {
    let text = explanationText.textContent || explanationText.innerText;
    
    if (!text || text.includes('Enter your question above') || text.includes('अपना प्रश्न ऊपर दर्ज करें')) {
        showError(currentLanguage === 'hi' ? 'कृपया पहले एक AI व्याख्या प्राप्त करें।' : 'Please get an AI explanation first.');
        return;
    }

    // Clean the text for speech synthesis
    text = cleanTextForSpeech(text);
    
    hideMessages();
    prepareSpeech(text);
    speakBtn.disabled = false;
    showSuccess(currentLanguage === 'hi' ? '🎵 आवाज व्याख्या तैयार! सुनने के लिए "बोलें" पर क्लिक करें।' : '🎵 Voice explanation ready! Click "Speak" to start listening.');
}

function prepareSpeech(text) {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }

    currentUtterance = new SpeechSynthesisUtterance(text);
    
    // Set voice properties
    currentUtterance.rate = parseFloat(speedRange.value);
    currentUtterance.pitch = parseFloat(pitchRange.value);
    currentUtterance.volume = 1;

    // Get available voices
    const voices = speechSynthesis.getVoices();
    const selectedVoiceName = voiceSelect.value;
    
    let selectedVoice;
    
    // Auto-detect language and select appropriate voice
    if (selectedVoiceName === 'auto') {
        if (currentLanguage === 'hi') {
            selectedVoice = voices.find(voice => 
                voice.lang.includes('hi') || 
                voice.name.includes('Hindi') ||
                voice.name.includes('हिन्दी')
            );
        } else {
            selectedVoice = voices.find(voice => 
                voice.lang.includes(currentLanguage) ||
                (currentLanguage === 'en' && voice.lang.includes('en'))
            );
        }
    } else {
        selectedVoice = voices.find(voice => voice.name === selectedVoiceName);
    }
    
    // Fallback to any available voice
    if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0];
    }
    
    if (selectedVoice) {
        currentUtterance.voice = selectedVoice;
        currentUtterance.lang = selectedVoice.lang;
        console.log('Using voice:', selectedVoice.name, 'Language:', selectedVoice.lang);
    }

    // Event listeners for the utterance
    currentUtterance.onstart = () => {
        isSpeaking = true;
        speakBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        showSuccess(currentLanguage === 'hi' ? '🔊 बोल रहा हूं...' : '🔊 Speaking...');
    };

    currentUtterance.onend = () => {
        isSpeaking = false;
        isPaused = false;
        resetVoiceControls();
        showSuccess(currentLanguage === 'hi' ? '✅ बोलना समाप्त हुआ।' : '✅ Finished speaking.');
    };

    currentUtterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        showError(currentLanguage === 'hi' ? '❌ आवाज संश्लेषण में त्रुटि। कृपया पुनः प्रयास करें।' : '❌ Error with voice synthesis. Please try again.');
        resetVoiceControls();
    };
}

function speakExplanation() {
    if (currentUtterance) {
        speechSynthesis.speak(currentUtterance);
    }
}

function togglePause() {
    if (!isSpeaking) return;

    if (isPaused) {
        speechSynthesis.resume();
        pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        isPaused = false;
        showSuccess(currentLanguage === 'hi' ? '▶️ बोलना जारी...' : '▶️ Resumed speaking...');
    } else {
        speechSynthesis.pause();
        pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
        isPaused = true;
        showSuccess(currentLanguage === 'hi' ? '⏸️ रोका गया' : '⏸️ Paused');
    }
}

function stopSpeaking() {
    speechSynthesis.cancel();
    resetVoiceControls();
    showSuccess(currentLanguage === 'hi' ? '⏹️ बोलना बंद किया' : '⏹️ Stopped speaking.');
}

function resetVoiceControls() {
    isSpeaking = false;
    isPaused = false;
    speakBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
}

function updateSpeed() {
    const speed = speedRange.value;
    speedValue.textContent = getSpeedLabel(speed);
    
    if (currentUtterance) {
        currentUtterance.rate = parseFloat(speed);
    }
}

function updatePitch() {
    const pitch = pitchRange.value;
    pitchValue.textContent = getPitchLabel(pitch);
    
    if (currentUtterance) {
        currentUtterance.pitch = parseFloat(pitch);
    }
}

function getSpeedLabel(speed) {
    const speedNum = parseFloat(speed);
    if (speedNum < 0.8) return 'Slow';
    if (speedNum > 1.2) return 'Fast';
    return 'Normal';
}

function getPitchLabel(pitch) {
    const pitchNum = parseFloat(pitch);
    if (pitchNum < 0.8) return 'Low';
    if (pitchNum > 1.2) return 'High';
    return 'Normal';
}

// UI Functions
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    
    // Auto-hide success messages after 5 seconds
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 5000);
}

function hideMessages() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

function showLoading(show) {
    loadingIndicator.style.display = show ? 'block' : 'none';
    getExplanationBtn.disabled = show;
}

function clearAll() {
    questionInput.value = '';
    fileInput.value = '';
    imagePreview.style.display = 'none';
    uploadedImage = null;
    
    if (currentLanguage === 'hi') {
        explanationText.innerHTML = 'अपना प्रश्न ऊपर दर्ज करें या छवि अपलोड करें, फिर "AI व्याख्या प्राप्त करें" पर क्लिक करें';
    } else {
        explanationText.textContent = 'Enter your question above or upload an image, then click "Get AI Explanation" to generate a detailed, easy-to-understand explanation in your chosen language.';
    }
    hideMessages();
    stopSpeaking();
    resetVoiceControls();
    generateVoiceBtn.disabled = true;
    generateVoiceBtn.classList.remove('btn-primary');
    currentExplanation = '';
}

// Initialize voices when available
function loadVoices() {
    const voices = speechSynthesis.getVoices();
    console.log('Available voices:', voices);
    
    // If no voices are available, try to get them again
    if (voices.length === 0) {
        setTimeout(loadVoices, 1000);
    }
}

speechSynthesis.onvoiceschanged = loadVoices;

// Initialize
function init() {
    hideMessages();
    showLoading(false);
    resetVoiceControls();
    generateVoiceBtn.disabled = true;
    loadVoices();
    
    // Show welcome message
    setTimeout(() => {
        showSuccess('🚀 Welcome! Ask questions in any language or upload images. | हिंदी या अंग्रेजी में प्रश्न पूछें या छवियाँ अपलोड करें।');
    }, 1000);
}

// Start initialization when page loads
window.addEventListener('load', init);