// The list of games shown in the hub.
// To add a game: build its component, then add one entry here.

import TicTacToe from "./component/TicTacToe/TicTacToe";
import ConnectFour from "./component/ConnectFour/ConnectFour";
import MemoryMatch from "./component/MemoryMatch/MemoryMatch";
import RockPaperScissors from "./component/RockPaperScissors/RockPaperScissors";
import SpaceShooter from "./component/SpaceShooter/SpaceShooter";
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
  ColoringIcon,
  LudoIcon,
  SudokuIcon,
  TempleDashIcon,
} from "./component/Hub/icons";

const LIST = [
  {
    id: "temple",
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
    name: "Memory Match",
    description: "Flip cards and find every pair.",
    players: "1 player",
    accent: "#c792ff",
    Icon: MemoryIcon,
    Component: MemoryMatch,
  },
  {
    id: "rps",
    name: "Rock Paper Scissors",
    description: "Beat the computer, one round at a time.",
    players: "vs computer",
    accent: "#8ab4ff",
    Icon: RockPaperScissorsIcon,
    Component: RockPaperScissors,
  },
  {
    id: "shooter",
    name: "Star Strike",
    description: "Blast alien waves, beat the bosses and grab upgrades.",
    players: "1 player, arcade",
    accent: "#5cc8ff",
    Icon: ShooterIcon,
    Component: SpaceShooter,
  },
  {
    id: "coloring",
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
