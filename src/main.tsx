import React from 'react';
import { createRoot } from 'react-dom/client';
import TimerApp from './timer-app';
const match=location.pathname.match(/^\/(admin|view)\/([a-f0-9-]{36})\/?$/);
createRoot(document.getElementById('root')!).render(<TimerApp mode={match?match[1] as 'admin'|'view':'create'} id={match?.[2]}/>);
