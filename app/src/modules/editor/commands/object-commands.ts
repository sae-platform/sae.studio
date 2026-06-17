import type { Command } from "./command-manager";
import type { CanvasObject } from "@/modules/editor/object-registry";

type EditorState = CanvasObject[];

export class AddObjectCommand implements Command<EditorState> {
  public description: string;

  constructor(private obj: CanvasObject) {
    this.description = `Agregar ${obj.type}`;
  }

  execute(state: EditorState): EditorState {
    return [...state, this.obj];
  }

  undo(state: EditorState): EditorState {
    return state.filter((o) => o.id !== this.obj.id);
  }
}

export class DeleteObjectsCommand implements Command<EditorState> {
  public description: string;
  private removed: CanvasObject[] = [];

  constructor(private ids: string[]) {
    this.description = `Eliminar ${ids.length} objeto(s)`;
  }

  execute(state: EditorState): EditorState {
    this.removed = state.filter((o) => this.ids.includes(o.id));
    return state.filter((o) => !this.ids.includes(o.id));
  }

  undo(state: EditorState): EditorState {
    return [...state, ...this.removed];
  }
}

export class UpdateObjectCommand implements Command<EditorState> {
  public description: string;
  private previous: CanvasObject | null = null;

  constructor(private id: string, private updates: Partial<CanvasObject>) {
    this.description = `Modificar ${updates.type || "objeto"}`;
  }

  execute(state: EditorState): EditorState {
    return state.map((o) => {
      if (o.id === this.id) {
        this.previous = { ...o };
        return { ...o, ...this.updates };
      }
      return o;
    });
  }

  undo(state: EditorState): EditorState {
    if (!this.previous) return state;
    return state.map((o) => (o.id === this.id ? this.previous! : o));
  }
}

export class MoveObjectsCommand implements Command<EditorState> {
  public description = "Mover objetos";
  private movedIds: string[] = [];

  constructor(private ids: string[], private dx: number, private dy: number) {}

  execute(state: EditorState): EditorState {
    this.movedIds = this.ids;
    return state.map((o) =>
      this.ids.includes(o.id) ? { ...o, x: o.x + this.dx, y: o.y + this.dy } : o,
    );
  }

  undo(state: EditorState): EditorState {
    return state.map((o) =>
      this.movedIds.includes(o.id) ? { ...o, x: o.x - this.dx, y: o.y - this.dy } : o,
    );
  }
}

export class GroupObjectsCommand implements Command<EditorState> {
  public description = "Agrupar objetos";
  private groupId = "";

  constructor(private ids: string[]) {}

  execute(state: EditorState): EditorState {
    this.groupId = `g-${crypto.randomUUID()}`;
    return state.map((o) => (this.ids.includes(o.id) ? { ...o, groupId: this.groupId } : o));
  }

  undo(state: EditorState): EditorState {
    return state.map((o) => (o.groupId === this.groupId ? { ...o, groupId: undefined } : o));
  }
}

export class UngroupObjectsCommand implements Command<EditorState> {
  public description = "Desagrupar objetos";
  private affectedGroupIds: string[] = [];

  constructor(private ids: string[]) {}

  execute(state: EditorState): EditorState {
    this.affectedGroupIds = [
      ...new Set(
        state.filter((o) => this.ids.includes(o.id) && o.groupId).map((o) => o.groupId!),
      ),
    ];
    return state.map((o) =>
      o.groupId && this.affectedGroupIds.includes(o.groupId) ? { ...o, groupId: undefined } : o,
    );
  }

  undo(state: EditorState): EditorState {
    let gIdx = 0;
    return state.map((o) => {
      if (this.ids.includes(o.id) && o.groupId === undefined) {
        const gid = this.affectedGroupIds[0] || `g-${crypto.randomUUID()}`;
        return { ...o, groupId: gid };
      }
      return o;
    });
  }
}

export class ReorderObjectsCommand implements Command<EditorState> {
  public description = "Reordenar capas";
  private previous: EditorState = [];

  constructor(private newOrder: EditorState) {}

  execute(state: EditorState): EditorState {
    this.previous = state;
    return this.newOrder;
  }

  undo(_state: EditorState): EditorState {
    return this.previous;
  }
}
