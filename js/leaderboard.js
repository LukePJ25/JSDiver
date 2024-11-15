// Leaderboard handler for JSDiver
// Original PHP interaction adapted from code provided by Edel Sherratt from October 2022.


let output, nameEntry, table, easyCol, medCol, hardCol;

// Ensure content is loading before defining entry elements
document.addEventListener("DOMContentLoaded", function() {
    output = document.getElementById("leaderSubmitOutput");
    nameEntry = document.getElementById("scoreNameSubmit");
    table = document.getElementById("leaderboards");
    easyCol = document.getElementById("lb-easy");
    medCol = document.getElementById("lb-medium");
    hardCol = document.getElementById("lb-hard");
});

// Place message next to leaderboard submission point. No parameter 1 for removing message. If messageType is true, text will be red.
function outputMessage(messageText, messageType) {
    if(messageType){ // Error
        output.style = "color: #f00;"
    } else { // General output
        output.style = "color: #000;"
    }
    output.innerHTML = `<i>${messageText}</i>`;
}

async function saveScore(name, score, difficulty) {
    // Call PHP script to save score to database
    const save_response = await fetch(`/php/save_score.php?name=${name}&score=${score}&difficulty=${difficulty}`, {method: 'GET'})

    if (save_response.ok) {
        scoreSubmitted = true;
        outputMessage("Score Submitted.", false)
        await retrieveScores();
    } else {
        outputMessage("Score couldn't be saved. Try again later, or try refreshing the page.", true)
    }

}

// Takes and parsed JSON data, calling createRow for each array of information, each representing a row in the table.
function populateRows(data){
    // Clear Existing Table Data
    easyCol.innerHTML = "";
    medCol.innerHTML = "";
    hardCol.innerHTML = "";

    // For every item in data
    data.forEach(function (row) {
        createRow(row["name"], row["score"], row["difficulty"]);
    });
}

// Creates a row element and appends it to the leaderboard.
function createRow(name,score,difficulty) {
    let newRow = document.createElement("tr");
    let nameCol = document.createElement("td");
    let scoreCol = document.createElement("td");
    nameCol.innerHTML = name;
    scoreCol.innerHTML = score;
    newRow.appendChild(nameCol);
    newRow.appendChild(scoreCol);
    switch (difficulty) {
        case 0:
            easyCol.appendChild(newRow);
            break;
        case 1:
            medCol.appendChild(newRow);
            break;
        case 2:
            hardCol.appendChild(newRow);
            break;
        default:
            console.error("Score has no associated difficulty.")
            break;
    }
}

async function retrieveScores() {
    // Call PHP script to retrieve a list of the top 10 scores across each difficulty
    const leaderboard_response = await fetch(`/php/retrieve_scores.php`, {method: 'GET'})

    if(leaderboard_response.ok){
        const leaderboard_json = await leaderboard_response.json();
        populateRows(leaderboard_json);
    } else { // Leaderboard retrieval failed
        outputMessage("Failed to retrieve leaderboard data", true);
    }
}

async function requestScoreSubmit() {
    // Clear error output
    outputMessage("", false);

    if (lastScore === 0) { // If the score is 0, assume the player hasn't played yet
        outputMessage("Make sure you play the game before submitting a score!", true)
    } else if (nameEntry.value === "") { // If the player hasn't entered a name
        outputMessage("Enter a name before submitting your score!", true)
    } else {
        if (!scoreSubmitted) {
            await saveScore(nameEntry.value, lastScore, lastScoreDifficulty);
        }
    }
}

// Get initial data
retrieveScores();