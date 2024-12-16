const API_BASE = "https://qapi-xbw7.onrender.com/";
let subject = "", chapter = "", topic = "", questions = [], currentQuestionIndex = 0, timer = 0, timerInterval;
let questionProgress = [];

function startTimer() {
    timer = 0;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timer++;
        $("#timer").text(timer);
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function renderMathJax() {
    MathJax.typesetPromise().then(() => {
        console.log('MathJax rendering complete');
    }).catch((err) => {
        console.error('MathJax rendering failed:', err);
    });
}

function renderContent(html) {
    return html;
}

function fetchAndRenderSubjects() {
    $("#subject-container").show();
    $("#subjects").html("");
    ["maths", "physics", "chemistry"].forEach(sub => {
        $("#subjects").append(`
            <button class='subject' data-subject='${sub}'>
                ${sub.toUpperCase()}
            </button>
        `);
    });
}

function fetchChapters() {
    $.get(`${API_BASE}${subject}`, (data) => {
        $("#chapter-container").show();
        $("#chapters").html("");
        data.chapters.forEach(ch => {
            $("#chapters").append(`
                <button class='chapter' data-chapter='${ch}'>
                    ${ch.replace(/-/g, ' ')}
                </button>
            `);
        });
        $("#subject-container").hide();
    });
}

function fetchTopics() {
    $.get(`${API_BASE}${subject}/${chapter}`, (data) => {
        $("#topic-container").show();
        $("#topics").html("");
        data.topics.forEach(tp => {
            $("#topics").append(`
                <button class='topic' data-topic='${tp}'>
                    ${tp.replace(/-/g, ' ')}
                </button>
            `);
        });
        $("#chapter-container").hide();
    });
}

function initQuestionProgress() {
    questionProgress = questions.map((q, index) => ({
        index: index,
        answered: false,
        correct: null,
        type: q.type
    }));
    updateQuestionListUI();
}

function updateQuestionListUI() {
    // Create a question list sidebar
    const questionList = $(`
        <div id="question-list-container">
            ${questionProgress.map(q => `
                <div class="question-list-item" data-index="${q.index}">
                    Q${q.index + 1} 
                    ${q.answered ? (q.correct ? '✅' : '❌') : ''}
                </div>
            `).join('')}
        </div>
    `);

    // Add click navigation to question list
    questionList.on('click', '.question-list-item', function() {
        const targetIndex = $(this).data('index');
        currentQuestionIndex = targetIndex;
        renderQuestion();
    });

    // Replace or append the question list
    $("#question-list-container").remove();
    $(".app-container").prepend(questionList);
}

function fetchQuestions() {
    $.get(`${API_BASE}${subject}/${chapter}/${topic}`, (data) => {
        questions = data.questions;
        currentQuestionIndex = 0;
        $("#total-questions").text(questions.length);
        $("#question-container").show();
        initQuestionProgress();
        renderQuestion();
        $("#topic-container").hide();
    });
}

function renderQuestion() {
    if (!questions.length) return;

    const currentQuestion = questions[currentQuestionIndex];
    const q = currentQuestion.question;
    
    // Update question number and paper title
    $("#current-question").text(currentQuestionIndex + 1);
    $("#paper-title").text(currentQuestion.paperTitle || "");
    
    $("#question").html(renderContent(q.content));
    
    // Render based on question type
    if (currentQuestion.type === "mcq") {
        const options = q.options.map(opt => {
            const renderedContent = renderContent(opt.content);
            return `
                <button class='option' data-identifier='${opt.identifier}'>
                    ${renderedContent}
                </button>
            `;
        }).join("");
        $("#options").html(options);
        $("#integer-input").hide();
        $("#options").show();
    } else if (currentQuestion.type === "integer") {
        $("#options").hide();
        $("#integer-input")
            .show()
            .val("")  // Clear previous input
            .attr('type', 'number');
    }

    // Reset previous states
    $(".option").removeClass("selected correct incorrect");
    $("#explanation").html("");
    $("#check-answer").show();
    
    // Manage navigation buttons
    $("#prev-question").prop('disabled', currentQuestionIndex === 0);
    $("#next-question").prop('disabled', true);

    // Highlight current question in list
    $(".question-list-item").removeClass("active");
    $(`.question-list-item[data-index="${currentQuestionIndex}"]`).addClass("active");

    startTimer();
    renderMathJax();
}

// Event Listeners
$(document).on("click", ".subject", function() {
    subject = $(this).data("subject");
    updateBreadcrumb();
    fetchChapters();
    hideQuestionContainer();
});

$(document).on("click", ".chapter", function() {
    chapter = $(this).data("chapter");
    updateBreadcrumb();
    fetchTopics();
    hideQuestionContainer();
});

$(document).on("click", ".topic", function() {
    topic = $(this).data("topic");
    updateBreadcrumb();
    fetchQuestions();
    hideQuestionContainer();
});

$(document).on("click", ".option", function() {
    $(".option").removeClass("selected");
    $(this).addClass("selected");
    $("#check-answer").show();
});

$("#check-answer").click(function() {
    stopTimer();

    const currentQuestion = questions[currentQuestionIndex];
    let isCorrect = false;
    
    if (currentQuestion.type === "mcq") {
        const selected = $(".option.selected").data("identifier");
        const correctOptions = currentQuestion.question.correct_options;
        
        $(".option").each(function() {
            const optIdentifier = $(this).data("identifier");
            if (correctOptions.includes(optIdentifier)) {
                $(this).addClass("correct");
            }
        });

        isCorrect = correctOptions.includes(selected);
        if (isCorrect) {
            $(".option.selected").addClass("correct");
            $("#explanation").html(`
                <div class="success">
                    <strong>Correct!</strong><br>
                    ${renderContent(currentQuestion.question.explanation)}
                </div>
            `);
        } else {
            $(".option.selected").addClass("incorrect");
            $("#explanation").html(`
                <div class="error">
                    <strong>Incorrect!</strong><br>
                    ${renderContent(currentQuestion.question.explanation)}
                </div>
            `);
        }
    } else if (currentQuestion.type === "integer") {
        const userAnswer = $("#integer-input").val();
        const correctAnswer = currentQuestion.question.answer;
        
        isCorrect = userAnswer === correctAnswer.toString();
        
        if (isCorrect) {
            $("#explanation").html(`
                <div class="success">
                    <strong>Correct!</strong><br>
                    ${renderContent(currentQuestion.question.explanation)}
                </div>
            `);
        } else {
            $("#explanation").html(`
                <div class="error">
                    <strong>Incorrect!</strong> The correct answer is ${correctAnswer}<br>
                    ${renderContent(currentQuestion.question.explanation)}
                </div>
            `);
        }
    }

    // Update question progress
    questionProgress[currentQuestionIndex].answered = true;
    questionProgress[currentQuestionIndex].correct = isCorrect;
    updateQuestionListUI();

    // Always enable next button after checking
    $("#next-question").prop('disabled', false);
    
    // Hide check answer button after first use
    $(this).hide();
    
    renderMathJax();
});

$("#prev-question").click(function() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
});

