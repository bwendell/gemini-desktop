import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';
import type { ToastPayload } from '../../shared/types/toast';
import { createSubscription } from '../createSubscription';

export const toastAPI: Pick<ElectronAPI, 'onToastShow'> = {
    onToastShow: createSubscription<ToastPayload>(IPC_CHANNELS.TOAST_SHOW),
};
