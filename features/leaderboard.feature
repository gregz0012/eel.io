Feature: Anonymous leaderboard
  Players are identified by a random id their own browser generates, never by
  anything about their device. The display name is derived from that id, so a
  player keeps the same name across sessions and nobody can type a name onto a
  board that children read.

  Scenario: A player keeps the same name across sessions
    Given a player whose browser generated the id "3f2a9c14-0000-4000-8000-000000000001"
    When they come back another day with the same id
    Then they are shown the same name as before

  Scenario: Two players get different names
    Given a player whose browser generated the id "3f2a9c14-0000-4000-8000-000000000001"
    And another player with the id "3f2a9c14-0000-4000-8000-000000000002"
    Then the two players have different names

  Scenario: The board keeps a player's best run, not their latest
    Given a player whose browser generated the id "3f2a9c14-0000-4000-8000-000000000001"
    When they finish a run worth 900 points
    And they finish a run worth 100 points
    Then the board shows them with 900 points

  Scenario: A forged score is refused
    Given a player whose browser generated the id "3f2a9c14-0000-4000-8000-000000000001"
    When they submit a run worth 999999999 points
    Then the run is refused
    And the board does not show them

  Scenario: A score nobody could have earned that fast is refused
    Given a player whose browser generated the id "3f2a9c14-0000-4000-8000-000000000001"
    When they submit 50000 points earned in 4 seconds
    Then the run is refused
