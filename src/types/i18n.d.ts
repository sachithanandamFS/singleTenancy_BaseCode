type Replacements = Record<string, string>; // Ensure values are strings

declare module 'i18n' {
  import { EventEmitter } from 'events';
  interface ConfigureOptions {
    // Add configuration options types here
  }
  function configure(options: ConfigureOptions): void;
  function __(phrase: string, ...replace: string[]): string;
  function __n(phrase: string, count: number, ...replace: string[]): string;
  export = i18n;

  function __(phrase: string, ...replace: string[]): string;
  function __(options: { phrase: string; locale: string }, replacements?: Record<string, any>): string;
}