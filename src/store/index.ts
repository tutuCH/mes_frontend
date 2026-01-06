import { configureStore } from '@reduxjs/toolkit'
import machineReducer from './slices/machineSlice'
import factoryReducer from './slices/factorySlice'
import userReducer from './slices/userSlice'

export const store = configureStore({
  reducer: {
    machines: machineReducer,
    factories: factoryReducer,
    users: userReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
