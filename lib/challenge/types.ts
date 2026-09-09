import type { GameId } from "@/types";

export interface Challenge {
  game: GameId;
  score: number;
  name: string;
}

export interface ParsedChallenge extends Challenge {
  /**
   * Whether the link's checksum matched. A checksum catches truncated or
   * hand-edited links — it is NOT security. Challenge scores are produced on a
   * stranger's device and can never be trusted as verified results.
   */
  integrityOk: boolean;
}
