// script.js - All JavaScript functionality for FusionFit

// ==================== DATABASE FUNCTIONS (IndexedDB) ====================
const DB_NAME = "FusionFitDB";
const DB_VERSION = 1;
const STORE_NAME = "mealLogs";
let db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        if (db && db.name === DB_NAME) return resolve(db);
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { 
            db = request.result; 
            resolve(db); 
        };
        request.onupgradeneeded = (event) => {
            const dbEv = event.target.result;
            if (!dbEv.objectStoreNames.contains(STORE_NAME)) {
                dbEv.createObjectStore(STORE_NAME, { 
                    keyPath: "id", 
                    autoIncrement: true 
                });
            }
        };
    });
}

async function addMealToDB(mealName, calories) {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const entry = { 
        name: mealName, 
        calories: parseInt(calories) || 0, 
        date: new Date().toLocaleDateString(), 
        timestamp: Date.now() 
    };
    await store.add(entry);
    await tx.done;
    renderMealLog();
}

async function getAllMeals() {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const meals = await store.getAll();
    return meals.filter(meal => meal.date === new Date().toLocaleDateString());
}

async function clearAllMealsToday() {
    const database = await openDB();
    const all = await new Promise((res) => {
        const tx = database.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => res(request.result);
    });
    const todayStr = new Date().toLocaleDateString();
    const toDelete = all.filter(entry => entry.date === todayStr);
    const tx = database.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (let item of toDelete) {
        if (item.id) await store.delete(item.id);
    }
    await tx.done;
    renderMealLog();
}

