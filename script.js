
const settingsScreen = document.getElementById("settingsScreen");
const trainingScreen = document.getElementById("trainingScreen");
const resultsScreen = document.getElementById("resultsScreen");
const statsScreen = document.getElementById("statsScreen");

const settingsForm = document.getElementById("settingsForm");
const answerForm = document.getElementById("answerForm");
const answerInput = document.getElementById("answerInput");

const problem = document.getElementById("problem");
const feedback = document.getElementById("feedback");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const operationLabel = document.getElementById("operationLabel");

const modeSelect = document.getElementById("mode");
const questionCountSetting = document.getElementById("questionCountSetting");
const timerSetting = document.getElementById("timerSetting");
const timerDisplay = document.getElementById("timerDisplay");

const exitButton = document.getElementById("exitButton");
const fullscreenButton = document.getElementById("fullscreenButton");
const restartButton = document.getElementById("restartButton");
const skipButton = document.getElementById("skipButton");

const statsButton = document.getElementById("statsButton");
const resultsStatsButton = document.getElementById("resultsStatsButton");
const backFromStatsButton = document.getElementById("backFromStatsButton");

let operations = [];
let difficulty = "medium";
let mode = "normal";
let totalQuestions = 20;
let timeLimit = 60;

let currentQuestion = 0;
let correctAnswers = 0;
let wrongAnswers = 0;
let expectedAnswer = 0;

let currentStreak = 0;
let bestStreak = 0;

let startedAt = 0;
let questionStartedAt = 0;
let totalAnswerTime = 0;

let timerId = null;
let nextQuestionTimeout = null;
let waitingForNext = false;
let finished = false;

// Для возврата с экрана статистики
let previousScreen = "settings";

// Сохранённая статистика
const STORAGE_KEY = "mindMathStats";

const defaultStats = {
    bestStreak: 0,
    bestAccuracy: 0,
    totalSolved: 0,
    totalCorrect: 0,
    totalWrong: 0,
    completedTrainings: 0
};

function loadStats() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return { ...defaultStats };
        }

        const parsed = JSON.parse(saved);

        return {
            ...defaultStats,
            ...parsed
        };
    } catch (error) {
        console.error("Ошибка загрузки статистики:", error);
        return { ...defaultStats };
    }
}

let stats = loadStats();

function saveStats() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (error) {
        console.error("Ошибка сохранения статистики:", error);
    }
}

const operationNames = {
    add: "СЛОЖЕНИЕ",
    subtract: "ВЫЧИТАНИЕ",
    multiply: "УМНОЖЕНИЕ",
    divide: "ДЕЛЕНИЕ"
};

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getSymbol(operation) {
    const symbols = {
        add: "+",
        subtract: "−",
        multiply: "×",
        divide: "÷"
    };

    return symbols[operation] || "?";
}

// Переключение режима
modeSelect.addEventListener("change", function () {
    const timed = modeSelect.value === "timed";

    timerSetting.hidden = !timed;
    questionCountSetting.hidden = timed;
});

// Начало тренировки
settingsForm.addEventListener("submit", function (event) {
    event.preventDefault();

    operations = Array.from(
        document.querySelectorAll(
            'input[name="operation"]:checked'
        )
    ).map(input => input.value);

    if (operations.length === 0) {
        alert("Выбери хотя бы одну арифметическую операцию.");
        return;
    }

    difficulty = document.getElementById("difficulty").value;
    mode = modeSelect.value;

    totalQuestions = Number(
        document.getElementById("questionCount").value
    );

    timeLimit = Number(
        document.getElementById("timeLimit").value
    );

    startTraining();
});

