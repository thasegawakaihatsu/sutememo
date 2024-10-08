import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { format } from 'date-fns';
import {
  Dispatch,
  FocusEvent,
  KeyboardEvent,
  MutableRefObject,
  RefObject,
  SetStateAction,
  forwardRef,
  useCallback,
  useContext,
} from 'react';
import { isDesktop, isMobile, isTablet } from 'react-device-detect';
import { GoGrabber, GoX } from 'react-icons/go';

import { ThemeContext } from '@/contexts/theme-provider';
import { IndexedDBResult } from '@/types/IndexedDBResult';
import { ScrollAmount } from '@/types/ScrollAmount';
import { Todo } from '@/types/Todo';
import { ariaLabel } from '@/utils/ariaLabel';
import { bgVariants, ringVariants } from '@/utils/colorVariants';
import { formatPattern } from '@/utils/date';
import { sortTodosOrderByDisplayOrder } from '@/utils/sortTodosOrderByDisplayOrder';

type Props = {
  id: string;
  displayOrder: number;
  name: string;
  todos: Todo[];
  editableRef: RefObject<HTMLSpanElement>;
  todosHistoryRef: MutableRefObject<Todo[][]>;
  historyCurrentIndex: MutableRefObject<number>;
  scrollAmountHistoryRef: MutableRefObject<ScrollAmount[]>;
  setCanUndo: Dispatch<SetStateAction<boolean>>;
  setCanRedo: Dispatch<SetStateAction<boolean>>;
  setTodos: Dispatch<SetStateAction<Todo[]>>;
  updatePartialIndexedDB: (
    id: string,
    updatedText: string,
    updatedAt: string,
  ) => Promise<IndexedDBResult>;
  updateAllIndexedDB: (todos: Todo[]) => Promise<IndexedDBResult>;
  deleteIndexedDB: (id: string) => Promise<IndexedDBResult>;
};