async function renderMealLog() {
    const meals = await getAllMeals();
    const listEl = document.getElementById("mealLogList");
    const totalSpan = document.getElementById("totalCaloriesSpan");
    if (!listEl) return;
    let total = 0;
    if (meals.length === 0) {
        listEl.innerHTML = '<li class="text-gray-400 text-center py-2">No entries today. Add a meal to track daily intake.</li>';
        totalSpan.innerText = "0 kcal";
        return;
    }
    listEl.innerHTML = meals.map(meal => 
        `<li class="flex justify-between bg-gray-50 p-2 rounded">
            <span>${escapeHtml(meal.name)}</span>
            <span class="font-medium">${meal.calories} kcal</span>
        </li>`
    ).join("");
    total = meals.reduce((acc, m) => acc + (Number(m.calories) || 0), 0);
    totalSpan.innerText = `${total} kcal`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== CALORIE CALCULATOR ====================
function calculateCalories() {
    const age = parseInt(document.getElementById("age").value);
    const weight = parseFloat(document.getElementById("weight").value);
    const height = parseFloat(document.getElementById("height").value);
    const gender = document.getElementById("gender").value;
    const activity = parseFloat(document.getElementById("activity").value);
    
    if (isNaN(age) || isNaN(weight) || isNaN(height)) {
        alert("Please fill age, weight, height with valid numbers");
        return;
    }
    
    let bmr;
    if (gender === "Male") {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    
    const maintenance = Math.round(bmr * activity);
    document.getElementById("bmrValue").innerText = Math.round(bmr);
    document.getElementById("maintenanceValue").innerText = maintenance;
    document.getElementById("calorieResult").classList.remove("hidden");
}

// ==================== AI VOICE-OVER FUNCTIONS ====================
const speechSynth = window.speechSynthesis;

function speakText(text, rate = 0.9, pitch = 1.0) {
    if (!speechSynth) { 
        alert("Your browser does not support AI voice-over."); 
        return; 
    }
    speechSynth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;
    speechSynth.speak(utterance);
}

const exerciseVoiceMap = {
    bench: "Barbell Bench Press: Lie on a flat bench, grip slightly wider than shoulder-width. Lower the bar to your mid-chest while keeping elbows at 45 degrees. Drive explosively up. Keep your shoulders pinned to the bench. Focus on chest contraction. Perform 3 sets of 8 to 12 repetitions.",
    pullup: "Weighted Pull-up: Grasp bar with overhand grip, hands shoulder-width. Pull your chest toward the bar, engaging lats and biceps. Lower with control. Avoid kipping to maximize muscle growth. Breathe out as you pull. Aim for 3 sets of maximum repetitions.",
    squat: "Back Squat: Place barbell across upper traps. Keep your chest upright, descend until hips are below knees. Drive through heels. Brace your core. This builds quad and glute strength. Start with light weight and focus on form. Do 3 sets of 8 to 10 reps.",
    shoulder: "Arnold Press: Sit on a bench, dumbbells at shoulder height palms facing you. Press overhead while rotating palms forward. This targets all three deltoid heads. Lower with control. Perform 3 sets of 10 to 12 repetitions for shoulder development.",
    deadlift: "Deadlift: Stand with mid-foot under bar. Hinge at hips, grip outside knees. Keep spine neutral, pull slack, then drive hips forward. Strong back and hamstrings. Never round lower back. Do 3 sets of 5 to 8 repetitions with proper form.",
    curl: "Dumbbell Bicep Curl: Hold dumbbells with supinated grip, elbows pinned to sides. Curl weights toward shoulders, squeeze biceps, then slowly lower. Avoid swinging the torso. Perform 3 sets of 10 to 12 repetitions for optimal bicep growth."
};

const introMessage = "Welcome to FusionFit. Your AI-powered fitness companion. Use the calorie calculator to track energy needs, explore exercise library with video examples, and click the voice button on any exercise for detailed coaching. Let's get stronger today!";

// ==================== INITIALIZE ALL FEATURES ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize calorie calculator
    const calcBtn = document.getElementById("calcCaloriesBtn");
    if (calcBtn) {
        calcBtn.addEventListener("click", calculateCalories);
    }
    
    // Initialize meal tracker
    const addMealBtn = document.getElementById("addMealBtn");
    const clearLogsBtn = document.getElementById("clearLogsBtn");
    
    if (addMealBtn) {
        addMealBtn.addEventListener("click", async () => {
            const mealName = document.getElementById("mealName").value.trim();
            const mealCal = document.getElementById("mealCalories").value.trim();
            if (!mealName || !mealCal || isNaN(parseInt(mealCal))) {
                alert("Please enter a valid meal name and calorie number.");
                return;
            }
            await addMealToDB(mealName, parseInt(mealCal));
            document.getElementById("mealName").value = "";
            document.getElementById("mealCalories").value = "";
        });
    }
    
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener("click", async () => {
            if (confirm("Clear today's entire meal log? (local database)")) {
                await clearAllMealsToday();
            }
        });
    }
    
    // Initialize voice features
    const globalVoiceBtn = document.getElementById("globalVoiceIntro");
    const floatingHelp = document.getElementById("floatingVoiceHelp");
    
    if (globalVoiceBtn) {
        globalVoiceBtn.addEventListener("click", () => speakText(introMessage, 0.85));
    }
    
    if (floatingHelp) {
        floatingHelp.addEventListener("click", () => 
            speakText("Need help? Use the exercise voice buttons for step-by-step coaching, or calculate your calories. Stay fit!", 0.9)
        );
    }
    
    // Attach voice to all exercise buttons
    document.querySelectorAll(".voice-exercise-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const exerciseKey = btn.getAttribute("data-exercise");
            const script = exerciseVoiceMap[exerciseKey] || 
                "Perform this exercise with proper form, warm up sets, and maintain full range of motion. Consult a professional for personal advice.";
            speakText(script, 0.85, 1.02);
        });
    });
    
    // Initialize database and load meals
    openDB().then(() => renderMealLog()).catch(e => console.warn("indexedDB error", e));
    
    // Handle video loading errors gracefully
    document.querySelectorAll('video').forEach(video => {
        video.addEventListener('error', function() {
            console.log('Video not found. Please add video files to assets/videos/ folder');
        });
    });
});