function startTraining() {
    clearInterval(timerId);
    clearTimeout(nextQuestionTimeout);

    currentQuestion = 0;
    correctAnswers = 0;
    wrongAnswers = 0;
    currentStreak = 0;
    bestStreak = 0;
    totalAnswerTime = 0;

    waitingForNext = false;
    finished = false;

    startedAt = Date.now();

    settingsScreen.hidden = true;
    resultsScreen.hidden = true;
    statsScreen.hidden = true;
    trainingScreen.hidden = false;
    exitButton.hidden = false;

    if (mode === "timed") {
        timerDisplay.hidden = false;
        updateTimer();
        timerId = setInterval(updateTimer, 250);
    } else {
        timerDisplay.hidden = true;
    }

    generateQuestion();
}

function updateTimer() {
    if (finished) return;

    const elapsed = (Date.now() - startedAt) / 1000;
    const remaining = Math.max(0, timeLimit - elapsed);

    timerDisplay.textContent = `${remaining.toFixed(1)} сек.`;

    if (remaining <= 0) {
        finishTraining();
    }
}

// Создание примера
function generateQuestion() {
    if (finished) return;

    if (mode === "normal" && currentQuestion >= totalQuestions) {
        finishTraining();
        return;
    }

    currentQuestion++;
    waitingForNext = false;
    answerInput.disabled = false;

    let first;
    let second;

    const operation =
        operations[randomInt(0, operations.length - 1)];

    if (difficulty === "easy") {
        first = randomInt(1, 20);
        second = randomInt(2, 10);
    } else if (difficulty === "medium") {
        first = randomInt(10, 99);
        second = randomInt(2, 12);
    } else {
        first = randomInt(100, 999);
        second = randomInt(10, 99);
    }

    if (operation === "add") {
        expectedAnswer = first + second;
    } else if (operation === "subtract") {
        if (second > first) {
            [first, second] = [second, first];
        }

        expectedAnswer = first - second;
    } else if (operation === "multiply") {
        expectedAnswer = first * second;
    } else if (operation === "divide") {
        expectedAnswer = first;
        first = first * second;
    }

    problem.textContent =
        `${first} ${getSymbol(operation)} ${second}`;

    operationLabel.textContent =
        operationNames[operation] || "УСТНЫЙ СЧЁТ";

    feedback.textContent = "";
    answerInput.value = "";
    answerInput.placeholder = "Твой ответ";

    updateProgress();

    questionStartedAt = Date.now();
    answerInput.focus();
}

function updateProgress() {
    progressText.textContent = mode === "normal"
        ? `Пример ${currentQuestion} из ${totalQuestions}`
        : `Решено примеров: ${correctAnswers + wrongAnswers}`;

    progressFill.style.width = mode === "normal"
        ? `${(currentQuestion - 1) / totalQuestions * 100}%`
        : "0%";
}

// Проверка ответа
answerForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (
        finished ||
        waitingForNext ||
        answerInput.value.trim() === ""
    ) {
        return;
    }

    const userAnswer = Number(answerInput.value);

    totalAnswerTime +=
        (Date.now() - questionStartedAt) / 1000;

    if (userAnswer === expectedAnswer) {
        correctAnswers++;
        currentStreak++;

        bestStreak = Math.max(bestStreak, currentStreak);

        feedback.textContent = `Верно! Серия: ${currentStreak}`;
    } else {
        wrongAnswers++;
        currentStreak = 0;

        feedback.textContent = `Неверно. Ответ: ${expectedAnswer}`;
    }

    moveToNextQuestion();
});

// Пропуск
skipButton.addEventListener("click", function () {
    if (finished || waitingForNext) return;

    wrongAnswers++;
    currentStreak = 0;

    totalAnswerTime +=
        (Date.now() - questionStartedAt) / 1000;

    feedback.textContent = `Пропущено. Ответ: ${expectedAnswer}`;

    moveToNextQuestion();
});

function moveToNextQuestion() {
    waitingForNext = true;
    answerInput.disabled = true;

    if (mode === "normal") {
        progressFill.style.width =
            `${currentQuestion / totalQuestions * 100}%`;
    }

    updateProgress();

    nextQuestionTimeout = setTimeout(function () {
        if (finished) return;

        if (mode === "normal" && currentQuestion >= totalQuestions) {
            finishTraining();
        } else {
            generateQuestion();
        }
    }, 650);
}

