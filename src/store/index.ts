import { configureStore } from '@reduxjs/toolkit'
import machineReducer from './slices/machineSlice'

export const store = configureStore({
  reducer: {
    machines: machineReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
