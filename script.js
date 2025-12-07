// --- [جديد] بنك الأسئلة الرئيسي سيتم تحميله من ملف .json ---
let MASTER_QUESTION_BANK = [];

// --- متغيرات حالة اللعبة ---
let gameData = []; 
let team1Picks = [];
let team2Picks = [];
let currentPicker = 1;

let team1Name = "الفريق الأحمر";
let team2Name = "الفريق الأزرق";
let team1Score = 0;
let team2Score = 0;
let currentPlayer = 1;
let currentQuestionValue = 0;
let tempClickedCell = null;

let timer;
let timerCount;

// متغيرات للتحكم في مراحل السؤال
let phase = 0; 
// phase 0: Active Team Answering
// phase 1: Steal Team Answering
// phase 2: Reveal Answer
// phase 3: Judging Active Team
// phase 4: Judging Steal Team

let team1BetChances = 2;
let team2BetChances = 2;
let isBetActive = false;

// --- عناصر الواجهة ---
const setupScreen = document.getElementById('setup-screen');
const categorySelectionScreen = document.getElementById('category-selection-screen');
const gameScreen = document.getElementById('game-screen');
const startGameBtn = document.getElementById('start-game-btn');
const team1NameInput = document.getElementById('team1-name');
const team2NameInput = document.getElementById('team2-name');
const selectionIndicator = document.getElementById('selection-indicator');
const categoryGrid = document.getElementById('category-grid');
const team1ScoreEl = document.getElementById('team1-score');
const team2ScoreEl = document.getElementById('team2-score');
const team1DisplayEl = document.getElementById('team1-display-name');
const team2DisplayEl = document.getElementById('team2-display-name');
const turnIndicator = document.getElementById('turn-indicator');
const gameBoard = document.getElementById('game-board');
const modal = document.getElementById('question-modal');
const questionText = document.getElementById('question-text');
const answerText = document.getElementById('answer-text');
const timerEl = document.getElementById('timer');

// الأزرار الجديدة
const confirmBtn = document.getElementById('confirm-btn');
const showAnswerBtn = document.getElementById('show-answer-btn');
const activeJudgeArea = document.getElementById('active-judge-area');
const stealJudgeArea = document.getElementById('steal-judge-area');
const activeJudgeText = document.getElementById('active-judge-text');
const stealJudgeText = document.getElementById('steal-judge-text');

const activeCorrectBtn = document.getElementById('active-correct-btn');
const activeWrongBtn = document.getElementById('active-wrong-btn');
const stealCorrectBtn = document.getElementById('steal-correct-btn');
const stealWrongBtn = document.getElementById('steal-wrong-btn');

const betModal = document.getElementById('bet-modal');
const betConfirmText = document.getElementById('bet-confirm-text');
const betConfirmYes = document.getElementById('bet-confirm-yes');
const betConfirmNo = document.getElementById('bet-confirm-no');

// =========================================================
// ==================== منطق اللعبة الجديد =================
// =========================================================

// 1. زر "تأكيد الإجابة" (يتحكم في الانتقال بين الفريقين)
confirmBtn.addEventListener('click', () => {
    clearInterval(timer);
    
    if (phase === 0) {
        // انتهى دور الفريق الأساسي، الآن دور الفريق السارق
        const activeName = (currentPlayer === 1) ? team1Name : team2Name;
        const stealName = (currentPlayer === 1) ? team2Name : team1Name;

        phase = 1;
        questionText.textContent = `تم تسجيل إجابة ${activeName}. الآن فرصة للسرقة! دور ${stealName}.`;
        questionText.classList.add('question-text-highlight'); // تظليل أزرق
        
        confirmBtn.textContent = `تأكيد إجابة ${stealName}`;
        startTimer(5); // 5 ثواني للسرقة

    } else if (phase === 1) {
        // انتهى دور الفريق السارق، الآن وقت الكشف
        readyToReveal();
    }
});

// عند انتهاء الوقت تلقائياً
function handleTimeUp() {
    // إذا كان رهان وانتهى الوقت = خسارة فورية
    if (isBetActive && phase === 0) {
        awardPoints(currentPlayer, 0, true); // خسارة الرهان
        return;
    }

    if (phase === 0) {
        // انتهى وقت الفريق الأول، ننتقل للسارق
        confirmBtn.click();
    } else if (phase === 1) {
        // انتهى وقت الفريق السارق، ننتقل للكشف
        readyToReveal();
    }
}

// التحضير لكشف الإجابة
function readyToReveal() {
    clearInterval(timer);
    phase = 2;
    questionText.textContent = "انتهت الإجابات! لنرَ الإجابة الصحيحة...";
    questionText.classList.remove('question-text-highlight'); // إزالة التظليل
    timerEl.textContent = "انتهى";
    
    confirmBtn.classList.add('hidden');
    showAnswerBtn.classList.remove('hidden');
}

