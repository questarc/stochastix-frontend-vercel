export interface LlmProvider {
  id: string;
  label: string;
  default_model: string;
  models: string[];
  api_key_env: string | null;
  api_key_set: boolean;
}

export interface LlmSelection {
  provider: string;
  model: string | null;
}

export interface MethodologySection {
  title: string;
  body: string;
}
