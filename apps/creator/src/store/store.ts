import { configureStore } from "@reduxjs/toolkit";

import { authReducer } from "@/features/auth/auth-slice";
import { playerReducer } from "@/features/player/player-slice";
import { socialAuthReducer } from "@/features/social/social-auth-slice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    player: playerReducer,
    socialAuth: socialAuthReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
