export interface RegistrationButtonType {
  styles?: string;
  buttonText?: string;
  variant?: "default" | "outline" | "link" | "destructive" | "secondary" | "ghost" | null | undefined;
  onClick?: () => void;
}