export default forwardRef(function SortableItem(props: Props, _ref) {
  const {
    id,
    name,
    todos,
    editableRef,
    todosHistoryRef,
    historyCurrentIndex,
    scrollAmountHistoryRef,
    setCanUndo,
    setCanRedo,
    setTodos,
    updatePartialIndexedDB,
    updateAllIndexedDB,
    deleteIndexedDB,
  } = props;
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id: id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { mainColor, baseColor, mode } = useContext(ThemeContext);

  const handleDeleteButtonClick = async () => {
    const targetId = id;
    const prevTodos = todos.map((todo) => todo);
    const filterdTodos: Todo[] = prevTodos.filter(
      (todo) => todo.id !== targetId,
    );
    const sortedTodos: Todo[] = sortTodosOrderByDisplayOrder(filterdTodos);
    setTodos(sortedTodos);
    scrollAmountHistoryRef.current.push({
      x: window.scrollX,
      y: window.scrollY,
    });
    todosHistoryRef.current.push(sortedTodos);
    const lastIndex = todosHistoryRef.current.length - 1;
    historyCurrentIndex.current =
      lastIndex === historyCurrentIndex.current + 1
        ? lastIndex
        : historyCurrentIndex.current + 1;
    setCanUndo(true);
    try {
      await deleteIndexedDB(targetId);
      updateAllIndexedDB(sortedTodos);
    } catch (error) {
      console.error(error);
      setTodos(prevTodos);
    }
  };

  const handleBlurContentEditable = async (event: FocusEvent) => {
    const now = format(new Date(), formatPattern);
    const targetId = id;
    const targetText = name;
    const prevTodos = todos.map((todo) => todo);
    const updatedText = (event.target as HTMLElement).innerText;
    const isEdited = targetText !== updatedText;
    if (updatedText) {
      if (!isEdited) return;
      const updatedTodos: Todo[] = prevTodos.map((todo) =>
        todo.id === targetId
          ? {
              ...todo,
              name: updatedText,
              updatedAt: now,
            }
          : todo,
      );
      setTodos(updatedTodos);
      scrollAmountHistoryRef.current.push({
        x: window.scrollX,
        y: window.scrollY,
      });
      todosHistoryRef.current.push(updatedTodos);
      const lastIndex = todosHistoryRef.current.length - 1;
      historyCurrentIndex.current = lastIndex;
      setCanUndo(true);
      setCanRedo(false);
      try {
        updatePartialIndexedDB(targetId, updatedText, now);
      } catch (error) {
        console.error(error);
        setTodos(prevTodos);
      }
    } else {
      const filterdTodos: Todo[] = prevTodos.filter(
        (todo) => todo.id !== targetId,
      );
      const sortedTodos: Todo[] = sortTodosOrderByDisplayOrder(filterdTodos);
      setTodos(sortedTodos);
      scrollAmountHistoryRef.current.push({
        x: window.scrollX,
        y: window.scrollY,
      });
      todosHistoryRef.current.push(sortedTodos);
      const lastIndex = todosHistoryRef.current.length - 1;
      historyCurrentIndex.current =
        lastIndex === historyCurrentIndex.current + 1
          ? lastIndex
          : historyCurrentIndex.current + 1;
      setCanUndo(true);
      setCanRedo(false);
      try {
        await deleteIndexedDB(targetId);
        updateAllIndexedDB(sortedTodos);
      } catch (error) {
        console.error(error);
        setTodos(prevTodos);
      }
    }
  };

  const handleKeyDownContentEditable = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      const targetElement = event.target as HTMLElement;
      targetElement.blur();
    }
  }, []);

  return (
    <li
      ref={setNodeRef}
      role="list"
      style={style}
      className={clsx(
        `flex items-center justify-between gap-1.5 rounded-md px-1.5 py-2 sm:gap-2.5 sm:px-2 ${
          bgVariants[`${baseColor}`]
        }`,
        {
          'opacity-30': isDragging === true,
          'text-gray-800 brightness-[1.03]': mode === 'light',
          'text-gray-400 brightness-125': mode === 'dark',
        },
      )}
    >
      <div className="flex flex-1 items-center gap-1.5 sm:gap-2.5">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={window.matchMedia('(display-mode: standalone)').matches}
          className={clsx(
            `select-none self-stretch rounded bg-transparent px-3 py-4 text-[26px] hover:cursor-grab sm:px-4 sm:py-5 active:${
              bgVariants[`${baseColor}`]
            } hover:${bgVariants[`${baseColor}`]}`,
            {
              'text-gray-800 hover:brightness-95 active:brightness-90':
                mode === 'light',
              'text-gray-400 hover:brightness-125 active:brightness-150':
                mode === 'dark',
            },
          )}
        >
          <GoGrabber />
        </button>
        <span
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          inputMode="text"
          role="textbox"
          tabIndex={0}
          className={clsx(
            `max-w-[calc(100svw-130px)] whitespace-break-spaces break-words rounded-sm px-1.5 py-1 text-lg leading-snug ring-0 focus:w-full focus:outline-none focus-visible:ring-2 sm:max-w-[calc(100svw-136px)] sm:rounded ${
              ringVariants[`${mainColor}`]
            }`,
            {
              'text-gray-900': mode === 'light',
              'text-gray-300': mode === 'dark',
            },
          )}
          onBlur={handleBlurContentEditable}
          onKeyDown={handleKeyDownContentEditable}
        >
          {name}
        </span>
        {(isMobile || isTablet) && (
          <button
            ref={setActivatorNodeRef}
            className="flex-1 self-stretch bg-transparent"
            {...listeners}
            {...attributes}
            disabled
          />
        )}
      </div>
      <button
        aria-label={ariaLabel.deleteButton}
        className={clsx(
          `select-none rounded px-3 py-4 text-xl hover:cursor-pointer sm:px-4 sm:py-5 active:${
            bgVariants[`${baseColor}`]
          } hover:${bgVariants[`${baseColor}`]}`,
          {
            'self-stretch': isDesktop === true,
            'text-gray-800 hover:brightness-95 active:brightness-90':
              mode === 'light',
            'text-gray-400 hover:brightness-125 active:brightness-150':
              mode === 'dark',
          },
        )}
        onClick={handleDeleteButtonClick}
      >
        <GoX />
      </button>
    </li>
  );
});
