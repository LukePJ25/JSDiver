<?php
// Originally written by Edel Sherratt in October 2022
// Modified by Luke Jones for use with JSDiver in November 2024

// Handle Missing Values (shouldn't be possible)
if (!array_key_exists("name", $_GET) || $_GET["name"] == "") {
    $_GET["name"] = "Anonymous";
}
if (!array_key_exists("score", $_GET) || $_GET["score"] == "") {
    $_GET["score"] = 0;
}
// Assume easy mode
if (!array_key_exists("difficulty", $_GET) || $_GET["score"] == "") {
    $_GET["difficulty"] = 0;
}

// Open Connection
require "get_connection.php";
$conn = get_connection();

// Carry out check to ensure table exists
$check_query = "
    CREATE TABLE IF NOT EXISTS jsdiver_scores (
        name VARCHAR(255) NOT NULL, 
        score INT NOT NULL, 
        difficulty INT NOT NULL
    )
";
$conn -> exec($check_query);

// Initilaise SQL Query
$query = $conn->
prepare("
    INSERT INTO jsdiver_scores 
        (name, score, difficulty) " . "
    VALUES
        (:name, :score, :difficulty)
    ");

// Outline submission variables
$submission_name = $_GET["name"];
$submission_score = intval($_GET["score"]);
$submission_difficulty = intval($_GET["difficulty"]);

// Bind variables to Query
$query->bindParam(":name", $submission_name);
$query->bindParam(":score", $submission_score);
$query->bindParam(":difficulty", $submission_difficulty);

// Execute Query
$query->execute();

// Clear References
$query = null;
$conn = null;