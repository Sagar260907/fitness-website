// script.js - Complete JavaScript for FusionFit Fitness Tracker

(function() {
    'use strict';
    
    // ============================================
    // NUTRITION LOG (localStorage)
    // ============================================
    let mealEntries = [];
    const STORAGE_KEY = 'fusionfit_meals';
    
    function loadMeals() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if(stored) {
            try {
                mealEntries = JSON.parse(stored);
            } catch(e) {
                console.error('Error parsing stored meals:', e);
                mealEntries = [];
            }
        } else {
            mealEntries = [];
        }
        renderMealLog();
    }
    
    function saveMeals() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mealEntries));
        renderMealLog();
    }
    
    function renderMealLog() {
        const listEl = document.getElementById('mealLogList');
        const totalSpan = document.getElementById('totalCaloriesSpan');
        
        if(!listEl) return;
        
        if(mealEntries.length === 0) {
            listEl.innerHTML = '<li class="text-gray-400 text-center py-2"><i class="fas fa-utensils mr-2"></i>No entries yet. Add a meal to track daily intake.</li>';
            if(totalSpan) totalSpan.innerText = '0';
            return;
        }
        
        let total = 0;
        let html = '';
        
        mealEntries.forEach((entry, idx) => {
            total += entry.calories;
            const date = entry.date ? new Date(entry.date).toLocaleTimeString() : '';
            html += `
                <li class="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 transition hover:shadow-sm">
                    <div class="flex flex-col flex-1">
                        <span class="font-medium text-gray-700">${escapeHtml(entry.name)}</span>
                        <span class="text-orange-500 font-semibold text-sm">${entry.calories} kcal</span>
                        ${date ? `<span class="text-xs text-gray-400">${date}</span>` : ''}
                    </div>
                    <button class="delete-meal text-red-400 hover:text-red-600 text-sm transition px-2" data-index="${idx}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </li>
            `;
        });
        
        listEl.innerHTML = html;
        if(totalSpan) totalSpan.innerText = total;
        
        document.querySelectorAll('.delete-meal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-index'));
                if(!isNaN(idx) && idx >= 0 && idx < mealEntries.length) {
                    mealEntries.splice(idx, 1);
                    saveMeals();
                    showToast('Meal removed', 'info');
                }
            });
        });
    }
    
    function escapeHtml(str) {
        if(!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if(m === '&') return '&amp;';
            if(m === '<') return '&lt;';
            if(m === '>') return '&gt;';
            return m;
        });
    }
    
    function addMeal(name, calories) {
        if(!name || !name.trim()) {
            showToast('Please enter a meal name', 'warning');
            return false;
        }
        
        const calNum = parseInt(calories);
        if(isNaN(calNum) || calNum <= 0) {
            showToast('Please enter valid positive calories', 'warning');
            return false;
        }
        
        if(calNum > 5000) {
            showToast('Calories seem unusually high. Please verify.', 'warning');
        }
        
        mealEntries.unshift({ 
            name: name.trim(), 
            calories: calNum, 
            date: new Date().toISOString() 
        });
        saveMeals();
        return true;
    }
    
    // ============================================
    // CALORIE CALCULATION
    // ============================================
    function calculateCalories() {
        const age = parseInt(document.getElementById('age')?.value);
        const weight = parseFloat(document.getElementById('weight')?.value);
        const height = parseFloat(document.getElementById('height')?.value);
        const gender = document.getElementById('gender')?.value;
        const activity = parseFloat(document.getElementById('activity')?.value);
        
        if(isNaN(age) || isNaN(weight) || isNaN(height)) {
            showToast('Please fill all fields with valid numbers', 'error');
            return;
        }
        
        if(age <= 0 || age > 120) {
            showToast('Please enter a valid age (1-120)', 'warning');
            return;
        }
        
        if(weight <= 0 || weight > 500) {
            showToast('Please enter a valid weight (1-500 kg)', 'warning');
            return;
        }
        
        if(height <= 0 || height > 300) {
            showToast('Please enter a valid height (1-300 cm)', 'warning');
            return;
        }
        
        let bmr;
        if(gender === 'Male') {
            bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        }
        
        const maintenance = Math.round(bmr * activity);
        const bmrRounded = Math.round(bmr);
        
        const bmrSpan = document.getElementById('bmrValue');
        const maintenanceSpan = document.getElementById('maintenanceValue');
        const calorieResultDiv = document.getElementById('calorieResult');
        
        if(bmrSpan) bmrSpan.innerText = bmrRounded;
        if(maintenanceSpan) maintenanceSpan.innerText = maintenance;
        if(calorieResultDiv) calorieResultDiv.classList.remove('hidden');
        
        showToast(`Maintenance: ${maintenance} kcal/day`, 'success');
        
        if(calorieResultDiv) {
            calorieResultDiv.style.animation = 'none';
            calorieResultDiv.offsetHeight;
            calorieResultDiv.style.animation = 'fadeInUp 0.3s ease';
        }
    }
    
    // ============================================
    // WEB SPEECH API - AI VOICE COACH
    // ============================================
    const speechSupported = 'speechSynthesis' in window;
    let currentUtterance = null;
    let isSpeaking = false;
    
    const exerciseScripts = {
        bench: "AI Coach: Barbell Bench Press. Target: chest, triceps, front deltoids. Pro tip: Keep shoulder blades retracted, lower bar to mid-chest, drive through heels. Maintain slight arch in back for safety.",
        pullup: "AI Coach: Weighted Pull-up. Focus on lats and biceps. Shoulder-width grip, engage core, pull chest to bar, avoid swinging. Controlled negatives build more muscle.",
        squat: "AI Coach: Barbell Back Squat. Quads, glutes, core. Keep chest up, brace abs, knees track over toes. Go deep if mobility allows. Never round lower back.",
        shoulder: "AI Coach: Arnold Press. Targets all three deltoid heads. Start palms facing you, press up rotating palms forward. Control movement, squeeze at top.",
        deadlift: "AI Coach: Conventional Deadlift. Hamstrings, glutes, spinal erectors. Hinge at hips, maintain neutral spine, engage lats, drive through heels. Form is everything.",
        curl: "AI Coach: Dumbbell Bicep Curl. Isolate biceps brachii. Keep elbows pinned to sides, avoid swinging, squeeze at top. Lower slowly for maximum tension."
    };
    
    const globalWelcome = "Welcome to FusionFit AI Coach. Your intelligent fitness companion. Use calorie calculator to track nutrition. Click any speaker icon for detailed coaching on form and technique. Stay strong!";
    const floatingHelpMessage = "Hello! I'm your AI fitness assistant. Click any speaker icon next to an exercise for detailed coaching. Use calorie calculator to track daily nutrition. Consistency is key!";
    
    function speakText(text, onEnd = null) {
        if(!speechSupported) {
            showToast("Speech synthesis not supported in your browser", 'error');
            return;
        }
        
        if(currentUtterance) {
            window.speechSynthesis.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';
        utterance.volume = 1;
        
        utterance.onstart = () => {
            isSpeaking = true;
        };
        
        utterance.onend = () => {
            isSpeaking = false;
            currentUtterance = null;
            if(onEnd) onEnd();
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            isSpeaking = false;
            currentUtterance = null;
        };
        
        currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
    }
    
    function stopSpeaking() {
        if(window.speechSynthesis) {
            window.speechSynthesis.cancel();
            currentUtterance = null;
            isSpeaking = false;
            showToast('Voice stopped', 'info');
        }
    }
    
    // ============================================
    // TOAST NOTIFICATION
    // ============================================
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        
        let icon = '';
        switch(type) {
            case 'success':
                icon = '<i class="fas fa-check-circle mr-2 text-green-400"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle mr-2 text-red-400"></i>';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle mr-2 text-yellow-400"></i>';
                break;
            default:
                icon = '<i class="fas fa-info-circle mr-2 text-orange-400"></i>';
        }
        
        toast.innerHTML = `${icon}${escapeHtml(message)}`;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    function setupEventListeners() {
        const calcBtn = document.getElementById('calcCaloriesBtn');
        if(calcBtn) calcBtn.addEventListener('click', calculateCalories);
        
        const addMealBtn = document.getElementById('addMealBtn');
        if(addMealBtn) {
            addMealBtn.addEventListener('click', () => {
                const nameInput = document.getElementById('mealName');
                const calInput = document.getElementById('mealCalories');
                if(addMeal(nameInput?.value, calInput?.value)) {
                    if(nameInput) nameInput.value = '';
                    if(calInput) calInput.value = '';
                    showToast('Meal added successfully!', 'success');
                }
            });
        }
        
        const clearLogsBtn = document.getElementById('clearLogsBtn');
        if(clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => {
                if(confirm('Clear all nutrition logs permanently?')) {
                    mealEntries = [];
                    saveMeals();
                    showToast('All logs cleared', 'warning');
                }
            });
        }
        
        const globalVoiceIntro = document.getElementById('globalVoiceIntro');
        if(globalVoiceIntro) {
            globalVoiceIntro.addEventListener('click', () => {
                speakText(globalWelcome);
                showToast('AI Coach speaking...', 'info');
            });
        }
        
        const floatingVoiceHelp = document.getElementById('floatingVoiceHelp');
        if(floatingVoiceHelp) {
            floatingVoiceHelp.addEventListener('click', () => {
                speakText(floatingHelpMessage);
                showToast('AI Assistant activated', 'success');
            });
            floatingVoiceHelp.addEventListener('dblclick', () => stopSpeaking());
        }
        
        const voiceBtns = document.querySelectorAll('.voice-exercise-btn');
        voiceBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const exerciseKey = btn.getAttribute('data-exercise');
                const script = exerciseScripts[exerciseKey] || `AI Coach: ${exerciseKey} exercise guidance. Focus on proper form.`;
                speakText(script);
                showToast(`🎙️ ${exerciseKey.toUpperCase()} coaching`, 'info');
            });
        });
        
        const fakeRepoLinks = document.querySelectorAll('#fakeRepoLink, #footerRepoLink');
        fakeRepoLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showToast('FusionFit open source project - Check GitHub!', 'success');
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if(e.ctrlKey && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                document.getElementById('globalVoiceIntro')?.click();
            }
            if(e.key === 'Escape' && isSpeaking) stopSpeaking();
        });
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        console.log('FusionFit initialized - Images loaded from assets folder');
        loadMeals();
        setupEventListeners();
        
        if(!speechSupported) {
            console.warn('Web Speech API not supported');
        }
    }
    
    if(document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    window.FusionFit = { addMeal, calculateCalories, speakText, stopSpeaking };
})();