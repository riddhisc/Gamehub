# 🎮 Game Hub

A small hub of simple games built with **React**. Open the app, pick a game from the home screen, and use **← All games** to come back.

## ✨ Games

| Game | How it works |
| --- | --- |
| **Temple Dash** (featured, shown first) | Endless runner in a pseudo-3D jungle temple. Change lanes, jump logs and pits, slide under beams, grab coins. Stumble once and the demon chases you; stumble twice and he catches you. Keys, swipes or on-screen buttons. Best score is remembered. |
| **Tic Tac Toe** | Two players take turns as X and O. Wins and draws are detected automatically. |
| **Connect Four** | Two players drop discs into a 7×6 grid. First to line up four wins. |
| **Memory Match** | Flip cards to find all 8 pairs in as few moves as you can. |
| **Rock Paper Scissors** | Play against the computer. |
| **Snake** | Three modes: **Classic** (walls are deadly), **Portal** (leave one side, come back on the other) and **Rocks** (more rocks every level). The snake speeds up every 5 apples. Bonus items: gold apple (+50), clock (slow motion) and scissors (3 shorter). Arrow keys, WASD, swipe or on-screen buttons; space pauses. Best score per mode is remembered. |
| **Ludo** | 2 to 4 players. Play the computer, friends on the same device, or a friend online with a room code (the host is Red, the friend is Yellow; the other seats can be computers). Roll a 6 to bring a piece out, capture to send pieces home (★ squares are safe), 6 / capture / getting home gives another turn, exact roll to finish. |
| **Sudoku** | Easy, Medium or Hard, always exactly one solution. Pencil notes, hints, mistake highlighting, number pad showing how many of each are left, timer. Solve it together in a room: both of you fill the same grid and see where the other is. |
| **Coloring Book** | Colour by number. Three detailed pictures plus a random one (a mandala with 81 parts, a tulip garden with 58, a butterfly with 56). Every part shows a number, the palette shows how many parts are left for each colour, and empty parts that need the selected colour get a dashed outline. Press **Random** for a freshly generated mandala (a new one each time, shared by both players in a room). Zoom in for the tiny ones. Undo and a progress bar included. |

Also included:

- **Easy / Medium / Hard** in every game: Tic Tac Toe and Connect Four (vs computer, shared AI in `ai.js`), Memory Match (6, 8 or 12 pairs), Rock Paper Scissors (how well the computer reads you), Snake (speed), Temple Dash (speed and spacing), Ludo (computer skill), Sudoku (clues) and the random Coloring picture (number of parts). The choice is remembered per game.
- **Order on the hub**: the featured game (Temple Dash) first, then the rest A to Z (set in `src/games.js`).
- **Play together online**: Tic Tac Toe, Connect Four, Coloring Book, Ludo and Sudoku have rooms (see below).
- **Download your picture**: the Coloring Book saves the picture as a PNG.
- **Responsive design**: every game scales from phones to desktops.
- **Keyboard and screen-reader friendly**: squares, cards and picture parts are real buttons with clear labels.

## 👫 Playing together (room codes)

Rooms (Tic Tac Toe, Connect Four, Coloring Book, Ludo, Sudoku) are made and joined from the **Play together** section on the main page (the games stay uncluttered):

1. Pick a game under **Make a room** and press **Create room**. You land in the game with a small strip showing the 5-character code (use **Copy code** or **Copy link**).
2. Your friend types the code under **Join a room** on the main page. The first letter of the code says which game it is, so they open the right one automatically.
3. Moves show up on both screens straight away. In the Coloring Book both players fill the same picture at the same time; undo removes your own last part, and **Clear picture** asks for a second click.

Rooms hold two people. The host plays X / Player 1 / Red, the guest plays O / Player 2 / Yellow. In Ludo the other seats can be computers.

How it works: the two browsers connect directly with WebRTC using [PeerJS](https://peerjs.com). PeerJS's free public broker is used only to introduce them, so there is no server to run. The code is in `src/net/`. Things to know:

- The free broker is best effort. Some strict networks (certain school or office Wi-Fi) block direct connections. If you need rock-solid rooms, swap `src/net/room.js` for a backend you control (for example Firebase, Supabase Realtime or a small WebSocket server). The games only call `useRoom`, so nothing else changes.
- If the broker can't be reached, rooms still work between tabs of the same browser.
- Invite links need the app to be hosted at a web address (they won't work from a file on disk).

## 🚀 Installation

To run this project locally, follow these steps:

1. **Clone the repository**:

   ```bash
   git clone https://github.com/riddhisc/TicTacToe-Game.git
   ```

2. **Navigate to the project directory**:

   ```bash
   cd TicTacToe-Game
   ```

3. **Install dependencies**:

   ```bash
   npm install
   ```

## ▶️ Usage

1. **Start the development server**:

   ```bash
   npm start
   ```

2. **Open the hub**:  
   Go to [http://localhost:3000](http://localhost:3000) and pick a game.

3. **Run the tests** (optional):

   ```bash
   npm test
   ```

## 🧩 Adding a game

1. Build the game as a component, for example `src/component/MyGame/MyGame.jsx`.
2. Add one entry to the list in `src/games.js` with a name, a short description, an icon and your component.

The hub shows a card for it automatically.

```
src/
├── App.js              shows the hub, or the chosen game with a back button
├── games.js            the list of games
├── net/                room codes and live connection (room.js, useRoom.js)
└── component/
    ├── Room/           the slim room strip shown inside a game
    ├── Hub/            home screen, card icons, "Play together" section
    ├── TicTacToe/
    ├── ConnectFour/
    ├── MemoryMatch/
    ├── RockPaperScissors/
    ├── Ludo/           rules.js (pure rules + computer player) and the board
    ├── TempleDash/     runner.js (pure rules), draw.js (canvas renderer) and the screen
    ├── Sudoku/         puzzle.js (generator with unique solutions) and the grid
    ├── Snake/
    └── ColoringBook/
```

## 🤝 Contributing

Contributions are welcome! Here's how you can contribute:

1. **Fork the repository**.
2. **Create a new branch**:

   ```bash
   git checkout -b feature-name
   ```

3. **Make your changes and commit them**:

   ```bash
   git commit -m "Add new feature"
   ```

4. **Push to the branch**:

   ```bash
   git push origin feature-name
   ```

5. **Submit a pull request** detailing your changes.
