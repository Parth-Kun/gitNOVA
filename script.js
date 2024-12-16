const API_BASE = "https://qapi-xbw7.onrender.com/";
let subject = "", chapter = "", topic = "", questions = [], currentQuestionIndex = 0, timer = 0, timerInterval;

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
    //return html.replace(/\$\$(.*?)\$\$/g, '\\\[$1\\\]')
               //.replace(/\$(.*?)\$/g, '\\\$$1\\\$');
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

function fetchQuestions() {
    $.get(`${API_BASE}${subject}/${chapter}/${topic}`, (data) => {
        questions = data.questions;
        currentQuestionIndex = 0;
        $("#total-questions").text(questions.length);
        $("#question-container").show();
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
    $("#next-question").prop('disabled', currentQuestionIndex === questions.length - 1);

    startTimer();
    renderMathJax();
}

// Event Listeners
$(document).on("click", ".subject", function() {
    subject = $(this).data("subject");
    fetchChapters();
});

$(document).on("click", ".chapter", function() {
    chapter = $(this).data("chapter");
    fetchTopics();
});

$(document).on("click", ".topic", function() {
    topic = $(this).data("topic");
    fetchQuestions();
});

$(document).on("click", ".option", function() {
    $(".option").removeClass("selected");
    $(this).addClass("selected");
    $("#check-answer").show();
});

$("#check-answer").click(function() {
    stopTimer();

    const currentQuestion = questions[currentQuestionIndex];
    
    if (currentQuestion.type === "mcq") {
        const selected = $(".option.selected").data("identifier");
        const correctOptions = currentQuestion.question.correct_options;
        
        $(".option").each(function() {
            const optIdentifier = $(this).data("identifier");
            if (correctOptions.includes(optIdentifier)) {
                $(this).addClass("correct");
            }
        });

        if (correctOptions.includes(selected)) {
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
        
        if (userAnswer === correctAnswer.toString()) {
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

$(document).ready(() => {
    fetchAndRenderSubjects();
});

function updateBreadcrumb() {
    $("#breadcrumb-subject").text(subject).toggle(Boolean(subject));
    $("#breadcrumb-chapter").text(chapter.replace(/-/g, ' ')).toggle(Boolean(chapter));
    $("#breadcrumb-topic").text(topic.replace(/-/g, ' ')).toggle(Boolean(topic));
}



// Handle the click events for subject, chapter, and topic links
$(document).on("click", ".subject", function () {
    subject = $(this).data("subject");
    updateBreadcrumb();
    fetchChapters();
    hideQuestionContainer();  // Ensure question view is hidden
    $("#subject-container").show();
});

$(document).on("click", ".chapter", function () {
    chapter = $(this).data("chapter");
    updateBreadcrumb();
    fetchTopics();
    hideQuestionContainer();  // Ensure question view is hidden
    $("#chapter-container").show();
});

$(document).on("click", ".topic", function () {
    topic = $(this).data("topic");
    updateBreadcrumb();
    fetchQuestions();
    hideQuestionContainer();  // Ensure question view is hidden
    $("#topic-container").show();
});

// Function to hide the question container
function hideQuestionContainer() {
    $("#question-container").hide();
}

// Optional: Handle breadcrumb navigation for back buttons
$("#breadcrumb-subject").click(function () {
    chapter = "";
    topic = "";
    updateBreadcrumb();
    hideQuestionContainer();  // Ensure question view is hidden
    $("#chapter-container").hide();
    $("#topic-container").hide();
    $("#subject-container").show();
});

$("#breadcrumb-chapter").click(function () {
    topic = "";
    updateBreadcrumb();
    hideQuestionContainer();  // Ensure question view is hidden
    $("#topic-container").hide();
    $("#chapter-container").show();
});

// Optional: Handle topic breadcrumb
$("#breadcrumb-topic").click(function () {
    updateBreadcrumb();
    hideQuestionContainer();  // Ensure question view is hidden
    $("#question-container").show();  // If you want to show the question view for this breadcrumb
});