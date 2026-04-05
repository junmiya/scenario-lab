import { useRef, useCallback, useEffect, useState } from 'react';
import type { EditorState } from '../stores/editorStore';

const MAX_HISTORY = 10;
const DEBOUNCE_MS = 500;

function stateFingerprint(s: EditorState): string {
    return `${s.title}\0${s.authorName}\0${s.synopsis}\0${s.content}\0${s.characterText}`;
}

export interface UndoRedoControls {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export function useUndoRedo(
    state: EditorState,
    setState: React.Dispatch<React.SetStateAction<EditorState>>,
): UndoRedoControls {
    const past = useRef<EditorState[]>([]);
    const future = useRef<EditorState[]>([]);
    const lastFingerprint = useRef<string>(stateFingerprint(state));
    const lastState = useRef<EditorState>(state);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const skipNextRecord = useRef(false);
    const [, setTick] = useState(0);

    useEffect(() => {
        if (skipNextRecord.current) {
            skipNextRecord.current = false;
            lastFingerprint.current = stateFingerprint(state);
            lastState.current = state;
            return;
        }

        const fp = stateFingerprint(state);
        if (fp === lastFingerprint.current) return;

        const prevState = lastState.current;

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            past.current = [...past.current.slice(-(MAX_HISTORY - 1)), prevState];
            future.current = [];
            lastFingerprint.current = stateFingerprint(state);
            lastState.current = state;
            setTick((t) => t + 1);
        }, DEBOUNCE_MS);

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [state]);

    const undo = useCallback(() => {
        if (past.current.length === 0) return;
        const prev = past.current[past.current.length - 1]!;
        past.current = past.current.slice(0, -1);
        future.current = [...future.current, state];
        skipNextRecord.current = true;
        setState(prev);
        setTick((t) => t + 1);
    }, [state, setState]);

    const redo = useCallback(() => {
        if (future.current.length === 0) return;
        const next = future.current[future.current.length - 1]!;
        future.current = future.current.slice(0, -1);
        past.current = [...past.current, state];
        skipNextRecord.current = true;
        setState(next);
        setTick((t) => t + 1);
    }, [state, setState]);

    return {
        undo,
        redo,
        canUndo: past.current.length > 0,
        canRedo: future.current.length > 0,
    };
}
