'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AddButton from './add-button';
import Redo from './redo';
import TodoList from './todo-list';
import Undo from './undo';
import { Todo } from '@/types/Todo';
import {
  clearIndexedDB,
  createIndexedDB,
  deleteIndexedDB,
  fetchIndexedDB,
  insertIndexedDB,
  updateAllIndexedDB,
  updatePartialIndexedDB,
} from '@/utils/indexedDB';
import { registerServiceWorker } from '@/utils/registerServiceWorker';

export default function Main() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const editableRef = useRef<HTMLSpanElement>(null);
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const todosHistoryRef = useRef<Todo[][]>([]);
  const todosHistoryCurrentIndex = useRef(0);

  const scrollToBottom = function () {
    scrollBottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  };

  const handleUndoClick = async function () {
    const isOldest = todosHistoryCurrentIndex.current - 1 < 0;
    todosHistoryCurrentIndex.current = isOldest
      ? 0
      : todosHistoryCurrentIndex.current - 1;
    setCanUndo(
      todosHistoryCurrentIndex.current > 0 &&
        todosHistoryRef.current.length >= 2,
    );
    setCanRedo(
      todosHistoryCurrentIndex.current < todosHistoryRef.current.length - 1 &&
        todosHistoryRef.current.length >= 2,
    );
    const prevTodos = todosHistoryRef.current[todosHistoryCurrentIndex.current];
    const currentTodos =
      todosHistoryRef.current[todosHistoryCurrentIndex.current + 1];
    if (canUndo) {
      try {
        await clearIndexedDB();
        updateAllIndexedDB(prevTodos);
        setTodos(prevTodos);
        scrollToBottom();
      } catch (error) {
        console.error(error);
        todosHistoryCurrentIndex.current = todosHistoryCurrentIndex.current + 1;
        updateAllIndexedDB(currentTodos);
        setTodos(currentTodos);
      }
    }
  };

  const handleRedoClick = async function () {
    const isLatest =
      todosHistoryCurrentIndex.current + 1 >= todosHistoryRef.current.length;
    todosHistoryCurrentIndex.current = isLatest
      ? todosHistoryCurrentIndex.current
      : todosHistoryCurrentIndex.current + 1;
    setCanUndo(
      todosHistoryCurrentIndex.current > 0 &&
        todosHistoryRef.current.length >= 2,
    );
    setCanRedo(
      todosHistoryCurrentIndex.current < todosHistoryRef.current.length - 1 &&
        todosHistoryRef.current.length >= 2,
    );
    const currentTodos =
      todosHistoryRef.current[todosHistoryCurrentIndex.current - 1];
    const nextTodos = todosHistoryRef.current[todosHistoryCurrentIndex.current];
    if (canRedo) {
      try {
        await clearIndexedDB();
        updateAllIndexedDB(nextTodos);
        setTodos(nextTodos);
        scrollToBottom();
      } catch (error) {
        console.error(error);
        todosHistoryCurrentIndex.current = todosHistoryCurrentIndex.current - 1;
        updateAllIndexedDB(currentTodos);
        setTodos(currentTodos);
      }
    }
  };

  const handleKeyDown = useCallback(
    async (event: KeyboardEvent) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) return;
      if (event.key === 'Enter') {
        const target = event.target as HTMLElement;
        const insertID = uuidv4();
        const prevTodos: Todo[] = todos.map((todo) => todo);
        const isEditing = target.contentEditable === 'true';
        const selection = window.getSelection();
        if (isEditing && selection?.anchorOffset === 0) {
          scrollToBottom();
        }
        if (target.nodeName === 'BODY') {
          setTodos([
            ...prevTodos,
            { id: insertID, displayOrder: prevTodos.length, name: '' },
          ]);
          try {
            await insertIndexedDB(insertID, prevTodos.length, '');
          } catch (error) {
            console.error(error);
            setTodos(prevTodos);
          }
          scrollToBottom();
          editableRef.current?.focus();
        }
      }
    },
    [todos],
  );

  const handleAddButtonMouseUp = useCallback(async () => {
    const insertID = uuidv4();
    const prevTodos: Todo[] = todos.map((todo) => todo);
    todosHistoryRef.current.push([
      ...prevTodos,
      { id: insertID, displayOrder: prevTodos.length, name: '' },
    ]);
    todosHistoryCurrentIndex.current = todosHistoryCurrentIndex.current + 1;
    setCanRedo(false);
    setCanUndo(true);
    setTodos([
      ...prevTodos,
      { id: insertID, displayOrder: prevTodos.length, name: '' },
    ]);
    try {
      insertIndexedDB(insertID, prevTodos.length, '');
    } catch (error) {
      console.error(error);
      setTodos(prevTodos);
    }
  }, [todos]);

  const handleAddButtonClick = useCallback(async () => {
    scrollToBottom();
    editableRef.current?.focus();
  }, []);

  const handleVisibilityChange = useCallback(async () => {
    if (document.visibilityState === 'visible') {
      try {
        const fetchData = await fetchIndexedDB();
        setTodos(fetchData);
      } catch (error) {
        console.error(error);
      }
    }
  }, []);

  const handleWindowFocus = useCallback(async () => {
    try {
      const fetchData = await fetchIndexedDB();
      setTodos(fetchData);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (!globalThis.window) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!globalThis.window) return;
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisibilityChange]);

  useEffect(() => {
    if (!globalThis.window) return;
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [handleWindowFocus]);

  useEffect(() => {
    if (todos === undefined) {
      setTodos([]);
    }
  }, [todos]);

  useEffect(() => {
    const init = async () => {
      try {
        await createIndexedDB();
        const fetchData = await fetchIndexedDB();
        setTodos(fetchData);
        todosHistoryRef.current = [fetchData];
      } catch (error) {
        console.error(error);
      }
    };
    registerServiceWorker();
    init();
  }, []);

  return (
    <>
      <main>
        {todos.length > 0 && (
          <>
            <TodoList
              todos={todos}
              editableRef={editableRef}
              todosHistoryRef={todosHistoryRef}
              todosHistoryCurrentIndex={todosHistoryCurrentIndex}
              setCanUndo={setCanUndo}
              setCanRedo={setCanRedo}
              setTodos={setTodos}
              updatePartialIndexedDB={updatePartialIndexedDB}
              updateAllIndexedDB={updateAllIndexedDB}
              deleteIndexedDB={deleteIndexedDB}
            />
          </>
        )}
        <Undo handleUndoClick={handleUndoClick} canUndo={canUndo} />
        <Redo handleRedoClick={handleRedoClick} canRedo={canRedo} />
        <AddButton
          handleAddButtonClick={handleAddButtonClick}
          handleAddButtonMouseUp={handleAddButtonMouseUp}
        />
        {todos.length > 0 && (
          <div
            ref={scrollBottomRef}
            className="h-[calc(env(safe-area-inset-bottom)+224px)] pwa:h-[max(calc(env(safe-area-inset-bottom)+204px),224px)]"
          />
        )}
      </main>
    </>
  );
}