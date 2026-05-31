import { configureStore } from "@reduxjs/toolkit";

import { authReducer } from "@/features/auth/auth-slice";
import { playerReducer } from "@/features/player/player-slice";
import { socialAuthReducer } from "@/features/social/social-auth-slice";
import { micboxxApi } from "@micboxx/api";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [micboxxApi.reducerPath]: micboxxApi.reducer,
    player: playerReducer,
    socialAuth: socialAuthReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(micboxxApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
