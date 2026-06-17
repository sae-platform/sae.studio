export interface Command<TState = unknown> {
  execute(state: TState): TState;
  undo(state: TState): TState;
  description: string;
}

export class CommandManager<TState> {
  private history: { command: Command<TState>; before: TState }[] = [];
  private future: { command: Command<TState>; before: TState }[] = [];
  private maxEntries: number;

  constructor(maxEntries = 50) {
    this.maxEntries = maxEntries;
  }

  execute(command: Command<TState>, currentState: TState): TState {
    const entry = { command, before: currentState };
    this.history.push(entry);
    if (this.history.length > this.maxEntries) this.history.shift();
    this.future = [];
    return command.execute(currentState);
  }

  undo(currentState: TState): { state: TState; description: string } | null {
    const entry = this.history.pop();
    if (!entry) return null;
    this.future.push(entry);
    return { state: entry.command.undo(entry.before), description: entry.command.description };
  }

  redo(currentState: TState): { state: TState; description: string } | null {
    const entry = this.future.pop();
    if (!entry) return null;
    this.history.push(entry);
    return { state: entry.command.execute(entry.before), description: entry.command.description };
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.history = [];
    this.future = [];
  }
}
