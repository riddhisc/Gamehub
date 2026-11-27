// The list of games shown in the hub.
// To add a game: build its component, then add one entry here.

import TicTacToe from "./component/TicTacToe/TicTacToe";
import ConnectFour from "./component/ConnectFour/ConnectFour";
import MemoryMatch from "./component/MemoryMatch/MemoryMatch";
import RockPaperScissors from "./component/RockPaperScissors/RockPaperScissors";
import SpaceShooter from "./component/SpaceShooter/SpaceShooter";
import { NeonRush, NeonBreaker, BlockBlitz } from "./component/Arcade/games";
import ColoringBook from "./component/ColoringBook/ColoringBook";
import Ludo from "./component/Ludo/Ludo";
import Sudoku from "./component/Sudoku/Sudoku";
import TempleDash from "./component/TempleDash/TempleDash";
import {
  TicTacToeIcon,
  ConnectFourIcon,
  MemoryIcon,
  RockPaperScissorsIcon,
  ShooterIcon,
  RacerIcon,
  BreakerIcon,
  BlocksIcon,
  ColoringIcon,
  LudoIcon,
  SudokuIcon,
  TempleDashIcon,
} from "./component/Hub/icons";

const LIST = [
  {
    id: "temple",
    tier: "premium",
    featured: true,
    name: "Temple Dash",
    description: "Run through the ancient temple. Dodge, jump, slide and escape the demon!",
    players: "1 player, endless run",
    accent: "#ffb23f",
    Icon: TempleDashIcon,
    Component: TempleDash,
  },
  {
    id: "tictactoe",
    tier: "basic",
    online: true,
    name: "Tic Tac Toe",
    description: "Two players, three in a row.",
    players: "2 players, online too",
    accent: "#26ffcb",
    Icon: TicTacToeIcon,
    Component: TicTacToe,
  },
  {
    id: "connect4",
    tier: "basic",
    online: true,
    name: "Connect Four",
    description: "Drop discs and line up four.",
    players: "2 players, online too",
    accent: "#ffb86b",
    Icon: ConnectFourIcon,
    Component: ConnectFour,
  },
  {
    id: "memory",
    tier: "basic",
    name: "Memory Match",
    description: "Flip cards and find every pair.",
    players: "1 player",
    accent: "#c792ff",
    Icon: MemoryIcon,
    Component: MemoryMatch,
  },
  {
    id: "rps",
    tier: "basic",
    name: "Rock Paper Scissors",
    description: "Beat the computer, one round at a time.",
    players: "vs computer",
    accent: "#8ab4ff",
    Icon: RockPaperScissorsIcon,
    Component: RockPaperScissors,
  },
  {
    id: "shooter",
    tier: "premium",
    name: "Star Strike",
    description: "Blast alien waves, beat the bosses and grab upgrades.",
    players: "1 player, arcade",
    accent: "#5cc8ff",
    Icon: ShooterIcon,
    Component: SpaceShooter,
  },
  {
    id: "racer",
    tier: "premium",
    name: "Neon Rush",
    description: "Race a night highway. Dodge traffic, boost and beat the clock.",
    players: "1 player, arcade racing",
    accent: "#ff4fa3",
    Icon: RacerIcon,
    Component: NeonRush,
  },
  {
    id: "breaker",
    tier: "premium",
    name: "Neon Breaker",
    description: "Smash bricks with lasers, fireballs and multi-ball power-ups.",
    players: "1 player, endless levels",
    accent: "#26ffcb",
    Icon: BreakerIcon,
    Component: NeonBreaker,
  },
  {
    id: "blocks",
    tier: "premium",
    name: "Block Blitz",
    description: "Stack falling blocks, chain combos and race up the levels.",
    players: "1 player, puzzle",
    accent: "#b074ff",
    Icon: BlocksIcon,
    Component: BlockBlitz,
  },
  {
    id: "coloring",
    tier: "premium",
    online: true,
    name: "Coloring Book",
    description: "Colour by number: fill detailed pictures.",
    players: "solo or together online",
    accent: "#ff8ad4",
    Icon: ColoringIcon,
    Component: ColoringBook,
  },
  {
    id: "ludo",
    tier: "basic",
    online: true,
    name: "Ludo",
    description: "Race your pieces home. Play the computer or a friend.",
    players: "2 to 4, bots or friends",
    accent: "#ff6b6b",
    Icon: LudoIcon,
    Component: Ludo,
  },
  {
    id: "sudoku",
    tier: "basic",
    online: true,
    name: "Sudoku",
    description: "Fill the grid. Solve it alone or together.",
    players: "solo or together online",
    accent: "#7fd6ff",
    Icon: SudokuIcon,
    Component: Sudoku,
  },
];

// The featured game comes first, the rest follow in ascending (A to Z) order.
export const GAMES = [...LIST].sort(
  (a, b) => Boolean(b.featured) - Boolean(a.featured) || a.name.localeCompare(b.name)
);
