# JSDiver

---

**JSDiver** is a simple HTML5 canvas game where you play as a skydiver, jumping from a plane and dodging obstacles in the sky as they appear.

A demonstration of JSDiver can be played [here](https://users.aber.ac.uk/luj36/CS25320/jsdiver/).

1. [Gameplay](#gameplay)
   1. [Controls](#controls)
   2. [Obstacles](#obstacles)
      1. [Large Obstacles](#large-obstacles)
   3. [Difficulty](#difficulty)
   4. [Debugging](#debugging)
2. [Installation](#installation)
3. [Sources](#sources)

---

# Gameplay

## Controls

Use the arrows keys, or WASD, to move the player in all directions.

## Obstacles

As you fall, different obstacles like birds and kites will appear and move around. You need to avoid these objects.

![Obstacles](/assets/readme/dangers.png)

### Large Obstacles

You will also come across large obstacles, like planes and helicopters. Before these obstacles appear, certain areas of the screen will flash red for a few moments. These areas need to be avoided, as the obstacle will soon appear and sweep across that region.

## Difficulty

There are three difficulty modes in JSDiver, _Easy_, _Medium_ and _Hard_. You can select the difficulty from the main menu, either by clicking on the difficulty level, or using the arrow keys to select them. 

Each difficulty mode will have different effects on gameplay:

|                                 | Easy              | Medium           | Difficulty       |
|:--------------------------------|:------------------|:-----------------|:-----------------|
| Maximum Health                  | 5                 | 5                | 3                |
| Obstacle Spawning Frequency     | Every few seconds | Often            | Constant!        |
| Big Obstacle Spawning Frequency | Every 200 Points  | Every 100 Points | Every 50 Points! |

## Debugging

You can press 'U' to toggle debugging mode, which will allow you to see debugging information such as a variable watch and bounding boxes for obstacles and the player.

---
# Installation

The game can be deployed to an Apache Webserver using PostgreSQL. Clone the repository to the website's root. 

Within the `php` directory, there are two files, `db_secrets.php` and `get_connection.php`.
1. `db_secrets.php` should be configured to contain the correct parameters for connection to the PostgreSQL database.
   1. `DB_DRIVER` should be left as `pgsql`.
   2. `DB_HOST` should be set to your PostgreSQL hostname.
   3. `DB_NAME` should be the name of the database.
   4. `DB_USER` should be your username.
   5. `DB_PASSWORD` should be your password.
2. Inside `get_connection.php`, ensure that the reference to `db_secrets.php` on line 6 is corrected.

>For the sake of security, ensure that your `db_secrets.php` is not within your website's directory tree.

A table will be created inside your database automatically by `save_score.php`. You can configure the name you'd like to assign to the table, but ensure it is maintained between `save_scores.php` and `retrieve_scores.php`.

---
# Sources

PHP and JavaScript leaderboard functions in `leaderboard.js`, `get_connection.php`, `retrieve_scores.php` and `save_score.php` were modified from original code provided by Edel Sheratt in October 2022.

