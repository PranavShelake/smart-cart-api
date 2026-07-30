// src/store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";

import authReducer from "./slices/authSlice";
import toastReducer from "./slices/toastSlice";
import productsReducer  from './slices/productsSlice'
import categoriesReducer from './slices/categoriesSlice'
import cartReducer   from './slices/cartSlice'   
import ordersReducer from './slices/ordersSlice'
import paymentsReducer from './slices/paymentsSlice'
import reviewsReducer from './slices/reviewsSlice.ts'
import returnsReducer from './slices/returnsSlice' 

export const store = configureStore({
  reducer: {
    auth: authReducer,
    toast: toastReducer,
    products:   productsReducer,
    categories: categoriesReducer,
    cart:       cartReducer,
    orders:     ordersReducer, 
    payments:   paymentsReducer,
    reviews:    reviewsReducer,   // ← ADD
    returns:    returnsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;