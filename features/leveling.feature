Feature: Levelling and the difficulty ramp
  Score is what drives Fin.io's difficulty. Levels are sticky — losing points
  (biting your own tail, sprinting) must never take a level, and the perks that
  came with it, back off the player.

  Scenario: Eating enough fish reaches the next level
    Given a new game
    When the player scores 120 points
    Then the player is on level 2

  Scenario: A present is the one thing that can take a level
    Given a new game
    When the player scores 640 points
    And the player opens a present holding a level deduction
    Then the player is on level 5
    And scoring another point does not give the level back

  Scenario: Losing a level cannot go below the first
    Given a new game
    When the player opens a present holding a level deduction
    Then the player is on level 1

  Scenario: Levels never fall when points are lost
    Given a new game
    When the player scores 360 points
    And the player loses 300 points
    Then the player is on level 4
    And the score is 60

  Scenario: A new predator joins every two levels
    Given a new game
    When the player scores 240 points
    Then 4 predators are hunting

  Scenario: A boss is unleashed on every tenth level
    Given a new game
    When the player scores 1200 points
    Then a boss has been unleashed

  Scenario: No boss appears before the tenth level
    Given a new game
    When the player scores 1079 points
    Then the player is on level 9
    And no boss has been unleashed
