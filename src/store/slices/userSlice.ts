import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { api } from '@/services/api'
import type { User, CreateUserRequest, UpdateUserRequest } from '@/types/api'

interface UsersState {
  users: User[]
  selectedUser: User | null
  loading: boolean
  error: string | null
}

const initialState: UsersState = {
  users: [],
  selectedUser: null,
  loading: false,
  error: null,
}

export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async () => {
    return await api.getUsers()
  }
)

export const fetchUser = createAsyncThunk(
  'users/fetchUser',
  async (email: string) => {
    return await api.getUser(email)
  }
)

export const createUser = createAsyncThunk(
  'users/createUser',
  async (data: CreateUserRequest) => {
    return await api.createUser(data)
  }
)

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ email, data }: { email: string; data: UpdateUserRequest }) => {
    return await api.updateUser(email, data)
  }
)

export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (email: string) => {
    await api.deleteUser(email)
    return email
  }
)

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setSelectedUser: (state, action: PayloadAction<User | null>) => {
      state.selectedUser = action.payload
    },
    clearUserError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false
        state.users = action.payload
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch users'
      })
      // Fetch Single User
      .addCase(fetchUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false
        state.selectedUser = action.payload
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch user'
      })
      // Create User
      .addCase(createUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false
        state.users.push(action.payload)
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to create user'
      })
      // Update User
      .addCase(updateUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false
        const index = state.users.findIndex(u => u.email === action.payload.email)
        if (index !== -1) {
          state.users[index] = action.payload
        }
        if (state.selectedUser?.email === action.payload.email) {
          state.selectedUser = action.payload
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to update user'
      })
      // Delete User
      .addCase(deleteUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false
        state.users = state.users.filter(u => u.email !== action.payload)
        if (state.selectedUser?.email === action.payload) {
          state.selectedUser = null
        }
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to delete user'
      })
  },
})

export const { setSelectedUser, clearUserError } = userSlice.actions
export default userSlice.reducer
