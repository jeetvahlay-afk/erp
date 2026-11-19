const EVENT_NAME = 'teamhub:feedback';

const dispatch = (detail) => window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));

export const feedback = {
  success: (message) => dispatch({ type: 'toast', tone: 'success', message }),
  error: (message) => dispatch({ type: 'toast', tone: 'error', message }),
  info: (message) => dispatch({ type: 'toast', tone: 'info', message }),
  notification: (notification, onClick) => dispatch({ ...notification, type: 'notification', onClick }),
  confirm: (message, options = {}) => new Promise((resolve) => {
    dispatch({
      type: 'confirm',
      message,
      title: options.title || 'Confirm action',
      confirmLabel: options.confirmLabel || 'Confirm',
      tone: options.tone || 'danger',
      resolve,
    });
  }),
};

export const FEEDBACK_EVENT = EVENT_NAME;