// 2. زر "إظهار الإجابة"
showAnswerBtn.addEventListener('click', () => {
    answerText.classList.remove('hidden'); // إظهار الإجابة
    showAnswerBtn.classList.add('hidden');
    
    // الانتقال للتحكيم (الأولوية للفريق الأساسي)
    phase = 3;
    const activeName = (currentPlayer === 1) ? team1Name : team2Name;
    activeJudgeText.textContent = `هل كانت إجابة (${activeName}) صحيحة؟`;
    activeJudgeArea.classList.remove('hidden');
});

// 3. تحكيم الفريق الأساسي
activeCorrectBtn.addEventListener('click', () => {
    // الإجابة صحيحة! الفريق الأساسي يأخذ النقاط فوراً
    awardPoints(currentPlayer, currentQuestionValue, false);
});

activeWrongBtn.addEventListener('click', () => {
    // الإجابة خاطئة!
    if (isBetActive) {
        // إذا كان رهان، يخسرون فوراً
        awardPoints(currentPlayer, 0, true); 
    } else {
        // إذا سؤال عادي، ننتقل لتحكيم الفريق السارق
        phase = 4;
        activeJudgeArea.classList.add('hidden');
        const stealName = (currentPlayer === 1) ? team2Name : team1Name;
        stealJudgeText.textContent = `هل كانت إجابة (${stealName}) صحيحة؟`;
        stealJudgeArea.classList.remove('hidden');
    }
});

// 4. تحكيم الفريق السارق
stealCorrectBtn.addEventListener('click', () => {
    // سرقة ناجحة! الفريق السارق يأخذ نقاط السؤال
    const stealingPlayer = (currentPlayer === 1) ? 2 : 1;
    // قيمة السرقة: قيمة السؤال الأصلية
    awardPoints(stealingPlayer, parseInt(tempClickedCell.dataset.value), false);
});

stealWrongBtn.addEventListener('click', () => {
    // كلاهما أخطأ، لا نقاط لأحد
    closeModalAndSwitch();
});

// دالة توزيع النقاط وإغلاق النافذة
function awardPoints(player, amount, isBetLoss) {
    if (isBetLoss) {
        // تصفير نقاط الخاسر في الرهان
        if (player === 1) { team1Score = 0; team1ScoreEl.textContent = `${team1Name}: 0`; }
        else { team2Score = 0; team2ScoreEl.textContent = `${team2Name}: 0`; }
    } else {
        // إضافة نقاط
        if (player === 1) {
            team1Score += amount;
            team1ScoreEl.textContent = `${team1Name}: ${team1Score}`;
        } else {
            team2Score += amount;
            team2ScoreEl.textContent = `${team2Name}: ${team2Score}`;
        }
    }
    
    // إذا كانت سرقة ناجحة، الفريق السارق يأخذ الدور التالي (اختياري، أو يمكن تبديل الدور كالمعتاد)
    // في هذا الكود سأجعل الدور يتبدل بشكل طبيعي (أي الفريق التالي في الترتيب)
    closeModalAndSwitch();
}

function closeModalAndSwitch() {
    modal.classList.add('hidden');
    // إعادة تهيئة الواجهة للمرة القادمة
    answerText.classList.add('hidden');
    activeJudgeArea.classList.add('hidden');
    stealJudgeArea.classList.add('hidden');
    confirmBtn.classList.remove('hidden'); // إعادة الزر الافتراضي
    questionText.classList.remove('question-text-highlight');
    
    isBetActive = false;
    switchPlayer();
    updateTurnIndicator();
}

// =========================================================
// ==================== بقية الكود الأساسي =================
// =========================================================

startGameBtn.addEventListener('click', async () => {
    team1Name = team1NameInput.value || "الفريق الأحمر";
    team2Name = team2NameInput.value || "الفريق الأزرق";
    team1DisplayEl.textContent = team1Name;
    team2DisplayEl.textContent = team2Name;
    
    try {
        const response = await fetch('questions.json');
        if (!response.ok) throw new Error('Error');
        MASTER_QUESTION_BANK = await response.json();
        setupScreen.classList.add('hidden');
        categorySelectionScreen.classList.remove('hidden');
        updateSelectionIndicator();
        populateCategoryChoices();
    } catch (error) {
        questionText.textContent = 'Error loading questions.json';
        modal.classList.remove('hidden');
    }
});

function updateSelectionIndicator() {
    const pickerName = (currentPicker === 1) ? team1Name : team2Name;
    const picksLeft = 4 - ((currentPicker === 1) ? team1Picks.length : team2Picks.length);
    selectionIndicator.textContent = `دور ${pickerName} لاختيار (باقي ${picksLeft} مواضيع)`;
}

function populateCategoryChoices() {
    categoryGrid.innerHTML = '';
    MASTER_QUESTION_BANK.forEach(cat => {
        const cell = document.createElement('div');
        cell.classList.add('category-choice');
        cell.textContent = `${cat.icon} ${cat.category}`;
        cell.dataset.id = cat.id;
        cell.addEventListener('click', handleCategoryPick);
        categoryGrid.appendChild(cell);
    });
}

