import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import store from './app/store/store';
import router from './routes';

export default function App() {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '0.5rem',
            background: '#0b0b0b',
            color: '#fafafa',
            fontSize: '0.875rem',
            fontFamily: 'Manrope, system-ui, sans-serif',
          },
        }}
      />
    </Provider>
  );
}
