import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { api } from '@/services/api'
import type {
  BillingSubscription,
  BillingPlan,
  PaymentMethod,
  BillingDemoInfo,
  Invoice,
  UsageMetrics,
} from '@/types/api'

export type CheckoutStatus = 'idle' | 'redirecting' | 'success' | 'canceled' | 'failed'

interface PaymentState {
  // Data
  subscription: BillingSubscription | BillingDemoInfo | null
  plans: BillingPlan[]
  paymentMethods: PaymentMethod[]
  invoices: Invoice[]
  usage: UsageMetrics | null

  // UI State
  loading: boolean
  error: string | null
  lastFetchTimestamp: number

  // Checkout State
  checkoutStatus: CheckoutStatus

  // Webhook Polling
  webhookPollingActive: boolean
  webhookPollCount: number
}

const initialState: PaymentState = {
  subscription: null,
  plans: [],
  paymentMethods: [],
  invoices: [],
  usage: null,
  loading: false,
  error: null,
  lastFetchTimestamp: 0,
  checkoutStatus: 'idle',
  webhookPollingActive: false,
  webhookPollCount: 0,
}

// Async thunks
export const fetchBillingData = createAsyncThunk(
  'payment/fetchBillingData',
  async (_, { rejectWithValue }) => {
    try {
      const [subscriptionData, plansData, paymentMethodsData] = await Promise.all([
        api.getCurrentSubscription(),
        api.getBillingPlans(),
        api.getPaymentMethods().catch(() => []), // Payment methods may fail gracefully
      ])

      return {
        subscription: subscriptionData,
        plans: plansData,
        paymentMethods: paymentMethodsData,
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch billing data')
    }
  }
)

export const createCheckoutSession = createAsyncThunk(
  'payment/createCheckoutSession',
  async (
    args: {
      planId: string
      successUrl: string
      cancelUrl: string
      idempotencyKey?: string
      metadata?: Record<string, string>
    },
    { rejectWithValue }
  ) => {
    try {
      const session = await api.createCheckoutSession({
        planId: args.planId,
        successUrl: args.successUrl,
        cancelUrl: args.cancelUrl,
      })

      return session
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create checkout session')
    }
  }
)

export const createPortalSession = createAsyncThunk(
  'payment/createPortalSession',
  async (args: { returnUrl: string }, { rejectWithValue }) => {
    try {
      const session = await api.createPortalSession({
        returnUrl: args.returnUrl,
      })

      return session
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create portal session')
    }
  }
)

export const cancelSubscription = createAsyncThunk(
  'payment/cancelSubscription',
  async (subscriptionId: string, { rejectWithValue }) => {
    try {
      await api.cancelBillingSubscription(subscriptionId)
      return { subscriptionId }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to cancel subscription')
    }
  }
)

export const fetchInvoices = createAsyncThunk(
  'payment/fetchInvoices',
  async (_, { rejectWithValue }) => {
    try {
      // This endpoint might not exist yet in the backend
      // We'll add it to the API client later
      const invoices = await api.getInvoices?.() ?? []
      return invoices
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch invoices')
    }
  }
)

export const fetchUsage = createAsyncThunk(
  'payment/fetchUsage',
  async (_, { rejectWithValue }) => {
    try {
      // This endpoint might not exist yet in the backend
      // We'll add it to the API client later
      const usage = await api.getUsage?.() ?? null
      return usage
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch usage')
    }
  }
)

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setCheckoutStatus: (state, action: PayloadAction<CheckoutStatus>) => {
      state.checkoutStatus = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    startWebhookPolling: (state) => {
      state.webhookPollingActive = true
      state.webhookPollCount = 0
    },
    stopWebhookPolling: (state) => {
      state.webhookPollingActive = false
      state.webhookPollCount = 0
    },
    incrementWebhookPollCount: (state) => {
      state.webhookPollCount += 1
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchBillingData
      .addCase(fetchBillingData.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchBillingData.fulfilled, (state, action) => {
        state.loading = false
        state.subscription = action.payload.subscription
        state.plans = action.payload.plans
        state.paymentMethods = action.payload.paymentMethods
        state.lastFetchTimestamp = Date.now()
      })
      .addCase(fetchBillingData.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

      // createCheckoutSession
      .addCase(createCheckoutSession.pending, (state) => {
        state.checkoutStatus = 'redirecting'
        state.error = null
      })
      .addCase(createCheckoutSession.fulfilled, (state) => {
        state.checkoutStatus = 'redirecting'
      })
      .addCase(createCheckoutSession.rejected, (state, action) => {
        state.checkoutStatus = 'failed'
        state.error = action.payload as string
      })

      // createPortalSession
      .addCase(createPortalSession.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createPortalSession.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(createPortalSession.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

      // cancelSubscription
      .addCase(cancelSubscription.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(cancelSubscription.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

      // fetchInvoices
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false
        state.invoices = action.payload
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

      // fetchUsage
      .addCase(fetchUsage.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUsage.fulfilled, (state, action) => {
        state.loading = false
        state.usage = action.payload
      })
      .addCase(fetchUsage.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const {
  setCheckoutStatus,
  clearError,
  startWebhookPolling,
  stopWebhookPolling,
  incrementWebhookPollCount,
} = paymentSlice.actions

export default paymentSlice.reducer
