<?php
// Originally written by Edel Sherratt in October 2022
// Modified by Luke Jones for use with JSDiver in November 2024

// Establish a connection to the PostgreSQL database.
require 'YOUR_DB_SECRETS_FILE';
function get_connection() {
    $data_source_name = DB_DRIVER.":host=".DB_HOST.";dbname=".DB_NAME;
    try {
        return new PDO($data_source_name, DB_USER, DB_PASSWORD);
    } catch (PDOException $e) {
        return NULL;
    }
}
