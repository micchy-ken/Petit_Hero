import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, HelpCircle, Check, X } from 'lucide-react';

interface PopupContextType {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export function usePopup() {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within a CustomPopupProvider');
  }
  return context;
}

interface DialogState {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  resolve: ((value: any) => void) | null;
}

export function CustomPopupProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    resolve: null,
  });

  const showAlert = (message: string, title: string = 'システム通知') => {
    return new Promise<void>((resolve) => {
      setDialog({
        isOpen: true,
        type: 'alert',
        title,
        message,
        resolve: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve();
        },
      });
    });
  };

  const showConfirm = (message: string, title: string = '確認が必要') => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        resolve: (value: boolean) => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve(value);
        },
      });
    });
  };

  const handleConfirm = () => {
    if (dialog.resolve) {
      if (dialog.type === 'confirm') {
        dialog.resolve(true);
      } else {
        dialog.resolve(undefined);
      }
    }
  };

  const handleCancel = () => {
    if (dialog.resolve && dialog.type === 'confirm') {
      dialog.resolve(false);
    }
  };

  return (
    <PopupContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AnimatePresence>
        {dialog.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* 背景オーバーレイ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={dialog.type === 'alert' ? handleConfirm : undefined}
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm"
            />

            {/* ダイアログ本体 */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl"
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  dialog.type === 'confirm' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {dialog.type === 'confirm' ? (
                    <HelpCircle className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-100 mb-1">
                    {dialog.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {dialog.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {dialog.type === 'confirm' && (
                  <button
                    onClick={handleCancel}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-all active:scale-[0.98]"
                  >
                    <X className="h-4 w-4" />
                    キャンセル
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all active:scale-[0.98] ${
                    dialog.type === 'confirm'
                      ? 'bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 shadow-md shadow-indigo-600/10'
                      : 'bg-amber-600 hover:bg-amber-500 border border-amber-500 shadow-md shadow-amber-600/10'
                  }`}
                >
                  <Check className="h-4 w-4" />
                  {dialog.type === 'confirm' ? '確定' : '了解'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PopupContext.Provider>
  );
}