$("#next-question").click(function() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    }
});

// Back navigation buttons
$("#back-to-subjects").click(function() {
    $("#chapter-container").hide();
    $("#subject-container").show();
});

$("#back-to-chapters").click(function() {
    $("#topic-container").hide();
    $("#chapter-container").show();
});

function updateBreadcrumb() {
    $("#breadcrumb-subject").text(subject).toggle(Boolean(subject));
    $("#breadcrumb-chapter").text(chapter.replace(/-/g, ' ')).toggle(Boolean(chapter));
    $("#breadcrumb-topic").text(topic.replace(/-/g, ' ')).toggle(Boolean(topic));
}

function hideQuestionContainer() {
    $("#question-container").hide();
}

// Breadcrumb navigation
$("#breadcrumb-subject").click(function () {
    chapter = "";
    topic = "";
    updateBreadcrumb();
    hideQuestionContainer();
    $("#chapter-container").hide();
    $("#topic-container").hide();
    $("#subject-container").show();
});

$("#breadcrumb-chapter").click(function () {
    topic = "";
    updateBreadcrumb();
    hideQuestionContainer();
    $("#topic-container").hide();
    $("#chapter-container").show();
});

$("#breadcrumb-topic").click(function () {
    updateBreadcrumb();
    hideQuestionContainer();
    $("#question-container").show();
});

$(document).ready(() => {
    fetchAndRenderSubjects();
});

function hideQuestionContainer() {
    $("#question-container").hide();
    $("#question-list-container").remove(); // Add this line
}