// Завершение и сохранение результатов
function finishTraining() {
    if (finished) return;

    finished = true;

    clearInterval(timerId);
    clearTimeout(nextQuestionTimeout);

    trainingScreen.hidden = true;
    settingsScreen.hidden = true;
    statsScreen.hidden = true;
    resultsScreen.hidden = false;
    exitButton.hidden = true;

    const totalAnswered = correctAnswers + wrongAnswers;

    const accuracy = totalAnswered === 0
        ? 0
        : Math.round(correctAnswers / totalAnswered * 100);

    const average = totalAnswered === 0
        ? 0
        : totalAnswerTime / totalAnswered;

    // Обновляем общую статистику
    stats.totalSolved += totalAnswered;
    stats.totalCorrect += correctAnswers;
    stats.totalWrong += wrongAnswers;
    stats.completedTrainings++;

    stats.bestStreak = Math.max(stats.bestStreak, bestStreak);
    stats.bestAccuracy = Math.max(stats.bestAccuracy, accuracy);

    saveStats();

    document.getElementById("resultTotal").textContent = totalAnswered;
    document.getElementById("resultCorrect").textContent = correctAnswers;
    document.getElementById("resultWrong").textContent = wrongAnswers;
    document.getElementById("resultAccuracy").textContent = `${accuracy}%`;
    document.getElementById("resultAverage").textContent =
        `${average.toFixed(1)} сек.`;
    document.getElementById("resultStreak").textContent = bestStreak;

    renderStats();
}

// Отображение сохранённой статистики
function renderStats() {
    document.getElementById("statsTrainings").textContent =
        stats.completedTrainings;

    document.getElementById("statsSolved").textContent =
        stats.totalSolved;

    document.getElementById("statsCorrect").textContent =
        stats.totalCorrect;

    document.getElementById("statsWrong").textContent =
        stats.totalWrong;

    document.getElementById("statsStreak").textContent =
        stats.bestStreak;

    document.getElementById("statsAccuracy").textContent =
        `${stats.bestAccuracy}%`;
}

// Открытие статистики из меню
statsButton.addEventListener("click", function () {
    previousScreen = "settings";

    settingsScreen.hidden = true;
    trainingScreen.hidden = true;
    resultsScreen.hidden = true;
    statsScreen.hidden = false;

    renderStats();
});

// Открытие статистики из результатов
resultsStatsButton.addEventListener("click", function () {
    previousScreen = "results";

    resultsScreen.hidden = true;
    statsScreen.hidden = false;

    renderStats();
});

// Возврат с экрана статистики
backFromStatsButton.addEventListener("click", function () {
    statsScreen.hidden = true;

    if (previousScreen === "results") {
        resultsScreen.hidden = false;
    } else {
        settingsScreen.hidden = false;
    }
});

// Выход из тренировки
exitButton.addEventListener("click", function () {
    clearInterval(timerId);
    clearTimeout(nextQuestionTimeout);

    finished = true;

    trainingScreen.hidden = true;
    resultsScreen.hidden = true;
    statsScreen.hidden = true;
    settingsScreen.hidden = false;

    exitButton.hidden = true;
});

// Новая тренировка
restartButton.addEventListener("click", function () {
    resultsScreen.hidden = true;
    settingsScreen.hidden = false;
});

// Полноэкранный режим
fullscreenButton.addEventListener("click", async function () {
    try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    } catch (error) {
        feedback.textContent = "Полноэкранный режим недоступен.";
    }
});

document.addEventListener("fullscreenchange", function () {
    fullscreenButton.textContent = document.fullscreenElement
        ? "Выйти из полного экрана"
        : "Полный экран";
});

// Заполняем статистику при запуске
renderStats();
