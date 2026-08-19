Feature: Screens, pausing and skins
  A run can be paused. A run that ends sends the player back to the surface
  rather than straight into another dive, so they always pass the home screen
  and can change their eel first.

  Scenario: Pausing and resuming a dive
    Given a player on the home screen
    When they dive
    And they pause
    Then the world is frozen
    When they resume
    Then the world is running again

  Scenario: Death goes back to the home screen, not straight into another run
    Given a player on the home screen
    When they dive
    And they are eaten
    Then they are on the game over screen
    And diving again is not offered from there
    When they head for the surface
    Then they are on the home screen

  Scenario: Giving up a paused run
    Given a player on the home screen
    When they dive
    And they pause
    And they head for the surface
    Then they are on the home screen

  Scenario: A new player has five colours to choose from
    Given a player who has never scored
    Then they can wear 5 skins
    And they cannot wear the gold skin

  Scenario: Points earned across runs unlock new skins
    Given a player who has never scored
    When they score 400 points across a run
    And they score 200 points across a run
    Then they have unlocked the copper skin
    And they can wear 6 skins

  Scenario: An earned skin is never lost
    Given a player who has never scored
    When they score 600 points across a run
    And they score 0 points across a run
    Then they have unlocked the copper skin

  Scenario: A skin cannot be worn before it is earned
    Given a player who has never scored
    When they try to wear the platinum skin
    Then they are wearing the volt skin
