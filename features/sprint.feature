Feature: Sprinting costs a small, predictable amount of length
  Holding touch, mouse or the boost control makes the eel sprint. The cost is
  based on elapsed time, so a high-refresh screen never drains length faster.

  Scenario: Screen refresh rate does not change the sprint cost
    Given an eel with length 30
    When it sprints for 5 seconds at 60 frames per second
    Then its length is 27
    When it sprints for 5 seconds at 120 frames per second from length 30
    Then its length is 27
