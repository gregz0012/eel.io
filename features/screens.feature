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

  Scenario: Opening and closing the skin shop
    Given a player on the home screen
    When they open the skin shop
    Then they are on the skin shop screen
    When they close the skin shop
    Then they are on the home screen

  Scenario: A new player has one colour and an empty bank
    Given a player with an empty bank
    Then they own 1 skin
    And they do not own the gold skin
    And their bank holds 0 points

  Scenario: Scores are banked when a dive ends
    Given a player with an empty bank
    When they finish a dive worth 400 points
    And they finish a dive worth 250 points
    Then their bank holds 650 points

  Scenario: Buying a skin spends the points
    Given a player with 5000 points banked
    When they buy the gold skin
    Then they own the gold skin
    And their bank holds 3000 points

  Scenario: A skin you cannot afford is not sold to you
    Given a player with 100 points banked
    When they buy the gold skin
    Then they do not own the gold skin
    And their bank holds 100 points

  Scenario: All the points in the sea cannot buy a skin from a section you have not reached
    Given a player with 999999 points banked who has only reached level 2
    When they buy the gold skin
    Then they do not own the gold skin
    And their bank holds 999999 points

  Scenario: A hero opens at its own depth, not its section's shared level
    Given a player with 999999 points banked who has only reached level 8
    When they buy the eelpool skin
    Then they own the eelpool skin
    When they buy the symbiote skin
    Then they do not own the symbiote skin

  Scenario: A bought skin is never lost, even when the bank empties
    Given a player with 2500 points banked
    When they buy the gold skin
    And they buy the copper skin
    Then their bank holds 0 points
    And they own the gold skin
    And they own the copper skin

  Scenario: A skin cannot be worn before it is bought
    Given a player with an empty bank
    When they try to wear the platinum skin
    Then they are wearing the volt skin

  Scenario: Diving costs points
    Given a player with 5000 points banked
    When they dive and pay for it
    Then their bank holds 4990 points

  Scenario: A player with nothing banked can still dive
    Given a player with an empty bank
    When they dive and pay for it
    Then the dive was free
    And their bank holds 0 points

  Scenario: Diving repeatedly never puts a player in debt
    Given a player with 25 points banked
    When they dive and pay for it 10 times
    Then their bank holds 0 points
    And the dive was free
