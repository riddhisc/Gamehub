// Small line icons for the game cards. They draw in the card's accent colour.

function Icon({ children }) {
  return (
    <svg
      className="card-icon"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const TicTacToeIcon = () => (
  <Icon>
    <path d="M24 8v48M40 8v48M8 24h48M8 40h48" />
    <path d="M11 11l8 8M19 11l-8 8" />
    <circle cx="32" cy="32" r="5" />
  </Icon>
);

export const ConnectFourIcon = () => (
  <Icon>
    <circle cx="20" cy="20" r="7" />
    <circle cx="44" cy="20" r="7" />
    <circle cx="20" cy="44" r="7" fill="currentColor" />
    <circle cx="44" cy="44" r="7" fill="currentColor" />
  </Icon>
);

export const MemoryIcon = () => (
  <Icon>
    <rect x="8" y="14" width="26" height="36" rx="5" />
    <rect x="30" y="14" width="26" height="36" rx="5" fill="var(--panel)" />
    <circle cx="43" cy="32" r="6" />
  </Icon>
);

export const RockPaperScissorsIcon = () => (
  <Icon>
    <path d="M20 8l24 34M44 8L20 42" />
    <circle cx="18" cy="50" r="7" />
    <circle cx="46" cy="50" r="7" />
  </Icon>
);

export const SnakeIcon = () => (
  <Icon>
    <path d="M8 52h30V34H20V18h30" strokeWidth="6" />
    <circle cx="54" cy="52" r="4" fill="currentColor" />
  </Icon>
);

export const ColoringIcon = () => (
  <Icon>
    <path d="M32 8C17 8 8 19 8 31c0 13 10 25 24 25 5 0 6-4 3-7-3-4 0-8 5-8h8c6 0 10-4 10-9C58 18 47 8 32 8z" />
    <circle cx="22" cy="28" r="3.5" fill="currentColor" />
    <circle cx="33" cy="20" r="3.5" fill="currentColor" />
    <circle cx="45" cy="27" r="3.5" fill="currentColor" />
    <circle cx="23" cy="40" r="3.5" fill="currentColor" />
  </Icon>
);

export const LudoIcon = () => (
  <Icon>
    <rect x="8" y="8" width="48" height="48" rx="8" />
    <path d="M8 26h48M8 38h48M26 8v48M38 8v48" />
    <circle cx="17" cy="17" r="4" fill="currentColor" />
    <circle cx="47" cy="47" r="4" fill="currentColor" />
  </Icon>
);

export const SudokuIcon = () => (
  <Icon>
    <rect x="8" y="8" width="48" height="48" rx="6" />
    <path d="M24 8v48M40 8v48M8 24h48M8 40h48" />
    <path d="M13 16h6M44 32h6M29 48h6" strokeWidth="5" />
  </Icon>
);

export const TempleDashIcon = () => (
  <Icon>
    <path d="M6 56L26 28h12l20 28" />
    <path d="M32 56V30" strokeDasharray="4 5" />
    <path d="M10 22h44M16 14h32M22 8h20" />
    <circle cx="32" cy="42" r="4" fill="currentColor" />
  </Icon>
);
