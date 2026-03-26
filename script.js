// script.js - Complete JavaScript for FusionFit Fitness Tracker

(function() {
    'use strict';
    
    // ============================================
    // NUTRITION LOG (localStorage)
    // ============================================
    let mealEntries = [];
    const STORAGE_KEY = 'fusionfit_meals';
    
    // Load meals from localStorage
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
    
    // Save meals to localStorage
    function saveMeals() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mealEntries));
        renderMealLog();
    }
    
    // Render the meal log UI
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
        
        // Attach delete event listeners
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
    
    // Escape HTML to prevent XSS
    function escapeHtml(str) {
        if(!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if(m === '&') return '&amp;';
            if(m === '<') return '&lt;';
            if(m === '>') return '&gt;';
            return m;
        });
    }
    
    // Add a new meal entry
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
    // CALORIE CALCULATION (Mifflin-St Jeor)
    // ============================================
    function calculateCalories() {
        const age = parseInt(document.getElementById('age')?.value);
        const weight = parseFloat(document.getElementById('weight')?.value);
        const height = parseFloat(document.getElementById('height')?.value);
        const gender = document.getElementById('gender')?.value;
        const activity = parseFloat(document.getElementById('activity')?.value);
        
        // Validation
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
        
        // Calculate BMR using Mifflin-St Jeor formula
        let bmr;
        if(gender === 'Male') {
            bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        }
        
        const maintenance = Math.round(bmr * activity);
        const bmrRounded = Math.round(bmr);
        
        // Update UI
        const bmrSpan = document.getElementById('bmrValue');
        const maintenanceSpan = document.getElementById('maintenanceValue');
        const calorieResultDiv = document.getElementById('calorieResult');
        
        if(bmrSpan) bmrSpan.innerText = bmrRounded;
        if(maintenanceSpan) maintenanceSpan.innerText = maintenance;
        if(calorieResultDiv) calorieResultDiv.classList.remove('hidden');
        
        showToast(`Maintenance: ${maintenance} kcal/day`, 'success');
        
        // Optional: Animate the result
        if(calorieResultDiv) {
            calorieResultDiv.style.animation = 'none';
            calorieResultDiv.offsetHeight; // Trigger reflow
            calorieResultDiv.style.animation = 'fadeInUp 0.3s ease';
        }
    }
    
    // ============================================
    // WEB SPEECH API - AI VOICE COACH
    // ============================================
    const speechSupported = 'speechSynthesis' in window;
    let currentUtterance = null;
    let isSpeaking = false;
    
    // AI voice coaching scripts for each exercise
    const exerciseScripts = {
        bench: "AI Coach here with Barbell Bench Press guidance. This exercise targets your chest, triceps, and front deltoids. Pro tip: Keep your shoulder blades retracted and squeezed together. Lower the bar to your mid-chest area. Drive through your heels and maintain a slight arch in your back. Exhale as you press up. Aim for 3 sets of 8 to 12 repetitions for muscle growth.",
        
        pullup: "AI Coach here with Weighted Pull-up technique. This targets your lats, biceps, and rear deltoids. Use a shoulder-width grip with palms facing away. Engage your core, pull your chest toward the bar, and avoid swinging. Control the negative portion of the movement for better muscle activation. If you're starting out, use resistance bands or an assisted pull-up machine.",
        
        squat: "AI Coach here with Barbell Back Squat form. This compound movement targets your quads, glutes, hamstrings, and core. Key tips: Keep your chest up and proud. Brace your abs like you're about to be punched. Ensure your knees track over your toes. Go as deep as your mobility allows while maintaining a neutral spine. Never round your lower back. Start with lighter weight to master form.",
        
        shoulder: "AI Coach here with Arnold Press instruction. This variation targets all three deltoid heads. Start with dumbbells at shoulder height, palms facing you. As you press up, rotate your palms forward. Squeeze at the top for a second. Control the descent back to starting position. This rotation provides full range of motion for maximum shoulder development.",
        
        deadlift: "AI Coach here with Conventional Deadlift guidance. This targets your hamstrings, glutes, spinal erectors, and traps. Critical form points: Hinge at your hips, not your lower back. Maintain a neutral spine throughout. Engage your lats by pulling your shoulders back. Drive through your heels. Keep the bar close to your body. Never jerk the bar - build tension first. Form is everything for safety.",
        
        curl: "AI Coach here with Dumbbell Bicep Curl technique. This isolates the biceps brachii. Keep your elbows pinned to your sides throughout the movement. Avoid swinging your body. Squeeze your biceps hard at the top. Lower the weight slowly taking 2 to 3 seconds for the negative phase. This creates more time under tension for better growth. Use full range of motion."
    };
    
    const globalWelcome = "Welcome to FusionFit AI Coach. Your intelligent fitness companion. I'm here to help you track nutrition and master exercise form. Use the calorie calculator to find your maintenance calories. Browse our exercise library and click any speaker icon to hear detailed coaching on form and technique. Remember to warm up before exercising and cool down after. Stay consistent and train smart!";
    
    const floatingHelpMessage = "Hello! I'm your AI fitness assistant. Here are some tips: Click any speaker icon next to an exercise for detailed coaching on proper form. Use the calorie calculator to track your daily nutrition. Add meals to your nutrition log to monitor your intake. Consistency is key to achieving your fitness goals. Is there a specific exercise you'd like to learn about?";
    
    // Speak text using Web Speech API
    function speakText(text, onEnd = null) {
        if(!speechSupported) {
            showToast("Your browser does not support speech synthesis. Please use Chrome, Edge, or Safari.", 'error');
            return;
        }
        
        // Cancel any ongoing speech
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
            // Visual feedback for active voice
            document.querySelectorAll('.voice-exercise-btn').forEach(btn => {
                if(btn.classList.contains('voice-speaking')) {
                    btn.classList.remove('voice-speaking');
                }
            });
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
            showToast('Voice error. Please try again.', 'error');
        };
        
        currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
        
        // Add visual indicator to active button if triggered by button
        if(document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('voice-exercise-btn')) {
            document.activeElement.classList.add('voice-speaking');
            setTimeout(() => {
                if(document.activeElement) document.activeElement.classList.remove('voice-speaking');
            }, text.length * 30);
        }
    }
    
    // Stop current speech
    function stopSpeaking() {
        if(window.speechSynthesis) {
            window.speechSynthesis.cancel();
            currentUtterance = null;
            isSpeaking = false;
            showToast('Voice stopped', 'info');
        }
    }
    
    // ============================================
    // TOAST NOTIFICATION SYSTEM
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
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove toast after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // ============================================
    // EVENT LISTENERS SETUP
    // ============================================
    function setupEventListeners() {
        // Calorie calculator button
        const calcBtn = document.getElementById('calcCaloriesBtn');
        if(calcBtn) {
            calcBtn.addEventListener('click', calculateCalories);
        }
        
        // Add meal button
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
        
        // Allow Enter key to add meal
        const mealCalories = document.getElementById('mealCalories');
        if(mealCalories) {
            mealCalories.addEventListener('keypress', (e) => {
                if(e.key === 'Enter') {
                    e.preventDefault();
                    const addBtn = document.getElementById('addMealBtn');
                    if(addBtn) addBtn.click();
                }
            });
        }
        
        const mealName = document.getElementById('mealName');
        if(mealName) {
            mealName.addEventListener('keypress', (e) => {
                if(e.key === 'Enter') {
                    e.preventDefault();
                    const addBtn = document.getElementById('addMealBtn');
                    if(addBtn) addBtn.click();
                }
            });
        }
        
        // Clear all logs button
        const clearLogsBtn = document.getElementById('clearLogsBtn');
        if(clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => {
                if(confirm('⚠️ Clear all nutrition logs permanently? This action cannot be undone.')) {
                    mealEntries = [];
                    saveMeals();
                    showToast('All logs cleared', 'warning');
                }
            });
        }
        
        // Global voice intro button
        const globalVoiceIntro = document.getElementById('globalVoiceIntro');
        if(globalVoiceIntro) {
            globalVoiceIntro.addEventListener('click', () => {
                speakText(globalWelcome);
                showToast('AI Coach speaking...', 'info');
            });
        }
        
        // Floating voice help button
        const floatingVoiceHelp = document.getElementById('floatingVoiceHelp');
        if(floatingVoiceHelp) {
            floatingVoiceHelp.addEventListener('click', () => {
                speakText(floatingHelpMessage);
                showToast('AI Assistant activated', 'success');
            });
            
            // Double-click to stop speaking
            floatingVoiceHelp.addEventListener('dblclick', () => {
                stopSpeaking();
            });
        }
        
        // Voice buttons for exercises
        const voiceBtns = document.querySelectorAll('.voice-exercise-btn');
        voiceBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const exerciseKey = btn.getAttribute('data-exercise');
                const script = exerciseScripts[exerciseKey] || `AI Coach: ${exerciseKey} exercise. Focus on proper form, controlled movements, and progressive overload. Always warm up before starting.`;
                speakText(script);
                showToast(`🎙️ AI Coach: ${exerciseKey.toUpperCase()} guidance`, 'info');
            });
        });
        
        // GitHub repo links (demo)
        const fakeRepoLinks = document.querySelectorAll('#fakeRepoLink, #footerRepoLink');
        fakeRepoLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showToast('🌟 FusionFit is open source! Check GitHub for the complete codebase.', 'success');
            });
        });
        
        // Input validation for numeric fields
        const numericInputs = document.querySelectorAll('input[type="number"]');
        numericInputs.forEach(input => {
            input.addEventListener('input', function() {
                if(this.value < 0) this.value = 0;
                if(this.id === 'age' && this.value > 120) this.value = 120;
                if(this.id === 'weight' && this.value > 500) this.value = 500;
                if(this.id === 'height' && this.value > 300) this.value = 300;
            });
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl + Shift + V for voice intro
            if(e.ctrlKey && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                const voiceBtn = document.getElementById('globalVoiceIntro');
                if(voiceBtn) voiceBtn.click();
            }
            // Escape key to stop speech
            if(e.key === 'Escape' && isSpeaking) {
                stopSpeaking();
            }
        });
    }
    
    // ============================================
    // ANIMATION KEYFRAMES (inject dynamically)
    // ============================================
    function injectAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            .fade-in {
                animation: fadeInUp 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        console.log('FusionFit initialized - AI Voice Coach Active');
        loadMeals();
        setupEventListeners();
        injectAnimations();
        
        // Check if browser supports speech synthesis
        if(!speechSupported) {
            console.warn('Web Speech API not supported in this browser');
            const voiceButtons = document.querySelectorAll('.voice-exercise-btn, #globalVoiceIntro, #floatingVoiceHelp');
            voiceButtons.forEach(btn => {
                btn.title = 'Speech synthesis not supported in your browser';
            });
        }
        
        // Add placeholder animation for calorie result
        const calorieResult = document.getElementById('calorieResult');
        if(calorieResult && !calorieResult.classList.contains('hidden')) {
            calorieResult.classList.add('fade-in');
        }
        
        // Preload sample data tip after 3 seconds
        setTimeout(() => {
            if(mealEntries.length === 0) {
                // Optional: Show hint about adding meals
                console.log('Tip: Add your first meal to start tracking!');
            }
        }, 3000);
    }
    
    // Start the application when DOM is ready
    if(document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Export functions for debugging (optional)
    window.FusionFit = {
        addMeal,
        calculateCalories,
        speakText,
        stopSpeaking,
        getMealEntries: () => [...mealEntries]
    };
    
})();