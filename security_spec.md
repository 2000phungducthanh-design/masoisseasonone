# Wolvesville Security Specification

## Data Invariants
1. A player must belong to a valid active game.
2. Only werewolves can read werewolf-type messages.
3. Player roles are hidden from others unless the game is finished or within the werewolf team.
4. Timestamps (`createdAt`, `joinedAt`) are immutable.
5. Only the host can start the game.

## The Dirty Dozen (Attack Vectors)
1. **Self-Promotion**: An attacker tries to set their role to 'Werewolf' or 'Seer' when joining.
2. **Murder Script**: An attacker tries to set `isAlive: false` for another player.
3. **Phase Skipper**: An attacker tries to change the game phase from 'night' to 'day'.
4. **Spying**: A Villager tries to read the `players` collection to see who the Seer is.
5. **Eavesdropping**: A Villager tries to listen to the `werewolf` chat messages.
6. **Double Vote**: An attacker tries to update their `voteTargetId` multiple times rapidly (well, rules can't prevent race conditions easily, but we can prevent illegal targets).
7. **Identity Theft**: Spoofing `uid` in the Player document.
8. **Long-range Attack**: Injecting 1MB of text into a chat message.
9. **History Rewrite**: Changing `createdAt` timestamp.
10. **Premature Victory**: Manually setting the `winner` field.
11. **Orphaned Player**: Joining a game with a non-existent `gameId`.
12. **Zombie Post**: Posting a message when `isAlive` is false.

## Security Rules Plan
- Reusable helpers for `isSignedIn`, `isValidId`, `isGameMember`.
- `isValidPlayer` check for creation (role assigned randomly by client? No, better if server does it, but we are client-side only. So client assigns, but we can't fully trust it. *Correction*: In AI Studio Build, we prefer "Real Integrations". Without a Node backend, the first player to join might initialize roles).
- *Wait*, client-side random assignment is dangerous. Better: The host assigns roles when the game starts.
- Rules will enforce that `role` can only be set during `create` or a specific game-start update by host.

```javascript
// Example helper for role visibility
function canSeeRole(playerData, gameData) {
  return request.auth.uid == playerData.uid 
    || gameData.status == 'finished'
    || (playerData.team == 'werewolves' && get(/databases/$(database)/documents/games/$(gameId)/players/$(request.auth.uid)).data.team == 'werewolves');
}
```
