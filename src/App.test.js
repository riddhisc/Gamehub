import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

beforeEach(() => localStorage.clear());

// Open a game from the hub by clicking its card.
const openGame = (name) =>
  userEvent.click(screen.getByRole("button", { name: new RegExp(`^${name}`, "i") }));

const square = (n) => screen.getByRole("button", { name: new RegExp(`^Square ${n}`) });

describe("hub", () => {
  test("shows a card for every game", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /game hub/i })).toBeInTheDocument();
    ["Temple Dash", "Tic Tac Toe", "Connect Four", "Memory Match", "Rock Paper Scissors", "Snake", "Coloring Book", "Ludo", "Sudoku"]
      .forEach((name) => {
        expect(screen.getByRole("button", { name: new RegExp(`^${name}`, "i") })).toBeInTheDocument();
      });
  });

  test("Temple Dash comes first, the rest are in A to Z order", () => {
    render(<App />);
    const names = [...document.querySelectorAll(".game-card .card-name")].map((n) => n.textContent);
    expect(names[0]).toBe("Temple Dash");
    const rest = names.slice(1);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
  });

  test("Temple Dash starts and shows its controls", () => {
    render(<App />);
    openGame("Temple Dash");
    expect(screen.getByRole("button", { name: /start running/i })).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: /start running/i }));
    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /jump/i })).toBeInTheDocument();
  });

  test("opens a game and goes back to the hub", () => {
    render(<App />);
    openGame("Memory Match");
    expect(screen.getByRole("heading", { name: /memory match/i })).toBeInTheDocument();

    userEvent.click(screen.getByRole("button", { name: /all games/i }));
    expect(screen.getByRole("heading", { name: /game hub/i })).toBeInTheDocument();
  });
});

