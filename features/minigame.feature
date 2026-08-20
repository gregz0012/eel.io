Feature: Calming mini-games
  After a long stretch of play, dying offers a short calming exercise worth
  banked points. It is optional, and it cannot be farmed by dying on purpose —
  only finishing one resets the clock.

  Scenario: A mini-game is offered after fifteen minutes of play
    Given a new player
    When they play for 14 minutes and die
    Then no mini-game is offered
    When they play for 1 more minute and die
    Then a mini-game is offered

  Scenario: Finishing the mini-game banks the reward and resets the clock
    Given a new player
    When they play for 15 minutes and die
    And they finish the offered mini-game
    Then their play bank holds 250 points
    When they play for 10 more minutes and die
    Then no mini-game is offered

  Scenario: Dying twice does not earn two rewards
    Given a new player
    When they play for 15 minutes and die
    And they play for 1 more minute and die
    Then a mini-game is still offered
    But finishing it only banks 250 points, not 500

  Scenario: Skipping the offer leaves it due next time
    Given a new player
    When they play for 15 minutes and die
    And they skip the offered mini-game
    And they play for 1 more minute and die
    Then a mini-game is offered
