import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { CookiesProvider } from 'react-cookie';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <GoogleReCaptchaProvider reCaptchaKey="6LdQWZksAAAAAFzZmPqqS8QQBgI8CraS_9m2H66T">
  <CookiesProvider>
  <BrowserRouter>
    <App />
  </BrowserRouter>
  </CookiesProvider>
  </GoogleReCaptchaProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
