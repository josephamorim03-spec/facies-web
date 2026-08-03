// Arquivo de declaração puro (sem import/export) — todos os tipos são globais.

interface GoogleGSICredentialResponse {
  credential?: string;
}

interface GoogleGSIButtonConfig {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  locale?: string;
  width?: number;
}

interface GoogleGSIInitConfig {
  client_id: string;
  callback: (response: GoogleGSICredentialResponse) => void;
  auto_select?: boolean;
}

interface GoogleGSI {
  initialize: (config: GoogleGSIInitConfig) => void;
  renderButton: (container: HTMLElement, config: GoogleGSIButtonConfig) => void;
}

interface Window {
  google?: {
    account: {
      id?: GoogleGSI;
    };
  };
}
