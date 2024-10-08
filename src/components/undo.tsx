import clsx from 'clsx';
import { useContext } from 'react';
import { GoReply } from 'react-icons/go';

import { Button } from '@/contexts/material-providers';
import { ThemeContext } from '@/contexts/theme-provider';
import { ariaLabel } from '@/utils/ariaLabel';
import { bgVariants, colorVariants } from '@/utils/colorVariants';

type Props = {
  canUndo: boolean;
  handleUndoClick: () => void;
};

export default function Undo(props: Props) {
  const { canUndo, handleUndoClick } = props;

  const theme = useContext(ThemeContext);
  const { baseColor, mainColor, mode } = theme;

  return (
    <>
      <Button
        aria-label={ariaLabel.undoButton}
        color="white"
        disabled={!canUndo}
        ripple={canUndo}
        role="button"
        tabIndex={0}
        className={clsx(
          `rounded-full p-5 text-xl !shadow-none xs:text-xl ${
            bgVariants[`${baseColor}`]
          } ${colorVariants[`${mainColor}`]}`,
          {
            'hover:brightness-95 active:brightness-90':
              canUndo && mode === 'light',
            'hover:brightness-125 active:brightness-150':
              canUndo && mode === 'dark',
            'opacity-30': canUndo === false,
          },
        )}
        onClick={handleUndoClick}
      >
        <GoReply />
      </Button>
    </>
  );
}
