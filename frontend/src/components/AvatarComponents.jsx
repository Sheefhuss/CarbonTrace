import React, { useState } from 'react';
import clsx from 'clsx';

export const AVATARS = [
  { img: '/avatars/avatar_0.png',  emoji: '🌿', bg: 'bg-green-500/20',   label: 'Leaf'       },
  { img: '/avatars/avatar_1.png',  emoji: '🦋', bg: 'bg-purple-500/20',  label: 'Butterfly'  },
  { img: '/avatars/avatar_2.png',  emoji: '🐢', bg: 'bg-teal-500/20',    label: 'Turtle'     },
  { img: '/avatars/avatar_3.png',  emoji: '🦊', bg: 'bg-orange-500/20',  label: 'Fox'        },
  { img: '/avatars/avatar_4.png',  emoji: '🐬', bg: 'bg-blue-500/20',    label: 'Dolphin'    },
  { img: '/avatars/avatar_5.png',  emoji: '🌻', bg: 'bg-yellow-500/20',  label: 'Sunflower'  },
  { img: '/avatars/avatar_6.png',  emoji: '🦁', bg: 'bg-amber-500/20',   label: 'Lion'       },
  { img: '/avatars/avatar_7.png',  emoji: '🐼', bg: 'bg-gray-500/20',    label: 'Panda'      },
  { img: '/avatars/avatar_8.png',  emoji: '🦅', bg: 'bg-sky-500/20',     label: 'Eagle'      },
  { img: '/avatars/avatar_9.png',  emoji: '🌊', bg: 'bg-cyan-500/20',    label: 'Wave'       },
  { img: '/avatars/avatar_10.png', emoji: '🦉', bg: 'bg-indigo-500/20',  label: 'Owl'        },
  { img: '/avatars/avatar_11.png', emoji: '🐘', bg: 'bg-slate-500/20',   label: 'Elephant'   },
  { img: '/avatars/avatar_12.png', emoji: '🌺', bg: 'bg-rose-500/20',    label: 'Hibiscus'   },
  { img: '/avatars/avatar_13.png', emoji: '🦚', bg: 'bg-emerald-500/20', label: 'Peacock'    },
  { img: '/avatars/avatar_14.png', emoji: '🐉', bg: 'bg-red-500/20',     label: 'Dragon'     },
];

export function AvatarDisplay({ index, size = 'md' }) {
  const av = AVATARS[index ?? 0] || AVATARS[0];
  const [imgFailed, setImgFailed] = useState(false);

  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  }[size] || 'w-10 h-10';

  const emojiSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
  }[size] || 'text-xl';

  if (imgFailed || !av.img) {
    return (
      <div className={clsx('rounded-xl flex items-center justify-center shrink-0', sizeClass, av.bg)}>
        <span className={emojiSize}>{av.emoji}</span>
      </div>
    );
  }

  return (
    <div className={clsx('rounded-xl overflow-hidden shrink-0 flex items-center justify-center', sizeClass, av.bg)}>
      <img
        src={av.img}
        alt={av.label}
        className="w-full h-full object-cover"
        onError={() => setImgFailed(true)}
      />
    </div>
  );
}

export function AvatarPickerModal({ current, onSave, onClose }) {
  const [selected, setSelected] = useState(current ?? 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-forest-900 border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h2 className="font-bold text-lg text-white">Choose Your Avatar</h2>
            <p className="text-xs text-forest-400">Pick a character that represents you</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-white/10 text-forest-400 hover:text-white flex items-center justify-center">
            ✕
          </button>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-5 gap-2 mb-5">
            {AVATARS.map((av, i) => (
              <AvatarButton key={i} av={av} index={i} selected={selected} onSelect={setSelected} />
            ))}
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 mb-4">
            <AvatarDisplay index={selected} size="lg" />
            <div>
              <p className="text-white font-semibold">{AVATARS[selected]?.label}</p>
              <p className="text-xs text-forest-400">Your selected avatar</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
            <button onClick={() => onSave(selected)} className="btn-primary flex-1 text-sm">Save Avatar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AvatarButton({ av, index, selected, onSelect }) {
  const [imgFailed, setImgFailed] = useState(false);
  const isSelected = selected === index;

  return (
    <button type="button" onClick={() => onSelect(index)} title={av.label}
      className={clsx(
        'flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all',
        isSelected
          ? 'border-forest-400 bg-forest-500/20 scale-105'
          : 'border-transparent hover:border-white/20 hover:bg-white/5'
      )}>
      <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden', av.bg)}>
        {!imgFailed ? (
          <img src={av.img} alt={av.label} className="w-full h-full object-cover"
            onError={() => setImgFailed(true)} />
        ) : (
          <span className="text-2xl">{av.emoji}</span>
        )}
      </div>
      <span className={clsx('text-xs leading-tight text-center truncate w-full',
        isSelected ? 'text-forest-200 font-semibold' : 'text-forest-500')}>
        {av.label}
      </span>
    </button>
  );
}
