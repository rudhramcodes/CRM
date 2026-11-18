import toast from 'react-hot-toast';

export const showToast = {
  success: (message, duration = 3000) => {
    toast.remove();
    const id = toast.success(message, { duration });
    setTimeout(() => {
      toast.remove(id);
    }, duration + 500);
    return id;
  },
  error: (message, duration = 4000) => {
    toast.remove();
    const id = toast.error(message, { duration });
    setTimeout(() => {
      toast.remove(id);
    }, duration + 500);
    return id;
  },
  info: (message, duration = 3000) => {
    toast.remove();
    const id = toast(message, { duration });
    setTimeout(() => {
      toast.remove(id);
    }, duration + 500);
    return id;
  },
};

export default showToast;
