Feature: Levelling and the difficulty ramp
  Points get a young eel as far as its first boss and no further. After that
  the only way up is killing the boss guarding the level you are on, and each
  one takes as many hits as its level number. Levels are sticky — losing points
  never takes a level, and the perks that came with it, back off the player.

  Scenario: Eating enough fish reaches the first boss
    Given a new game
    When the player scores 120 points
    Then the player is on level 2
    And a boss is guarding the way

  Scenario: Points alone cannot get past the boss
    Given a new game
    When the player scores 5000 points
    Then the player is on level 2

  Scenario: Killing the boss is what opens the next level
    Given a new game
    When the player scores 120 points
    And the player kills the boss
    Then the player is on level 3

  Scenario: Each boss takes as many hits as its level
    Given a new game
    Then the boss guarding level 2 takes 2 hits
    And the boss guarding level 15 takes 15 hits

  Scenario: The first level is unguarded
    Given a new game
    Then no boss is guarding the way

  Scenario: A new predator joins every two levels
    Given a new game
    When the player scores 120 points
    And the player kills the boss
    And the player kills the boss
    Then 5 predators are hunting

  Scenario: Levels never fall when points are lost
    Given a new game
    When the player scores 120 points
    And the player loses 300 points
    Then the player is on level 2
    And the score is 0