function handleCategoryPick(event) {
    const cell = event.currentTarget;
    if (cell.classList.contains('picked')) return;
    const categoryId = cell.dataset.id;
    cell.classList.add('picked');
    if (currentPicker === 1) {
        team1Picks.push(categoryId);
        if (team1Picks.length === 4) currentPicker = 2;
    } else {
        team2Picks.push(categoryId);
        if (team2Picks.length === 4) finalizeGameSetup();
        else updateSelectionIndicator();
    }
    updateSelectionIndicator();
}

function finalizeGameSetup() {
    const allPicks = [...team1Picks, ...team2Picks];
    const selectedCategories = MASTER_QUESTION_BANK.filter(cat => allPicks.includes(cat.id));
    gameData = JSON.parse(JSON.stringify(selectedCategories)); 
    categorySelectionScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    initializeBoard();
    updateTurnIndicator();
}

function initializeBoard() {
    gameBoard.innerHTML = '';
    gameData.forEach((cat, catIndex) => {
        const column = document.createElement('div');
        column.classList.add('category-column');
        const header = document.createElement('div');
        header.classList.add('category-header');
        header.textContent = `${cat.icon} ${cat.category}`;
        column.appendChild(header);
        [100, 200, 300, 400, 500].forEach(value => {
            const cell = document.createElement('div');
            cell.classList.add('question-cell');
            cell.textContent = value;
            cell.dataset.catIndex = catIndex;
            cell.dataset.value = value;
            cell.addEventListener('click', showQuestion);
            column.appendChild(cell);
        });
        gameBoard.appendChild(column);
    });
}

// بدء السؤال
function showQuestion(event) {
    const cell = event.currentTarget;
    if (cell.classList.contains('answered')) return;
    tempClickedCell = cell; 
    const value = cell.dataset.value;
    const [currentBetChances, currentScore] = (currentPlayer === 1) ? [team1BetChances, team1Score] : [team2BetChances, team2Score];

    if (value === "500" && currentBetChances > 0 && currentScore > 0) {
        betConfirmText.textContent = `هذا سؤال بـ 500 عملة. لديك ${currentBetChances} فرصة رهان. هل تريد المراهنة بـ ${currentScore} نقطة؟`;
        betModal.classList.remove('hidden');
    } else {
        isBetActive = false;
        proceedToShowQuestion();
    }
}

function proceedToShowQuestion() {
    const cell = tempClickedCell; 
    const catIndex = cell.dataset.catIndex;
    const value = cell.dataset.value;
    const questionsPool = gameData[catIndex].questions[value];
    
    if (!questionsPool || questionsPool.length === 0) {
        cell.classList.add('answered');
        cell.textContent = "X";
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * questionsPool.length);
    const question = questionsPool[randomIndex];
    questionsPool.splice(randomIndex, 1);
    
    // إعداد الواجهة للسؤال الجديد
    if (isBetActive) {
        currentQuestionValue = (currentPlayer === 1) ? team1Score : team2Score;
        questionText.textContent = `[سؤال رهان!] ${question.question}`;
    } else {
        currentQuestionValue = parseInt(value);
        questionText.textContent = question.question;
    }
    currentAnswer = question.answer;
    answerText.textContent = `الإجابة: ${currentAnswer}`;
    
    // إعادة تعيين الأزرار والحالة
    phase = 0;
    activeJudgeArea.classList.add('hidden');
    stealJudgeArea.classList.add('hidden');
    showAnswerBtn.classList.add('hidden');
    answerText.classList.add('hidden');
    
    const activeName = (currentPlayer === 1) ? team1Name : team2Name;
    confirmBtn.classList.remove('hidden');
    confirmBtn.textContent = `تأكيد إجابة ${activeName}`;

    modal.classList.remove('hidden');
    cell.classList.add('answered');
    
    startTimer(20);
}

function startTimer(duration) {
    timerCount = duration;
    timerEl.textContent = timerCount;
    clearInterval(timer);
    timer = setInterval(() => {
        timerCount--;
        timerEl.textContent = timerCount;
        if (timerCount <= 0) {
            clearInterval(timer);
            handleTimeUp();
        }
    }, 1000);
}

function switchPlayer() {
    currentPlayer = (currentPlayer === 1) ? 2 : 1;
}

function updateTurnIndicator() {
    const activeScoreBox = (currentPlayer === 1) ? team1ScoreEl : team2ScoreEl;
    const inactiveScoreBox = (currentPlayer === 1) ? team2ScoreEl : team1ScoreEl;
    activeScoreBox.classList.add('active-turn');
    inactiveScoreBox.classList.remove('active-turn');
    const currentTeamName = (currentPlayer === 1) ? team1Name : team2Name;
    turnIndicator.textContent = `الدور على: ${currentTeamName}`;
}

// أزرار الرهان
betConfirmYes.addEventListener('click', () => {
    isBetActive = true; 
    if (currentPlayer === 1) team1BetChances--; else team2BetChances--;
    betModal.classList.add('hidden');
    proceedToShowQuestion(); 
});
betConfirmNo.addEventListener('click', () => {
    isBetActive = false; 
    betModal.classList.add('hidden');
    proceedToShowQuestion(); 
});