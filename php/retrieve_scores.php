<?php
// Originally written by Edel Sherratt in October 2022
// Modified by Luke Jones for use with JSDiver in November 2024

// Retrieves top scores from jsdiver_scores, and then sorts and
// populates tables.

// Open Connection
require "get_connection.php";
$conn = get_connection();

// Query which selects the top 10 scores of each difficulty
$query = "
    WITH RankedScores AS (
        SELECT
            name,
            score,
            difficulty,
            ROW_NUMBER() OVER (PARTITION BY difficulty ORDER BY score DESC) AS rank
        FROM jsdiver_scores
    )
    SELECT name, score, difficulty
    FROM RankedScores
    WHERE rank <= 10
    ORDER BY difficulty, rank;
";

// Execute Query
$result = $conn -> query($query);

// Encode retrieved data to JSON, and then send that JSON back to the JavaScript call.
echo json_encode($result->fetchAll(PDO::FETCH_ASSOC));

// Clear References
$result = null;
$query = null;
$conn = null;