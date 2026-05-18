import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ConfirmModal, { ConfirmModalButton } from './ConfirmModal';

// ===== Types =====
type IconPreset = 'info' | 'success' | 'warning' | 'error' | 'delete' | 'question';

interface ShowOptions {
  title: string;
  message?: string;
  icon?: IconPreset | string;
  iconColor?: string;
  buttons?: ConfirmModalButton[];
}

interface ConfirmContextValue {
  /**
   * Show a branded modal. Returns a Promise that resolves when any button is pressed.
   * The resolved value is the index of the pressed button.
   */
  show: (options: ShowOptions) => Promise<number>;
  /** Shortcut: show an alert with single OK button */
  alert: (title: string, message?: string, icon?: IconPreset | string) => Promise<void>;
  /** Shortcut: show a confirm dialog with Cancel + Confirm */
  confirm: (
    title: string,
    message?: string,
    confirmText?: string,
    icon?: IconPreset | string,
  ) => Promise<boolean>;
  /** Shortcut: show a destructive confirm (Cancel + Delete) */
  confirmDelete: (title: string, message?: string, deleteText?: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

// ===== Provider =====
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ShowOptions>({
    title: '',
    message: '',
    icon: 'info',
    buttons: [],
  });
  const resolveRef = useRef<((index: number) => void) | null>(null);

  const show = useCallback((opts: ShowOptions): Promise<number> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;

      // Wrap buttons to auto-dismiss + resolve
      const wrappedButtons = (opts.buttons || [{ text: 'OK', style: 'default' as const }]).map(
        (btn, index) => ({
          ...btn,
          onPress: () => {
            setVisible(false);
            btn.onPress?.();
            resolve(index);
          },
        }),
      );

      setOptions({ ...opts, buttons: wrappedButtons });
      setVisible(true);
    });
  }, []);

  const alert = useCallback(
    async (title: string, message?: string, icon?: IconPreset | string) => {
      await show({
        title,
        message,
        icon: icon || 'info',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    },
    [show],
  );

  const confirm = useCallback(
    async (
      title: string,
      message?: string,
      confirmText = 'Xác nhận',
      icon?: IconPreset | string,
    ) => {
      const idx = await show({
        title,
        message,
        icon: icon || 'question',
        buttons: [
          { text: 'Huỷ', style: 'cancel' },
          { text: confirmText, style: 'default' },
        ],
      });
      return idx === 1;
    },
    [show],
  );

  const confirmDelete = useCallback(
    async (title: string, message?: string, deleteText = 'Xóa') => {
      const idx = await show({
        title,
        message,
        icon: 'delete',
        buttons: [
          { text: 'Huỷ', style: 'cancel' },
          { text: deleteText, style: 'destructive' },
        ],
      });
      return idx === 1;
    },
    [show],
  );

  const handleDismiss = useCallback(() => {
    setVisible(false);
    resolveRef.current?.(-1);
  }, []);

  return (
    <ConfirmContext.Provider value={{ show, alert, confirm, confirmDelete }}>
      {children}
      <ConfirmModal
        visible={visible}
        title={options.title}
        message={options.message}
        icon={options.icon}
        iconColor={options.iconColor}
        buttons={options.buttons}
        onDismiss={handleDismiss}
      />
    </ConfirmContext.Provider>
  );
}

// ===== Hook =====
export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within <ConfirmProvider>');
  }
  return ctx;
}
