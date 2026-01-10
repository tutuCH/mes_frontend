import { configureStore } from '@reduxjs/toolkit'
import machineReducer from './slices/machineSlice'
import factoryReducer from './slices/factorySlice'
import userReducer from './slices/userSlice'
import alarmReducer from './slices/alarmSlice'
import paymentReducer from './slices/paymentSlice'

export const store = configureStore({
  reducer: {
    machines: machineReducer,
    factories: factoryReducer,
    users: userReducer,
    alarms: alarmReducer,
    payment: paymentReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