describe("tic tac toe", () => {
  beforeEach(() => {
    render(<App />);
    openGame("Tic Tac Toe");
  });

  test("X goes first and turns alternate", () => {
    expect(screen.getByText(/your turn/i)).toHaveTextContent("X");
    userEvent.click(square(1));
    expect(square(1)).toHaveAccessibleName("Square 1, X");
    expect(screen.getByText(/your turn/i)).toHaveTextContent("O");
  });

  test("announces the winner and updates the score", () => {
    [1, 4, 2, 5, 3].forEach((n) => userEvent.click(square(n))); // X takes the top row
    expect(screen.getByText(/wins!/i)).toHaveTextContent("X wins!");
    expect(screen.getByText("Player X").nextSibling).toHaveTextContent("1");
  });

  test("detects a draw", () => {
    [1, 2, 3, 5, 4, 6, 8, 7, 9].forEach((n) => userEvent.click(square(n)));
    expect(screen.getByText(/it's a draw/i)).toBeInTheDocument();
  });

  test("New game clears the board but keeps the score", () => {
    [1, 4, 2, 5, 3].forEach((n) => userEvent.click(square(n)));
    userEvent.click(screen.getByRole("button", { name: /new game/i }));
    expect(square(1)).toHaveAccessibleName("Square 1, empty");
    expect(screen.getByText("Player X").nextSibling).toHaveTextContent("1");
  });
});

describe("connect four", () => {
  test("four in a column wins", () => {
    render(<App />);
    openGame("Connect Four");
    const col = (n) => screen.getByRole("button", { name: new RegExp(`column ${n}$`) });

    [1, 2, 1, 2, 1, 2, 1].forEach((n) => userEvent.click(col(n))); // Player 1 stacks column 1
    expect(screen.getByText(/wins!/i)).toHaveTextContent("Player 1 wins!");
  });
});

describe("online rooms", () => {
  test("make a room from the main page, see the code in the game, and leave", async () => {
    render(<App />);
    userEvent.click(screen.getByRole("radio", { name: "Connect Four" }));
    userEvent.click(screen.getByRole("button", { name: /create room/i }));
    const code = await screen.findByLabelText(/^Room code [A-Z0-9] /);
    expect(code.textContent).toHaveLength(5);
    expect(code.textContent[0]).toBe("C"); // the first letter says which game
    userEvent.click(screen.getByRole("button", { name: "Leave" }));
    expect(screen.queryByLabelText(/^Room code/)).not.toBeInTheDocument();
  });

  test("a bad code is rejected on the main page", () => {
    render(<App />);
    userEvent.type(screen.getByLabelText("Room code"), "AB1");
    userEvent.click(screen.getByRole("button", { name: "Join" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/doesn't look like a room code/i);
  });

  test("games show no room box until you are in a room", () => {
    render(<App />);
    openGame("Tic Tac Toe");
    expect(screen.queryByRole("button", { name: /create room/i })).not.toBeInTheDocument();
  });
});

describe("memory match", () => {
  test("counts a move after two cards are flipped", () => {
    render(<App />);
    openGame("Memory Match");
    expect(screen.getAllByRole("button", { name: /^Card/ })).toHaveLength(16);

    userEvent.click(screen.getByRole("button", { name: /^Card 1,/ }));
    userEvent.click(screen.getByRole("button", { name: /^Card 2,/ }));
    expect(screen.getByText("Moves").nextSibling).toHaveTextContent("1");
  });
});

describe("rock paper scissors", () => {
  test("paper beats rock", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // computer picks rock
    render(<App />);
    openGame("Rock Paper Scissors");
    userEvent.click(screen.getByRole("button", { name: /^paper$/i }));

    expect(screen.getByText(/you win!/i)).toBeInTheDocument();
    expect(screen.getByText("You", { selector: ".score-label" }).nextSibling).toHaveTextContent("1");
    Math.random.mockRestore();
  });
});

describe("snake", () => {
  test("starts moving when an arrow key is pressed", () => {
    render(<App />);
    openGame("Snake");
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();

    userEvent.keyboard("{arrowup}");
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });
});

describe("snake modes", () => {
  test("has three modes and rocks appear in Rocks mode", () => {
    render(<App />);
    openGame("Snake");
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    userEvent.click(screen.getByRole("radio", { name: "Rocks" }));
    expect(screen.getByText(/more rocks every level/i)).toBeInTheDocument();
  });
});

describe("sudoku", () => {
  test("has clues, accepts a number, and a hint fills a square", () => {
    render(<App />);
    openGame("Sudoku");
    const squares = screen.getAllByRole("button", { name: /^Row \d, column \d/ });
    expect(squares).toHaveLength(81);
    expect(squares.filter((s) => /given/.test(s.getAttribute("aria-label"))).length).toBeGreaterThan(25);

    const left = () => Number(screen.getByText("Left").nextSibling.textContent);
    const before = left();
    userEvent.click(screen.getByRole("button", { name: "Hint" }));
    expect(left()).toBe(before - 1);
  });
});

describe("ludo", () => {
  test("starts a game against the computer and you roll first", () => {
    render(<App />);
    openGame("Ludo");
    userEvent.click(screen.getByRole("radio", { name: "2 players" }));
    userEvent.click(screen.getByRole("button", { name: "Start game" }));
    expect(screen.getAllByRole("img", { name: /^Dice/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Roll dice" })).toBeEnabled();
    expect(screen.getByText(/your turn/i)).toBeInTheDocument();
  });
});

describe("coloring book", () => {
  beforeEach(() => {
    render(<App />);
    openGame("Coloring Book");
  });

  const colour = (n) => screen.getByRole("radio", { name: new RegExp(`^Color ${n},`) });
  const part = (re) => screen.getAllByRole("button", { name: re })[0];

  test("a part only takes the colour that matches its number", () => {
    userEvent.click(colour(2));
    // the first background part is number 1, so colour 2 should be refused
    userEvent.click(part(/^Background 1, number 1, not coloured/));
    expect(screen.getByText(/that part is number 1/i)).toBeInTheDocument();
    expect(part(/^Background 1/)).toHaveAccessibleName(/not coloured/);

    userEvent.click(colour(1));
    userEvent.click(part(/^Background 1, number 1, not coloured/));
    expect(part(/^Background 1/)).toHaveAccessibleName("Background 1, number 1, coloured");
  });

  test("the palette shows how many parts are left and counts down", () => {
    expect(colour(2)).toHaveAccessibleName("Color 2, Sky blue, 12 left");
    userEvent.click(colour(2));
    userEvent.click(part(/^Outer ring 1, number 2, not coloured/));
    expect(colour(2)).toHaveAccessibleName("Color 2, Sky blue, 11 left");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  });

  test("undo and clear put the picture back", () => {
    userEvent.click(colour(1));
    userEvent.click(part(/^Background 1/));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");

    userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");

    userEvent.click(part(/^Background 1/));
    userEvent.click(screen.getByRole("button", { name: /clear picture/i }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  test("finishing a colour moves on to the next one", () => {
    // Mandala has exactly one part of colour 1 (the background)
    userEvent.click(part(/^Background 1/));
    expect(colour(1)).toHaveAccessibleName("Color 1, Navy, finished");
    expect(colour(2)).toHaveAttribute("aria-checked", "true");
  });

  test("remembers your colouring when you leave and come back", () => {
    userEvent.click(part(/^Background 1/));
    userEvent.click(screen.getByRole("button", { name: /all games/i }));
    openGame("Coloring Book");
    expect(part(/^Background 1/)).toHaveAccessibleName("Background 1, number 1, coloured");
  });

  test("a new random picture replaces the old one", () => {
    userEvent.click(screen.getByRole("tab", { name: /random/i }));
    const ids = () => screen.getAllByRole("button", { name: /number \d, not coloured/ }).map((e) => e.getAttribute("data-id"));
    const before = ids()[0];
    userEvent.click(screen.getByRole("button", { name: /new random picture/i }));
    expect(ids()[0]).not.toBe(before);
  });

  test("offers a download of the picture", () => {
    expect(screen.getByRole("button", { name: "Download image" })).toBeEnabled();
  });

  test("zoom in and out", () => {
    expect(screen.getByText("Zoom 100%")).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("Zoom 150%")).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(screen.getByText("Zoom 100%")).toBeInTheDocument();
  });

  test("has three detailed pictures and a random one", () => {
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    userEvent.click(screen.getByRole("tab", { name: /random/i }));
    expect(screen.getAllByRole("button", { name: /number \d, not coloured/ }).length).toBeGreaterThan(40);
    userEvent.click(screen.getByRole("tab", { name: /butterfly/i }));
    expect(screen.getAllByRole("button", { name: /number \d, not coloured/ }).length).toBeGreaterThan(50);
  });
});
