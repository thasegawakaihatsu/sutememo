import { ImRedo } from 'react-icons/im';
import { Button } from '../context/material-providers';

type Props = {
  canRedo: boolean;
  handleRedoClick: () => void;
};

export default function Redo(props: Props) {
  const { canRedo, handleRedoClick } = props;

  return (
    <>
      <Button
        tabIndex={0}
        aria-label="Undo"
        role="button"
        color="white"
        className={`!fixed bottom-[max(calc(env(safe-area-inset-bottom)+72px),94px)] right-[22px] rounded-full p-[26px] text-lg !shadow-none xs:p-7 xs:text-xl ${
          canRedo
            ? ' text-gray-500 hover:bg-blue-gray-50 hover:brightness-[102%]'
            : 'text-gray-400'
        }`}
        ripple={canRedo}
        disabled={!canRedo}
        onClick={handleRedoClick}
      >
        <ImRedo />
      </Button>
    </>
  );
}
